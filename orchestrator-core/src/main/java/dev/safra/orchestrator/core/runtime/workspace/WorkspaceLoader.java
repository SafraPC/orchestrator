package dev.safra.orchestrator.core.runtime.workspace;

import com.fasterxml.jackson.core.type.TypeReference;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.model.ServiceRuntime;
import dev.safra.orchestrator.model.ServiceStatus;
import dev.safra.orchestrator.model.Workspace;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

final class WorkspaceLoader {
  private final Path stateDir;
  private final Path workspaceFile;
  private final Path runtimeFile;
  private final StateStore store;

  WorkspaceLoader(Path stateDir, Path workspaceFile, Path runtimeFile, StateStore store) {
    this.stateDir = stateDir;
    this.workspaceFile = workspaceFile;
    this.runtimeFile = runtimeFile;
    this.store = store;
  }

  Workspace load(Map<String, ServiceDescriptor> services) {
    try {
      Files.createDirectories(stateDir);
      Files.createDirectories(stateDir.resolve("logs"));
    } catch (Exception e) {
      throw new IllegalStateException("Não consegui criar stateDir: " + stateDir, e);
    }

    Workspace workspace = store.readJson(workspaceFile, Workspace.class).orElseGet(Workspace::new);
    normalize(workspace);

    Map<String, ServiceRuntime> runtime = store.readJson(runtimeFile, new TypeReference<Map<String, ServiceRuntime>>() {
    }).orElseGet(HashMap::new);
    Map<String, ServiceDescriptor> existing = new HashMap<>(services);
    services.clear();

    for (ServiceDefinition def : workspace.getServices()) {
      if (def.getName() == null || def.getName().isBlank()) {
        continue;
      }
      if (def.getProjectType() == null) {
        def.setProjectType(ProjectType.SPRING_BOOT);
      }
      if (def.getContainerIds() == null) {
        def.setContainerIds(new ArrayList<>());
      }
      ServiceDescriptor sd = new ServiceDescriptor();
      sd.setDefinition(def);
      ServiceRuntime rt = existing.containsKey(def.getName())
          ? existing.get(def.getName()).getRuntime()
          : runtime.getOrDefault(def.getName(), new ServiceRuntime());
      if (rt.getPid() != null) {
        boolean alive = ProcessHandle.of(rt.getPid()).map(ProcessHandle::isAlive).orElse(false);
        rt.setStatus(alive ? ServiceStatus.RUNNING : ServiceStatus.STOPPED);
        if (!alive) {
          rt.setPid(null);
        }
      }
      sd.setRuntime(rt);
      services.put(def.getName(), sd);
    }
    return workspace;
  }

  private static void normalize(Workspace workspace) {
    if (workspace.getRoots() == null) {
      workspace.setRoots(new ArrayList<>());
    }

    if (workspace.getExcludeDirs() == null) {
      workspace.setExcludeDirs(new ArrayList<>());
    }

    if (workspace.getServices() == null) {
      workspace.setServices(new ArrayList<>());
    }

    if (workspace.getContainers() == null) {
      workspace.setContainers(new HashMap<>());
    }

    if (workspace.getRemovedServices() == null) {
      workspace.setRemovedServices(new HashSet<>());
    }

    if (workspace.getServiceOrder() == null) {
      workspace.setServiceOrder(new ArrayList<>());
    }

    if (workspace.getContainerOrder() == null) {
      workspace.setContainerOrder(new ArrayList<>());
    }
  }
}
