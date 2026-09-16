package dev.safra.orchestrator.core.runtime.workspace;

import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public final class ImportPathMatcher {
  private ImportPathMatcher() {
  }

  public static boolean isUnderImported(String servicePath, List<Path> importedRoots) {
    if (servicePath == null || servicePath.isBlank() || importedRoots == null || importedRoots.isEmpty()) {
      return false;
    }
    Path normalized;
    try {
      normalized = Path.of(servicePath).toAbsolutePath().normalize();
    } catch (Exception e) {
      return false;
    }
    for (Path root : importedRoots) {
      if (root == null) {
        continue;
      }
      Path imported = root.toAbsolutePath().normalize();
      if (normalized.equals(imported) || normalized.startsWith(imported)) {
        return true;
      }
    }
    return false;
  }

  public static int assignContainer(List<ServiceDefinition> services, List<Path> importedRoots, String containerId) {
    if (containerId == null || containerId.isBlank() || services == null) {
      return 0;
    }
    int assigned = 0;
    for (ServiceDefinition def : services) {
      if (!isUnderImported(def.getPath(), importedRoots)) {
        continue;
      }
      if (def.getContainerIds() == null) {
        def.setContainerIds(new ArrayList<>());
      }
      if (!def.getContainerIds().contains(containerId)) {
        def.getContainerIds().add(containerId);
        assigned++;
      }
    }
    return assigned;
  }
}
