package dev.safra.orchestrator.core.runtime;

import java.nio.file.Files;
import java.nio.file.Path;

import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;

public final class MavenWrapperDetector {
  private MavenWrapperDetector() {
  }

  public static boolean hasWrapper(ServiceDefinition def) {
    if (def == null || def.getPath() == null || def.getPath().isBlank()) return false;
    if (def.getProjectType() != null && def.getProjectType() != ProjectType.SPRING_BOOT) return false;
    Path dir;
    try {
      dir = Path.of(def.getPath());
    } catch (Exception ignored) {
      return false;
    }
    return Files.exists(dir.resolve("mvnw"))
        || Files.exists(dir.resolve("mvnw.cmd"))
        || Files.exists(dir.resolve("mvnw.bat"));
  }

  public static boolean usesWrapper(ServiceDefinition def) {
    if (def == null) return false;
    if (def.getUseMvnWrapper() != null) return def.getUseMvnWrapper() && hasWrapper(def);
    return commandStartsWithWrapper(def);
  }

  public static boolean commandStartsWithWrapper(ServiceDefinition def) {
    if (def == null || def.getCommand() == null || def.getCommand().isEmpty()) return false;
    String first = def.getCommand().get(0);
    return "./mvnw".equals(first) || "mvnw".equalsIgnoreCase(first);
  }
}
