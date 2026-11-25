package dev.safra.orchestrator.core.runtime.discovery;

import dev.safra.orchestrator.core.runtime.discovery.php.PhpLaunchCommands;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

public final class DeclaredPortFiles {
  private static final List<String> SPRING_FILES = List.of(
      "src/main/resources/application.properties",
      "src/main/resources/application.yml",
      "src/main/resources/application.yaml",
      "src/main/resources/application-local.properties",
      "src/main/resources/application-local.yml",
      "src/main/resources/application-local.yaml",
      "application.properties",
      "application.yml",
      "application.yaml",
      "application-local.properties",
      "application-local.yml",
      "application-local.yaml");

  private static final List<String> JS_FILES = List.of(
      "vite.config.ts",
      "vite.config.js",
      "vite.config.mts",
      "vite.config.mjs",
      "vite.config.cts",
      "vite.config.cjs",
      ".env",
      "package.json");

  private static final List<String> PHP_FILES = List.of(
      ".env",
      "compose.yaml",
      "compose.yml",
      "docker-compose.yaml",
      "docker-compose.yml");

  private DeclaredPortFiles() {
  }

  public static List<String> springConfigFiles() {
    return SPRING_FILES;
  }

  public static Path require(ServiceDefinition def) {
    Path file = preferred(def);

    if (file == null || !Files.isRegularFile(file)) {
      throw new IllegalStateException("Nenhum arquivo de porta encontrado neste projeto.");
    }

    return file;
  }

  public static Path preferred(ServiceDefinition def) {
    if (def == null || def.getPath() == null || def.getPath().isBlank()) {
      return null;
    }

    Path declared = existingFile(def.getPortFile());

    if (declared != null) {
      return declared;
    }

    return firstExisting(Path.of(def.getPath()), candidates(def.getProjectType()));
  }

  private static List<String> candidates(ProjectType type) {
    if (type == null || type == ProjectType.SPRING_BOOT) {
      return SPRING_FILES;
    }

    if (PhpLaunchCommands.isPhpProject(type)) {
      return PHP_FILES;
    }

    return JS_FILES;
  }

  private static Path firstExisting(Path dir, List<String> relativePaths) {
    for (String relative : relativePaths) {
      Path candidate = dir.resolve(relative);

      if (Files.isRegularFile(candidate)) {
        return candidate.toAbsolutePath().normalize();
      }
    }

    return null;
  }

  private static Path existingFile(String path) {
    if (path == null || path.isBlank()) {
      return null;
    }

    Path file = Path.of(path);

    if (!Files.isRegularFile(file)) {
      return null;
    }

    return file.toAbsolutePath().normalize();
  }
}
