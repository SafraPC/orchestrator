package dev.safra.orchestrator.core.runtime;

import java.util.List;
import java.util.function.BiConsumer;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.model.ServiceStatus;
import dev.safra.orchestrator.process.PortProcessKiller;
import dev.safra.orchestrator.process.ProcessManager;

public class ServiceConfigurator {
  private final ObjectMapper om;
  private final ServiceManager serviceManager;
  private final WorkspaceManager workspaceManager;
  private final ProcessManager processManager;
  private final BiConsumer<String, JsonNode> emitEvent;

  public ServiceConfigurator(ObjectMapper om, ServiceManager serviceManager, WorkspaceManager workspaceManager,
      ProcessManager processManager, BiConsumer<String, JsonNode> emitEvent) {
    this.om = om;
    this.serviceManager = serviceManager;
    this.workspaceManager = workspaceManager;
    this.processManager = processManager;
    this.emitEvent = emitEvent;
  }

  public JsonNode setServiceScript(String name, String script) {
    ServiceDescriptor sd = serviceManager.requireService(name);
    ServiceDefinition def = sd.getDefinition();
    return finishConfigChange(sd, () -> {
      if (def.getAvailableScripts() != null && !def.getAvailableScripts().isEmpty()) {
        JsLaunchCommands.applySelection(def, script);
      }
      if (JsLaunchCommands.usesNpmRun(def.getProjectType())) {
        workspaceManager.refreshDynamicJsMetadata(def);
      }
    }, false);
  }

  public JsonNode setServicePort(String name, int port) {
    ServiceDescriptor sd = serviceManager.requireService(name);
    ServiceDefinition def = sd.getDefinition();
    if (def.getProjectType() == null || def.getProjectType() == ProjectType.SPRING_BOOT)
      throw new IllegalArgumentException("Troca de porta suportada apenas para projetos frontend");
    workspaceManager.refreshDynamicJsMetadata(def);
    if (!"CLI".equalsIgnoreCase(def.getPortStrategy()))
      throw new IllegalArgumentException("Este script não permite troca de porta com segurança.");
    return finishConfigChange(sd, () -> {
      Integer detectedPort = def.getDetectedPort();
      boolean usesCustomPort = detectedPort == null || detectedPort != port;
      if (usesCustomPort && !PortProcessKiller.isPortFree(port))
        throw new IllegalStateException("Porta " + port + " está em uso. Libere a porta antes de aplicar.");
      def.setCustomPort(usesCustomPort ? port : null);
      if (def.getProjectType() == ProjectType.STATIC_HTML && def.getSelectedScript() != null) {
        JsLaunchCommands.applySelection(def, def.getSelectedScript());
      }
    }, false);
  }

  public JsonNode resetServicePort(String name) {
    ServiceDescriptor sd = serviceManager.requireService(name);
    ServiceDefinition def = sd.getDefinition();
    if (def.getProjectType() == null || def.getProjectType() == ProjectType.SPRING_BOOT)
      throw new IllegalArgumentException("Reset de porta suportado apenas para projetos frontend");
    return finishConfigChange(sd, () -> def.setCustomPort(null), false);
  }

  public JsonNode setServiceJavaVersion(String name, String version) {
    ServiceDescriptor sd = serviceManager.requireService(name);
    return finishConfigChange(sd, () -> {
      sd.getDefinition().setJavaVersion(version);
      sd.getDefinition().setJavaHome(null);
      if (version != null && !version.isBlank()) {
        String resolved = processManager.getJavaDetector().resolveJavaHome(version);
        sd.getDefinition().setJavaHome(resolved);
      }
    }, true);
  }

  public JsonNode setServiceMvnWrapper(String name, boolean enabled) {
    ServiceDescriptor sd = serviceManager.requireService(name);
    ServiceDefinition def = sd.getDefinition();
    if (def.getProjectType() != null && def.getProjectType() != ProjectType.SPRING_BOOT)
      throw new IllegalArgumentException("Wrapper Maven aplicável apenas a projetos Spring Boot");
    if (enabled && !MavenWrapperDetector.hasWrapper(def))
      throw new IllegalStateException("Projeto não possui wrapper Maven (mvnw) na pasta.");
    return finishConfigChange(sd, () -> {
      def.setUseMvnWrapper(enabled);
      WorkspaceDefinitionSync.applyMvnWrapperPreference(def);
    }, false);
  }

  private JsonNode finishConfigChange(ServiceDescriptor sd, Runnable mutate, boolean persistRuntime) {
    String name = sd.getDefinition().getName();
    boolean wasRunning = sd.getRuntime().getStatus() == ServiceStatus.RUNNING;
    if (wasRunning)
      serviceManager.stop(name);
    mutate.run();
    workspaceManager.persistWorkspace();
    if (persistRuntime)
      workspaceManager.persistRuntime();
    if (wasRunning)
      serviceManager.start(name);
    emitEvent.accept("service", om.valueToTree(serviceManager.toView(sd)));
    return serviceManager.list();
  }
}
