package dev.safra.orchestrator.core.runtime.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import dev.safra.orchestrator.core.Json;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.model.ServiceRuntime;
import dev.safra.orchestrator.model.ServiceStatus;
import dev.safra.orchestrator.model.Workspace;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class WorkspaceLoaderTest {

  @TempDir
  Path tempDir;

  @Test
  void skipsBlankNamesDefaultsTypeAndEmptyContainerIds() {
    ServiceDefinition api = named("api");
    api.setProjectType(null);
    api.setContainerIds(null);

    Workspace workspace = new Workspace();
    workspace.setServices(new ArrayList<>(List.of(
        named("  "),
        named(null),
        named(""),
        api)));

    Map<String, ServiceDescriptor> services = load(workspace, Map.of());

    assertEquals(1, services.size());
    ServiceDefinition loaded = services.get("api").getDefinition();
    assertEquals(ProjectType.SPRING_BOOT, loaded.getProjectType());
    assertEquals(List.of(), loaded.getContainerIds());
  }

  @Test
  void nullCollectionsLoadAsEmpty() {
    Workspace workspace = new Workspace();
    workspace.setRoots(null);
    workspace.setExcludeDirs(null);
    workspace.setServices(null);
    workspace.setContainers(null);
    workspace.setRemovedServices(null);
    workspace.setServiceOrder(null);
    workspace.setContainerOrder(null);

    Map<String, ServiceDescriptor> services = load(workspace, Map.of());

    assertEquals(0, services.size());
  }

  @Test
  void deadPidBecomesStoppedAndCleared() {
    ServiceDefinition api = named("api");
    api.setProjectType(ProjectType.SPRING_BOOT);
    api.setContainerIds(new ArrayList<>());

    Workspace workspace = new Workspace();
    workspace.setServices(List.of(api));

    ServiceRuntime runtime = new ServiceRuntime();
    runtime.setPid(2_147_483_647L);
    runtime.setStatus(ServiceStatus.RUNNING);

    Map<String, ServiceDescriptor> services = load(workspace, Map.of("api", runtime));
    ServiceRuntime loaded = services.get("api").getRuntime();

    assertEquals(ServiceStatus.STOPPED, loaded.getStatus());
    assertNull(loaded.getPid());
  }

  private Map<String, ServiceDescriptor> load(Workspace workspace, Map<String, ServiceRuntime> runtime) {
    StateStore store = new StateStore(Json.mapper());
    Path workspaceFile = tempDir.resolve("workspace.json");
    Path runtimeFile = tempDir.resolve("runtime.json");
    store.writeJson(workspaceFile, workspace);
    store.writeJson(runtimeFile, runtime);
    Map<String, ServiceDescriptor> services = new HashMap<>();
    new WorkspaceLoader(tempDir, workspaceFile, runtimeFile, store).load(services);
    return services;
  }

  private static ServiceDefinition named(String name) {
    ServiceDefinition def = new ServiceDefinition();
    def.setName(name);
    def.setPath("/tmp/api");
    return def;
  }
}
