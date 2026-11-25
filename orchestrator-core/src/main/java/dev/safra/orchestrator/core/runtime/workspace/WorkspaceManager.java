package dev.safra.orchestrator.core.runtime.workspace;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.runtime.discovery.java.PortExtractor;
import dev.safra.orchestrator.core.runtime.discovery.java.ProjectScanner;
import dev.safra.orchestrator.core.runtime.discovery.js.JsProjectScanner;
import dev.safra.orchestrator.core.runtime.discovery.js.StandaloneJsScanner;
import dev.safra.orchestrator.core.runtime.discovery.php.PhpLaunchCommands;
import dev.safra.orchestrator.core.runtime.discovery.php.PhpProjectScanner;
import dev.safra.orchestrator.core.runtime.discovery.php.StandalonePhpScanner;
import dev.safra.orchestrator.core.runtime.service.ServiceViewMapper;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.model.ServiceRuntime;
import dev.safra.orchestrator.model.ServiceView;
import dev.safra.orchestrator.model.Workspace;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;

public class WorkspaceManager {
  private final Path stateDir;
  private final Path workspaceFile;
  private final Path runtimeFile;
  private final ObjectMapper om;
  private final StateStore store;
  private final WorkspaceProjectScan projectScan;
  private final WorkspaceMetadataRefresh metadataRefresh;
  private final WorkspaceLoader loader;
  private final BiConsumer<String, JsonNode> emitEvent;

  private Workspace workspace;
  private final Map<String, ServiceDescriptor> services;

  public WorkspaceManager(Path stateDir, ObjectMapper om, StateStore store,
      PortExtractor portExtractor, BiConsumer<String, JsonNode> emitEvent,
      Map<String, ServiceDescriptor> services) {
    this.stateDir = stateDir;
    this.om = om;
    this.store = store;
    this.emitEvent = emitEvent;
    this.services = services;
    this.workspaceFile = stateDir.resolve("workspace.json");
    this.runtimeFile = stateDir.resolve("runtime.json");
    Path logsDir = stateDir.resolve("logs");
    JsProjectScanner jsScanner = new JsProjectScanner(om, logsDir);
    PhpProjectScanner phpScanner = new PhpProjectScanner(om, logsDir);
    this.projectScan = new WorkspaceProjectScan(
        new ProjectScanner(store, portExtractor, logsDir),
        jsScanner,
        new StandaloneJsScanner(logsDir),
        phpScanner,
        new StandalonePhpScanner(logsDir));
    this.metadataRefresh = new WorkspaceMetadataRefresh(jsScanner, phpScanner, portExtractor);
    this.loader = new WorkspaceLoader(stateDir, workspaceFile, runtimeFile, store);
  }

  public Workspace getWorkspace() {
    return workspace;
  }

  public void loadAll() {
    this.workspace = loader.load(services);
    WorkspaceOrder.syncServices(workspace);
    WorkspaceOrder.syncContainers(workspace);
    persistRuntime();
    persistWorkspace();
  }

  public JsonNode importRootAndScan(String root) {
    if (root == null || root.isBlank()) {
      throw new IllegalArgumentException("params.root é obrigatório");
    }
    return importRootsAndScan(List.of(root), null);
  }

  public JsonNode importRootsAndScan(List<String> roots) {
    return importRootsAndScan(roots, null);
  }

  public JsonNode importRootsAndScan(List<String> roots, String containerId) {
    if (roots == null || roots.isEmpty()) {
      throw new IllegalArgumentException("params.roots é obrigatório");
    }
    if (containerId != null && !containerId.isBlank() && !workspace.getContainers().containsKey(containerId)) {
      throw new IllegalArgumentException("Container não encontrado: " + containerId);
    }

    List<Path> importedPaths = new ArrayList<>();
    List<ServiceDefinition> found = new ArrayList<>();
    for (String root : roots) {
      Path p = Path.of(root).toAbsolutePath().normalize();
      importedPaths.add(p);
      found.addAll(projectScan.scan(p, workspace.getExcludeDirs()));
    }

    Set<String> existingNames = new HashSet<>();
    for (ServiceDefinition s : workspace.getServices()) {
      existingNames.add(s.getName());
    }

    int added = 0;
    for (ServiceDefinition def : found) {
      if (existingNames.contains(def.getName())) {
        continue;
      }
      if (def.getProjectType() == null) {
        continue;
      }
      if (!ImportPathMatcher.isUnderImported(def.getPath(), importedPaths)) {
        continue;
      }
      workspace.getServices().add(def);
      existingNames.add(def.getName());
      added++;
    }

    int assigned = ImportPathMatcher.assignContainer(workspace.getServices(), importedPaths, containerId);

    if (added > 0 || assigned > 0) {
      WorkspaceOrder.syncServices(workspace);
      persistWorkspace();
    }

    loadAll();
    emitEvent.accept("workspace", om.valueToTree(workspace));
    return buildSortedServiceList();
  }

  public JsonNode removeRoot(String root) {
    if (root == null || root.isBlank()) {
      throw new IllegalArgumentException("params.root é obrigatório");
    }
    workspace.getRoots().removeIf(r -> r.equals(root));
    persistWorkspace();
    return scanRoots();
  }

  public JsonNode setExcludeDirs(List<String> excludeDirs) {
    workspace.setExcludeDirs(excludeDirs);
    persistWorkspace();
    return om.valueToTree(workspace);
  }

