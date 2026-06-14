package dev.safra.orchestrator.core.runtime;

import java.nio.file.Path;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BiConsumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.safra.orchestrator.core.ipc.IpcEventEmitter;
import dev.safra.orchestrator.core.ipc.IpcParams;
import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.process.JavaVersionDetector;
import dev.safra.orchestrator.process.PortProcessKiller;
import dev.safra.orchestrator.process.ProcessManager;

public class CoreRuntime {
  private final ObjectMapper om;
  private final BiConsumer<String, JsonNode> emitEvent;
  private final AtomicBoolean shutdown = new AtomicBoolean(false);
  private final Map<String, ServiceDescriptor> services = new ConcurrentHashMap<>();

  private final WorkspaceManager workspaceManager;
  private final ServiceManager serviceManager;
  private final ServiceConfigurator serviceConfigurator;
  private final ContainerManager containerManager;
  private final LogManager logManager;
  private final ExternalToolLauncher launcher;
  private final ProcessManager processManager;
  private final GitBranchResolver gitBranchResolver;

  public CoreRuntime(Path stateDir, ObjectMapper om, IpcEventEmitter eventEmitter) {
    this.om = om;
    this.emitEvent = (ev, payload) -> eventEmitter.emit(om, ev, payload);

    StateStore store = new StateStore(om);
    PortExtractor portExtractor = new PortExtractor(store);
    this.processManager = new ProcessManager(Duration.ofSeconds(8), Duration.ofSeconds(3));

    this.logManager = new LogManager(om, emitEvent, shutdown);
    this.workspaceManager = new WorkspaceManager(stateDir, om, store, portExtractor, emitEvent, services);
    this.launcher = new ExternalToolLauncher();
    this.gitBranchResolver = new GitBranchResolver();

    LogFileWriter.initialize(stateDir);
    workspaceManager.loadAll();

    this.serviceManager = new ServiceManager(om, processManager, logManager, emitEvent, services,
        () -> workspaceManager.persistRuntime(), () -> workspaceManager.persistWorkspace(),
        () -> workspaceManager.getWorkspace());
    this.serviceConfigurator = new ServiceConfigurator(om, serviceManager, workspaceManager, processManager, emitEvent);
    this.containerManager = new ContainerManager(om, () -> workspaceManager.getWorkspace(),
        () -> workspaceManager.persistWorkspace());

    startProcessMonitor();
  }

