package dev.safra.orchestrator.core.runtime;

import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;

public class JsProjectScanner {
  private static final Set<String> SKIP_DIRS = Set.of(
      ".git", "target", "node_modules", ".idea", ".next", "dist", "build", ".turbo", ".cache");
  private static final Pattern PORT_FLAG = Pattern.compile("(?:--port|--PORT|-p)\\s+(\\d+)");

  private final ObjectMapper om;
  private final Path logsDir;

  public JsProjectScanner(ObjectMapper om, Path logsDir) {
    this.om = om;
    this.logsDir = logsDir;
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
          if (!file.getFileName().toString().equals("package.json")) {
            return FileVisitResult.CONTINUE;
          }
          Path dir = file.getParent();
          if (dir == null) {
            return FileVisitResult.CONTINUE;
          }
          if (Files.exists(dir.resolve("pom.xml"))) {
            return FileVisitResult.CONTINUE;
          }
          if (PhpProjectScanner.isPhpOwnedDirectory(dir)) {
            return FileVisitResult.CONTINUE;
          }

          ServiceDefinition def = parsePackageJson(file, dir);
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
    if (def == null || def.getProjectType() == null || def.getProjectType() == ProjectType.SPRING_BOOT) {
      return;
    }
    if (def.getProjectType() == ProjectType.STATIC_HTML || def.getProjectType() == ProjectType.STANDALONE_JS) {
      return;
    }
    if (PhpLaunchCommands.isPhpProject(def.getProjectType())) {
      return;
    }
    try {
      JsMetadata metadata = readMetadata(Path.of(def.getPath()), def.getSelectedScript());
      if (metadata == null) {
        return;
      }
      def.setAvailableScripts(metadata.scripts());
      def.setDetectedPort(metadata.detectedPort());
      def.setPortStrategy(metadata.portStrategy());
      def.setSelectedScript(metadata.selectedScript());
      def.setCommand(JsLaunchCommands.npmRunCommand(metadata.selectedScript()));
    } catch (Exception ignored) {
    }
  }

  private ServiceDefinition parsePackageJson(Path pkgFile, Path dir) {
    try {
      JsMetadata metadata = readMetadata(dir, null);
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
      def.setSelectedScript(metadata.selectedScript());
      def.setCommand(JsLaunchCommands.npmRunCommand(metadata.selectedScript()));
      return def;
    } catch (Exception e) {
      return null;
    }
  }

  private JsMetadata readMetadata(Path dir, String preferredScript) throws Exception {
    Path pkgFile = dir.resolve("package.json");
    byte[] bytes = Files.readAllBytes(pkgFile);
    if (bytes.length == 0) {
      return null;
    }
    JsonNode root = om.readTree(bytes);

    if (isMonorepoRoot(root)) {
      return null;
    }

    List<String> scripts = extractScripts(root);
    if (scripts.isEmpty()) {
      return null;
    }

    ProjectType type = JsFrameworkDetector.detect(dir, root);
    if (type == null) {
      type = ProjectType.UNKNOWN;
    }

    String selectedScript = selectScript(scripts, type, preferredScript);
    String scriptCommand = root.path("scripts").path(selectedScript).asText("");
    return new JsMetadata(
        type,
        scripts,
        selectedScript,
        extractPort(root, dir, selectedScript, type),
        JsFrameworkDetector.resolvePortStrategy(scriptCommand, type));
  }

  private boolean isMonorepoRoot(JsonNode root) {
    if (root.has("workspaces")) {
      return true;
    }
    JsonNode devDeps = root.path("devDependencies");
    if (devDeps.has("lerna") || devDeps.has("nx") || devDeps.has("turbo")) {
      return true;
    }
    JsonNode deps = root.path("dependencies");
    return deps.has("lerna") || deps.has("nx");
  }

  private List<String> extractScripts(JsonNode root) {
    JsonNode scripts = root.path("scripts");
    if (scripts.isMissingNode() || !scripts.isObject()) {
      return List.of();
    }
    List<String> out = new ArrayList<>();
    scripts.fieldNames().forEachRemaining(out::add);
    return out;
  }

  private int extractPort(JsonNode root, Path dir, String selectedScript, ProjectType type) {
    JsonNode scripts = root.path("scripts");
    if (scripts.isObject() && scripts.has(selectedScript)) {
      Matcher selectedMatch = PORT_FLAG.matcher(scripts.get(selectedScript).asText(""));
      if (selectedMatch.find()) {
        try {
          return Integer.parseInt(selectedMatch.group(1));
        } catch (NumberFormatException ignored) {
        }
      }
    }
    if (scripts.isObject()) {
      for (var it = scripts.fields(); it.hasNext();) {
        var entry = it.next();
        Matcher match = PORT_FLAG.matcher(entry.getValue().asText(""));
        if (match.find()) {
          try {
            return Integer.parseInt(match.group(1));
          } catch (NumberFormatException ignored) {
          }
        }
      }
    }
    Integer envPort = readEnvPort(dir);
    if (envPort != null) {
      return envPort;
    }
    return JsFrameworkDetector.defaultPort(type);
  }

  private Integer readEnvPort(Path dir) {
    Path envFile = dir.resolve(".env");
    if (!Files.exists(envFile)) {
      return null;
    }
    try {
      for (String line : Files.readAllLines(envFile)) {
        String trimmed = line.trim();
        if (trimmed.startsWith("PORT=")) {
          try {
            return Integer.parseInt(trimmed.substring(5).trim());
          } catch (NumberFormatException ignored) {
          }
        }
      }
    } catch (Exception ignored) {
    }
    return null;
  }

  private String selectScript(List<String> scripts, ProjectType type, String preferredScript) {
    if (preferredScript != null && !preferredScript.isBlank() && scripts.contains(preferredScript)) {
      return preferredScript;
    }
    for (String candidate : JsFrameworkDetector.preferredScripts(type)) {
      if (scripts.contains(candidate)) {
        return candidate;
      }
    }
    return scripts.get(0);
  }

  private record JsMetadata(
      ProjectType projectType,
      List<String> scripts,
      String selectedScript,
      int detectedPort,
      String portStrategy) {
  }
}