  public JsonNode scanRoots() {
    Map<String, List<String>> savedContainerIds = new HashMap<>();
    Map<String, ServiceDefinition> previousByName = new HashMap<>();
    for (ServiceDefinition def : workspace.getServices()) {
      if (def.getContainerIds() != null && !def.getContainerIds().isEmpty()) {
        savedContainerIds.put(def.getName(), new ArrayList<>(def.getContainerIds()));
      }
      previousByName.put(def.getName(), def);
    }

    List<ServiceDefinition> found = new ArrayList<>();
    for (String r : workspace.getRoots()) {
      found.addAll(projectScan.scan(Path.of(r), workspace.getExcludeDirs()));
    }

    Map<String, ServiceDefinition> byName = new HashMap<>();
    for (ServiceDefinition d : found) {
      if (!workspace.getRemovedServices().contains(d.getName())) {
        byName.put(d.getName(), d);
      }
    }

    for (Map.Entry<String, List<String>> entry : savedContainerIds.entrySet()) {
      ServiceDefinition def = byName.get(entry.getKey());
      if (def != null) {
        List<String> valid = entry.getValue().stream().filter(id -> workspace.getContainers().containsKey(id)).toList();
        def.setContainerIds(new ArrayList<>(valid));
      }
    }

    WorkspaceDefinitionSync.mergeScannedWithPrevious(byName, previousByName);

    workspace.setServices(new ArrayList<>(byName.values()));
    WorkspaceOrder.syncServices(workspace);
    WorkspaceOrder.syncContainers(workspace);
    persistWorkspace();
    loadAll();
    emitEvent.accept("workspace", om.valueToTree(workspace));

    return buildSortedServiceList();
  }

  public JsonNode rebuildServices() {
    Map<String, List<String>> savedContainerIds = new HashMap<>();
    for (ServiceDefinition def : workspace.getServices()) {
      if (def.getContainerIds() != null && !def.getContainerIds().isEmpty()) {
        savedContainerIds.put(def.getName(), new ArrayList<>(def.getContainerIds()));
      }
      def.setJavaHome(null);
    }
    services.clear();
    Map<String, ServiceRuntime> empty = new HashMap<>();
    store.writeJson(runtimeFile, empty);
    persistWorkspace();
    loadAll();
    for (Map.Entry<String, List<String>> entry : savedContainerIds.entrySet()) {
      ServiceDescriptor sd = services.get(entry.getKey());
      if (sd == null) {
        continue;
      }
      List<String> valid = entry.getValue().stream()
          .filter(id -> workspace.getContainers().containsKey(id))
          .toList();
      sd.getDefinition().setContainerIds(new ArrayList<>(valid));
    }
    refreshDynamicProjectMetadata();
    persistWorkspace();
    emitEvent.accept("workspace", om.valueToTree(workspace));
    return buildSortedServiceList();
  }

  public void refreshDynamicProjectMetadata() {
    boolean changed = false;
    for (ServiceDescriptor descriptor : services.values()) {
      changed |= refreshDynamicProjectMetadata(descriptor.getDefinition());
    }
    if (changed) {
      persistWorkspace();
    }
  }

  public boolean refreshDynamicProjectMetadata(ServiceDefinition def) {
    return metadataRefresh.refresh(def);
  }

  public boolean refreshDynamicJsMetadata(ServiceDefinition def) {
    if (def == null || def.getProjectType() == null || def.getProjectType() == ProjectType.SPRING_BOOT
        || PhpLaunchCommands.isPhpProject(def.getProjectType())) {
      return false;
    }
    return metadataRefresh.refresh(def);
  }

  public boolean refreshDynamicPhpMetadata(ServiceDefinition def) {
    if (def == null || !PhpLaunchCommands.isPhpProject(def.getProjectType())) {
      return false;
    }
    return metadataRefresh.refresh(def);
  }

  public JsonNode refreshDeclaredPorts(String containerId) {
    metadataRefresh.refreshScope(services.values(), containerId, this::persistWorkspace);
    return buildSortedServiceList();
  }

  public Path preparePortFile(ServiceDefinition def) {
    return metadataRefresh.preparePortFile(def, this::persistWorkspace);
  }

  private JsonNode buildSortedServiceList() {
    return om.valueToTree(sortedViews(services.values().stream().map(ServiceViewMapper::fromDescriptor).toList()));
  }

  public JsonNode reorderServices(List<String> order) {
    workspace.setServiceOrder(order != null ? new ArrayList<>(order) : new ArrayList<>());
    persistWorkspace();
    return om.valueToTree(workspace);
  }

  public JsonNode reorderContainers(List<String> order) {
    workspace.setContainerOrder(order != null ? new ArrayList<>(order) : new ArrayList<>());
    persistWorkspace();
    return om.valueToTree(workspace);
  }

  public void syncServiceOrder() {
    WorkspaceOrder.syncServices(workspace);
  }

  public void syncContainerOrder() {
    WorkspaceOrder.syncContainers(workspace);
  }

  List<ServiceView> sortedViews(List<ServiceView> views) {
    return ServiceViewMapper.sortByOrder(views, workspace.getServiceOrder());
  }

  public void persistWorkspace() {
    store.writeJson(workspaceFile, workspace);
  }

  public void persistRuntime() {
    Map<String, ServiceRuntime> m = new HashMap<>();
    for (ServiceDescriptor sd : services.values()) {
      m.put(sd.getDefinition().getName(), sd.getRuntime());
    }
    store.writeJson(runtimeFile, m);
  }
}
