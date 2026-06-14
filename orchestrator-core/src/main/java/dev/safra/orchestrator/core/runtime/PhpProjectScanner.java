package dev.safra.orchestrator.core.runtime;

import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;

public class PhpProjectScanner {
  private static final Set<String> SKIP_DIRS = Set.of(
      ".git", "target", "node_modules", "vendor", ".idea", ".next", "dist", "build", ".turbo", ".cache");
  private static final Set<String> NON_RUNTIME_SCRIPTS = Set.of(
      "test", "tests", "lint", "cs-fix", "cs", "stan", "phpstan", "psalm", "check", "format",
      "analyse", "analysis", "static-analysis", "qa", "quality", "rector", "pest", "phpunit",
      "php-cs-fixer", "deptrac", "infection", "fix",
      "post-autoload-dump", "post-root-package-install", "post-create-project-cmd",
      "post-update-cmd", "pre-autoload-dump", "install-cmd");
  private static final Pattern PORT_PATTERN = Pattern.compile("(?:--port=|--port\\s+|127\\.0\\.0\\.1:)(\\d+)");

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
    if (Files.isRegularFile(dir.resolve("symfony.lock"))) {
      return true;
    }
    return false;
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
          ServiceDefinition def = parseComposerJson(file, dir);
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

  private ServiceDefinition parseComposerJson(Path composerFile, Path dir) {
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
    String selected = WorkspaceDefinitionSync.selectRuntimePhpScript(preferredScript, scripts);
    int port = extractPort(dir, root, selected, type);
    return new PhpMetadata(type, scripts, selected, port, PhpLaunchCommands.defaultPortStrategy(type), extractPhpVersion(root));
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
    JsonNode scripts = root.path("scripts");
    if (!scripts.isObject() || scripts.isEmpty()) {
      return null;
    }
    return ProjectType.PHP_COMPOSER;
  }

  private List<String> buildAvailableScripts(Path dir, JsonNode root, ProjectType type) {
    List<String> scripts = new ArrayList<>();
    if (type == ProjectType.LARAVEL && Files.isRegularFile(dir.resolve("artisan"))) {
      scripts.add(PhpLaunchCommands.ARTISAN_SERVE);
    }
    if (type == ProjectType.SYMFONY) {
      scripts.add(PhpLaunchCommands.SYMFONY_SERVE);
    }
    for (String key : extractComposerScripts(root)) {
      if (!scripts.contains(key)) {
        scripts.add(key);
      }
    }
    if ((type == ProjectType.PHP_COMPOSER || type == ProjectType.SYMFONY)
        && hasWebDocroot(dir)
        && !scripts.contains(PhpLaunchCommands.PHP_BUILTIN_SERVE)) {
      scripts.add(0, PhpLaunchCommands.PHP_BUILTIN_SERVE);
    }
    return scripts;
  }

  private boolean hasWebDocroot(Path dir) {
    return Files.isRegularFile(dir.resolve("public/index.php"))
        || Files.isDirectory(dir.resolve("public"));
  }

  private List<String> extractComposerScripts(JsonNode root) {
    JsonNode scripts = root.path("scripts");
    if (!scripts.isObject()) {
      return List.of();
    }
    List<String> out = new ArrayList<>();
    scripts.fieldNames().forEachRemaining(name -> {
      if (isRuntimeScript(name, scripts.get(name))) {
        out.add(name);
      }
    });
    return out;
  }

  public static boolean isRuntimeComposerScriptName(String name) {
    String lower = name.toLowerCase(Locale.ROOT);
    if (NON_RUNTIME_SCRIPTS.contains(lower)) {
      return false;
    }
    if (lower.startsWith("post-") || lower.startsWith("pre-")) {
      return false;
    }
    if (lower.contains("analys") || lower.contains("stan") || lower.contains("lint")
        || lower.contains("test") || lower.contains("format") || lower.contains("cs-fix")) {
      return false;
    }
    return true;
  }

  private boolean isRuntimeScript(String name, JsonNode scriptNode) {
    if (!isRuntimeComposerScriptName(name)) {
      return false;
    }
    String body = scriptBody(scriptNode).toLowerCase(Locale.ROOT);
    if (body.contains("phpstan") || body.contains("psalm") || body.contains("phpunit")
        || body.contains("pest ") || body.contains("php-cs-fixer") || body.contains("rector")
        || body.contains("deptrac") || body.contains("infection")) {
      return false;
    }
    return true;
  }

  private String scriptBody(JsonNode scriptNode) {
    if (scriptNode == null || scriptNode.isNull()) {
      return "";
    }
    if (scriptNode.isTextual()) {
      return scriptNode.asText("");
    }
    if (scriptNode.isArray()) {
      StringBuilder sb = new StringBuilder();
      for (JsonNode entry : scriptNode) {
        sb.append(entry.asText("")).append(" ");
      }
      return sb.toString();
    }
    return scriptNode.toString();
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

  private int extractPort(Path dir, JsonNode root, String selectedScript, ProjectType type) {
    if (PhpLaunchCommands.ARTISAN_SERVE.equals(selectedScript)
        || PhpLaunchCommands.SYMFONY_SERVE.equals(selectedScript)
        || PhpLaunchCommands.PHP_BUILTIN_SERVE.equals(selectedScript)) {
      Integer envPort = readEnvPort(dir);
      if (envPort != null) {
        return envPort;
      }
      return PhpLaunchCommands.defaultPort(type);
    }
    JsonNode scripts = root.path("scripts");
    if (scripts.isObject() && scripts.has(selectedScript)) {
      Integer fromScript = parsePort(scripts.get(selectedScript).asText(""));
      if (fromScript != null) {
        return fromScript;
      }
    }
    Integer envPort = readEnvPort(dir);
    if (envPort != null) {
      return envPort;
    }
    return PhpLaunchCommands.defaultPort(type);
  }

  private Integer readEnvPort(Path dir) {
    Path envFile = dir.resolve(".env");
    if (!Files.isRegularFile(envFile)) {
      return null;
    }
    try {
      for (String line : Files.readAllLines(envFile)) {
        String trimmed = line.trim();
        if (trimmed.startsWith("APP_PORT=")) {
          return parseInt(trimmed.substring(9).trim());
        }
        if (trimmed.startsWith("SERVER_PORT=")) {
          return parseInt(trimmed.substring(12).trim());
        }
      }
    } catch (Exception ignored) {
    }
    return null;
  }

  private Integer parsePort(String text) {
    Matcher match = PORT_PATTERN.matcher(text);
    if (match.find()) {
      return parseInt(match.group(1));
    }
    return null;
  }

  private Integer parseInt(String value) {
    try {
      return Integer.parseInt(value.trim());
    } catch (NumberFormatException e) {
      return null;
    }
  }

  private record PhpMetadata(
      ProjectType projectType,
      List<String> scripts,
      String selectedScript,
      int detectedPort,
      String portStrategy,
      String phpVersion) {
  }
}
