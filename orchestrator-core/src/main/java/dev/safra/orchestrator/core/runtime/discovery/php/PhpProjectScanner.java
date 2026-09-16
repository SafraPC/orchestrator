package dev.safra.orchestrator.core.runtime.discovery.php;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.runtime.discovery.js.DevServerPortDetector;
import dev.safra.orchestrator.core.runtime.workspace.WorkspaceDefinitionSync;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class PhpProjectScanner {
  private static final Set<String> SKIP_DIRS = Set.of(
      ".git", "target", "node_modules", "vendor", ".idea", ".next", "dist", "build", ".turbo", ".cache");

  private final ObjectMapper om;
  private final Path logsDir;

  public PhpProjectScanner(ObjectMapper om, Path logsDir) {
    this.om = om;
    this.logsDir = logsDir;
  }

  public static boolean isPhpOwnedDirectory(Path dir) {
    if (!Files.isRegularFile(dir.resolve("composer.json"))) {
      return false;
    }
    if (Files.isRegularFile(dir.resolve("artisan"))) {
      return true;
    }
    if (Files.isRegularFile(dir.resolve("public/index.php"))) {
      return true;
    }
    if (Files.isRegularFile(dir.resolve("index.php"))) {
      return true;
    }
    if (Files.isRegularFile(dir.resolve("symfony.lock"))) {
      return true;
    }
    return false;
  }

  public static boolean isRuntimeComposerScriptName(String name) {
    return PhpComposerScripts.isRuntimeScriptName(name);
  }

  public List<ServiceDefinition> scanRoot(Path root, List<String> excludeDirs) {
    List<ServiceDefinition> out = new ArrayList<>();
    if (!Files.isDirectory(root)) {
      return out;
    }
    List<String> excluded = excludeDirs != null ? excludeDirs : List.of();
    Set<Path> foundProjectDirs = new HashSet<>();

    try {
      Files.walkFileTree(root, Set.of(), 6, new SimpleFileVisitor<>() {
        @Override
        public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
          String name = dir.getFileName() == null ? "" : dir.getFileName().toString();
          if (SKIP_DIRS.contains(name) || excluded.contains(name)) {
            return FileVisitResult.SKIP_SUBTREE;
          }
          for (Path p : foundProjectDirs) {
            if (dir.startsWith(p)) {
              return FileVisitResult.SKIP_SUBTREE;
            }
          }
          return FileVisitResult.CONTINUE;
        }

        @Override
        public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
          if (!file.getFileName().toString().equals("composer.json")) {
            return FileVisitResult.CONTINUE;
          }
          Path dir = file.getParent();
          if (dir == null) {
            return FileVisitResult.CONTINUE;
          }
          if (Files.exists(dir.resolve("pom.xml"))) {
            return FileVisitResult.CONTINUE;
          }
          ServiceDefinition def = parseComposerJson(dir);
          if (def != null) {
            out.add(def);
            foundProjectDirs.add(dir);
          }
          return FileVisitResult.CONTINUE;
        }
      });
    } catch (Exception e) {
      e.printStackTrace();
    }
    return out;
  }

  public void refreshServiceDefinition(ServiceDefinition def) {
    if (def == null || !PhpLaunchCommands.isPhpProject(def.getProjectType())
        || def.getProjectType() == ProjectType.STANDALONE_PHP) {
      return;
    }
    try {
      PhpMetadata metadata = readMetadata(Path.of(def.getPath()), def.getSelectedScript());
      if (metadata == null) {
        return;
      }
      def.setAvailableScripts(metadata.scripts());
      def.setDetectedPort(metadata.detectedPort());
      def.setPortStrategy(metadata.portStrategy());
      def.setPhpVersion(metadata.phpVersion());
      String selected = WorkspaceDefinitionSync.selectRuntimePhpScript(def.getSelectedScript(), metadata.scripts());
      if (selected != null) {
        PhpLaunchCommands.applySelection(def, selected);
      }
    } catch (Exception ignored) {
    }
  }

  private ServiceDefinition parseComposerJson(Path dir) {
    try {
      PhpMetadata metadata = readMetadata(dir, null);
      if (metadata == null) {
        return null;
      }
      String serviceName = dir.getFileName().toString();
      ServiceDefinition def = new ServiceDefinition();
      def.setName(serviceName);
      def.setPath(dir.toAbsolutePath().normalize().toString());
      def.setLogFile(logsDir.resolve(serviceName + ".log").toString());
      def.setContainerIds(new ArrayList<>());
      def.setProjectType(metadata.projectType());
      def.setAvailableScripts(metadata.scripts());
      def.setDetectedPort(metadata.detectedPort());
      def.setPortStrategy(metadata.portStrategy());
      def.setPhpVersion(metadata.phpVersion());
      def.setSelectedScript(metadata.selectedScript());
      PhpLaunchCommands.applySelection(def, metadata.selectedScript());
      return def;
    } catch (Exception e) {
      return null;
    }
  }

  private PhpMetadata readMetadata(Path dir, String preferredScript) throws Exception {
    Path composerFile = dir.resolve("composer.json");
    if (!Files.isRegularFile(composerFile)) {
      return null;
    }
    byte[] bytes = Files.readAllBytes(composerFile);
    if (bytes.length == 0) {
      return null;
    }
    JsonNode root = om.readTree(bytes);
    ProjectType type = detectFramework(dir, root);
    if (type == null) {
      return null;
    }
    List<String> scripts = buildAvailableScripts(dir, root, type);
    if (scripts.isEmpty()) {
      return null;
    }
    if (PhpLaunchCommands.isCustomCommandScript(preferredScript) && !scripts.contains(preferredScript)) {
      scripts.add(preferredScript);
    }
    String selected = WorkspaceDefinitionSync.selectRuntimePhpScript(preferredScript, scripts);
    Integer port = extractPort(dir, selected, type);
    String portStrategy = PhpLaunchCommands.DOCKER_COMPOSE.equals(selected) || isComposerScript(selected)
        ? "UNSUPPORTED"
        : PhpLaunchCommands.defaultPortStrategy(type);
    return new PhpMetadata(type, scripts, selected, port, portStrategy, extractPhpVersion(root));
  }

  private ProjectType detectFramework(Path dir, JsonNode root) {
    if (Files.isRegularFile(dir.resolve("artisan"))) {
      return ProjectType.LARAVEL;
    }
    if (hasPackage(root, "laravel/framework")) {
      return ProjectType.LARAVEL;
    }
    if (Files.isRegularFile(dir.resolve("symfony.lock"))
        || Files.isRegularFile(dir.resolve("bin/console"))
        || hasPackage(root, "symfony/framework")
        || hasPackage(root, "symfony/symfony")
        || hasPackage(root, "symfony/runtime")) {
      return ProjectType.SYMFONY;
    }
    if (!PhpComposerScripts.extractRuntimeScripts(root).isEmpty() || hasWebDocroot(dir)) {
      return ProjectType.PHP_COMPOSER;
    }
    return null;
  }

  private List<String> buildAvailableScripts(Path dir, JsonNode root, ProjectType type) {
    List<String> scripts = new ArrayList<>();
    if (type == ProjectType.LARAVEL && Files.isRegularFile(dir.resolve("artisan"))) {
      scripts.add(PhpLaunchCommands.ARTISAN_SERVE);
    }
    if (type == ProjectType.SYMFONY) {
      scripts.add(PhpLaunchCommands.SYMFONY_SERVE);
    }
    for (String key : PhpComposerScripts.extractRuntimeScripts(root)) {
      if (!scripts.contains(key)) {
        scripts.add(key);
      }
    }
    if (DockerComposeSupport.hasComposeFile(dir)
        && !scripts.contains(PhpLaunchCommands.DOCKER_COMPOSE)) {
      scripts.add(0, PhpLaunchCommands.DOCKER_COMPOSE);
    }
    if ((type == ProjectType.PHP_COMPOSER || type == ProjectType.SYMFONY || type == ProjectType.LARAVEL)
        && hasWebDocroot(dir)
        && !scripts.contains(PhpLaunchCommands.PHP_BUILTIN_SERVE)) {
      scripts.add(PhpLaunchCommands.PHP_BUILTIN_SERVE);
    }
    return scripts;
  }

  private boolean hasWebDocroot(Path dir) {
    return Files.isRegularFile(dir.resolve("index.php"))
        || Files.isRegularFile(dir.resolve("public/index.php"))
        || Files.isDirectory(dir.resolve("public"));
  }

  private boolean hasPackage(JsonNode root, String pkg) {
    return root.path("require").has(pkg) || root.path("require-dev").has(pkg);
  }

  private String extractPhpVersion(JsonNode root) {
    JsonNode platform = root.path("config").path("platform").path("php");
    if (platform.isTextual()) {
      String value = platform.asText("").trim();
      if (!value.isBlank()) {
        return value.startsWith(">=") ? value.substring(2).trim() : value;
      }
    }
    return null;
  }

  private Integer extractPort(Path dir, String selectedScript, ProjectType type) {
    if (PhpLaunchCommands.DOCKER_COMPOSE.equals(selectedScript)) {
      Integer composePort = DockerComposeSupport.readPublishedHttpPort(dir);
      if (composePort != null) {
        return composePort;
      }
    }
    if (PhpLaunchCommands.ARTISAN_SERVE.equals(selectedScript)
        || PhpLaunchCommands.SYMFONY_SERVE.equals(selectedScript)
        || PhpLaunchCommands.PHP_BUILTIN_SERVE.equals(selectedScript)) {
      Integer envPort = readEnvPort(dir);
      if (envPort != null) {
        return envPort;
      }
      Integer frontendProxyPort = DevServerPortDetector.readSiblingFrontendProxyPort(dir);
      if (frontendProxyPort != null) {
        return frontendProxyPort;
      }
      return PhpLaunchCommands.defaultPort(type);
    }
    return null;
  }

  private boolean isComposerScript(String selectedScript) {
    return selectedScript != null
        && !PhpLaunchCommands.isInternalScript(selectedScript)
        && !PhpLaunchCommands.isCustomCommandScript(selectedScript);
  }

  private Integer readEnvPort(Path dir) {
    return DevServerPortDetector.readEnvPort(dir, List.of("APP_PORT", "SERVER_PORT", "PORT"));
  }

  private record PhpMetadata(
      ProjectType projectType,
      List<String> scripts,
      String selectedScript,
      Integer detectedPort,
      String portStrategy,
      String phpVersion) {
  }
}