  public JsonNode handle(String method, JsonNode params) {
    if (method == null || method.isBlank())
      throw new IllegalArgumentException("method é obrigatório");

    return switch (method) {
      case "ping" -> om.getNodeFactory().textNode("pong");
      case "getWorkspace" -> om.valueToTree(workspaceManager.getWorkspace());
      case "setExcludeDirs" -> workspaceManager.setExcludeDirs(IpcParams.stringList(params, "excludeDirs"));
      case "importRootAndScan" -> workspaceManager.importRootAndScan(IpcParams.text(params, "root"));
      case "importRootsAndScan" -> workspaceManager.importRootsAndScan(IpcParams.stringList(params, "roots"));
      case "removeRoot" -> workspaceManager.removeRoot(IpcParams.text(params, "root"));
      case "scanRoots" -> workspaceManager.scanRoots();
      case "listServices" -> {
        workspaceManager.refreshDynamicJsMetadata();
        yield serviceManager.list();
      }
      case "listServiceBranches" -> om.valueToTree(gitBranchResolver.list(services));
      case "startService" -> serviceManager.start(IpcParams.reqName(params));
      case "stopService" -> serviceManager.stop(IpcParams.reqName(params));
      case "restartService" -> serviceManager.restart(IpcParams.reqName(params));
      case "startAll" -> serviceManager.startAll();
      case "stopAll" -> serviceManager.stopAll();
      case "removeService" -> serviceManager.remove(IpcParams.reqName(params));
      case "reorderServices" -> workspaceManager.reorderServices(IpcParams.stringList(params, "order"));
      case "reorderContainers" -> workspaceManager.reorderContainers(IpcParams.stringList(params, "order"));
      case "subscribeLogs" -> {
        String name = IpcParams.reqName(params);
        int tail = IpcParams.intOr(params, "tail", 200);
        ServiceDescriptor sd = serviceManager.requireService(name);
        yield logManager.subscribe(name, sd.getDefinition().getLogFile(), tail);
      }
      case "unsubscribeLogs" -> logManager.unsubscribe(IpcParams.reqSubId(params));
      case "createContainer" -> containerManager.create(
          IpcParams.text(params, "name"),
          IpcParams.textOr(params, "description", ""));
      case "updateContainer" -> containerManager.update(
          IpcParams.text(params, "id"),
          IpcParams.text(params, "name"),
          IpcParams.text(params, "description"));
      case "deleteContainer" -> {
        JsonNode result = containerManager.delete(IpcParams.text(params, "id"));
        emitEvent.accept("workspace", om.valueToTree(workspaceManager.getWorkspace()));
        yield result;
      }
      case "listContainers" -> containerManager.list();
      case "addServiceToContainer" -> {
        containerManager.addService(IpcParams.reqName(params), IpcParams.text(params, "containerId"));
        emitEvent.accept("workspace", om.valueToTree(workspaceManager.getWorkspace()));
        yield serviceManager.list();
      }
      case "removeServiceFromContainer" -> {
        containerManager.removeService(IpcParams.reqName(params), IpcParams.text(params, "containerId"));
        emitEvent.accept("workspace", om.valueToTree(workspaceManager.getWorkspace()));
        yield serviceManager.list();
      }
      case "getServicesByContainer" -> serviceManager.getByContainer(IpcParams.text(params, "containerId"));
      case "startContainer" -> serviceManager.startByContainer(IpcParams.text(params, "containerId"));
      case "stopContainer" -> serviceManager.stopByContainer(IpcParams.text(params, "containerId"));
      case "openServiceFolder" -> openServicePath(IpcParams.reqName(params), "Pasta aberta", launcher::openFolder);
      case "openServiceTerminal" -> openServicePath(IpcParams.reqName(params), "Terminal aberto", launcher::openTerminal);
      case "openServiceInEditor" -> openServicePath(IpcParams.reqName(params), "Editor aberto", launcher::openEditor);
      case "listJdks" -> {
        List<JavaVersionDetector.JdkInfo> jdks = processManager.getJavaDetector().detectAll();
        yield om.valueToTree(jdks);
      }
      case "getActiveJavaInfo" -> {
        var info = om.getNodeFactory().objectNode();
        info.put("javaHome", System.getProperty("java.home", ""));
        info.put("javaVersion", System.getProperty("java.version", ""));
        info.put("vendor", System.getProperty("java.vendor", ""));
        info.put("runtimeName", System.getProperty("java.runtime.name", ""));
        yield info;
      }
      case "setServiceScript" -> serviceConfigurator.setServiceScript(
          IpcParams.reqName(params), IpcParams.text(params, "script"));
      case "setServicePort" -> serviceConfigurator.setServicePort(IpcParams.reqName(params), IpcParams.reqPort(params));
      case "resetServicePort" -> serviceConfigurator.resetServicePort(IpcParams.reqName(params));
      case "setServiceJavaVersion" -> serviceConfigurator.setServiceJavaVersion(
          IpcParams.reqName(params), IpcParams.text(params, "javaVersion"));
      case "setServiceMvnWrapper" -> serviceConfigurator.setServiceMvnWrapper(
          IpcParams.reqName(params), IpcParams.bool(params, "enabled", false));
      case "rebuildServices" -> {
        serviceManager.stopAll();
        JsonNode result = workspaceManager.rebuildServices();
        emitEvent.accept("services", result);
        yield result;
      }
      case "checkPortFree" -> {
        int port = IpcParams.reqPort(params);
        yield om.getNodeFactory().objectNode().put("free", PortProcessKiller.isPortFree(port));
      }
      case "killPort" -> {
        int port = IpcParams.reqPort(params);
        boolean windows = System.getProperty("os.name").toLowerCase().contains("win");
        PortProcessKiller.killPort(port, windows);
        yield om.getNodeFactory().objectNode().put("ok", true).put("message", "Porta " + port + " liberada");
      }
      default -> throw new IllegalArgumentException("Método desconhecido: " + method);
    };
  }

  public void shutdown() {
    shutdown.set(true);
    logManager.shutdownAll();
    LogFileWriter.close();
  }

  private JsonNode openServicePath(String name, String message, java.util.function.Consumer<Path> action) {
    ServiceDescriptor sd = serviceManager.requireService(name);
    action.accept(Path.of(sd.getDefinition().getPath()).toAbsolutePath().normalize());
    return om.getNodeFactory().objectNode().put("ok", true).put("message", message);
  }

  private void startProcessMonitor() {
    Thread t = new Thread(() -> {
      while (!shutdown.get()) {
        try {
          Thread.sleep(5000);
          serviceManager.refreshStatuses();
          workspaceManager.persistRuntime();
        } catch (InterruptedException e) {
          Thread.currentThread().interrupt();
          break;
        } catch (Exception ignored) {
        }
      }
    }, "process-monitor");
    t.setDaemon(true);
    t.start();
  }
}
