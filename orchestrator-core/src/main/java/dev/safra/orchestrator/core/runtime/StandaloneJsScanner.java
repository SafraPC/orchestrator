package dev.safra.orchestrator.core.runtime;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Stream;

import dev.safra.orchestrator.model.ServiceDefinition;

public class StandaloneJsScanner {
  private static final Set<String> SKIP_DIRS = Set.of(
      ".git", "target", "node_modules", ".idea", ".next", "dist", "build", ".turbo", ".cache", "coverage");
  private static final Set<String> JS_CONFIG_NAMES = Set.of(
      "jest.config.js", "jest.config.mjs", "jest.config.cjs",
      "eslint.config.js", "eslint.config.mjs", ".eslintrc.js",
      "prettier.config.js", "tailwind.config.js", "postcss.config.js",
      "vite.config.js", "vite.config.mjs", "vite.config.ts",
      "webpack.config.js", "rollup.config.js", "angular.json");
  private static final Set<String> JS_ENTRY_NAMES = Set.of(
      "index.js", "index.mjs", "index.cjs", "main.js", "main.mjs",
      "server.js", "app.js", "start.js");

  private final Path logsDir;

  public StandaloneJsScanner(Path logsDir) {
    this.logsDir = logsDir;
  }

  public List<ServiceDefinition> scanRoot(Path root, List<String> excludeDirs) {
    List<ServiceDefinition> out = new ArrayList<>();
    if (!Files.isDirectory(root)) {
      return out;
    }
    List<String> excluded = excludeDirs != null ? excludeDirs : List.of();
    Set<Path> claimedDirs = new HashSet<>();

    try {
      Files.walkFileTree(root, Set.of(), 6, new SimpleFileVisitor<>() {
        @Override
        public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs) {
          String name = dir.getFileName() == null ? "" : dir.getFileName().toString();
          if (SKIP_DIRS.contains(name) || excluded.contains(name)) {
            return FileVisitResult.SKIP_SUBTREE;
          }
          return FileVisitResult.CONTINUE;
        }

        @Override
        public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) {
          Path dir = file.getParent();
          if (dir == null) {
            return FileVisitResult.CONTINUE;
          }
          if (hasPackageJson(dir) || hasPom(dir)) {
            return FileVisitResult.CONTINUE;
          }
          String fileName = file.getFileName().toString();
          if (fileName.equals("package.json") || fileName.equals("pom.xml")) {
            return FileVisitResult.CONTINUE;
          }
          if (isHtmlEntry(fileName)) {
            registerHtmlDir(dir, claimedDirs, out);
            return FileVisitResult.CONTINUE;
          }
          if (isRunnableJs(file, fileName)) {
            out.add(JsLaunchCommands.buildStandaloneJsService(dir, logsDir, fileName));
          }
          return FileVisitResult.CONTINUE;
        }
      });
    } catch (IOException ignored) {
    }
    return out;
  }

  private void registerHtmlDir(Path dir, Set<Path> claimedDirs, List<ServiceDefinition> out) {
    Path normalized = dir.toAbsolutePath().normalize();
    if (!claimedDirs.add(normalized)) {
      return;
    }
    List<String> htmlFiles = listHtmlFiles(dir);
    if (htmlFiles.isEmpty()) {
      return;
    }
    String entry = htmlFiles.contains("index.html") ? "index.html" : htmlFiles.get(0);
    out.add(JsLaunchCommands.buildStaticHtmlService(dir, logsDir, entry, htmlFiles));
  }

  private List<String> listHtmlFiles(Path dir) {
    try (Stream<Path> stream = Files.list(dir)) {
      return stream
          .filter(Files::isRegularFile)
          .map(p -> p.getFileName().toString())
          .filter(this::isHtmlEntry)
          .sorted(Comparator.comparing((String n) -> !"index.html".equalsIgnoreCase(n)).thenComparing(String::compareToIgnoreCase))
          .toList();
    } catch (IOException e) {
      return List.of();
    }
  }

  private boolean hasPackageJson(Path dir) {
    return Files.isRegularFile(dir.resolve("package.json"));
  }

  private boolean hasPom(Path dir) {
    return Files.isRegularFile(dir.resolve("pom.xml"));
  }

  private boolean isHtmlEntry(String name) {
    String lower = name.toLowerCase(Locale.ROOT);
    return lower.endsWith(".html") || lower.endsWith(".htm");
  }

  private boolean isRunnableJs(Path file, String fileName) {
    String lower = fileName.toLowerCase(Locale.ROOT);
    if (!lower.endsWith(".js") && !lower.endsWith(".mjs") && !lower.endsWith(".cjs")) {
      return false;
    }
    if (JS_CONFIG_NAMES.contains(lower)) {
      return false;
    }
    if (lower.endsWith(".config.js") || lower.endsWith(".config.mjs") || lower.endsWith(".config.cjs")) {
      return false;
    }
    if (JS_ENTRY_NAMES.contains(lower)) {
      return true;
    }
    if (hasNodeShebang(file)) {
      return true;
    }
    return false;
  }

  private boolean hasNodeShebang(Path file) {
    try {
      String first = Files.readString(file).lines().findFirst().orElse("");
      return first.startsWith("#!") && first.toLowerCase(Locale.ROOT).contains("node");
    } catch (IOException e) {
      return false;
    }
  }

  public void refreshServiceDefinition(ServiceDefinition def) {
    if (def == null || def.getProjectType() == null) {
      return;
    }
  }
}
