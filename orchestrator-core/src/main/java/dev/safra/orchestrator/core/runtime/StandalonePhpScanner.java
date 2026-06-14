package dev.safra.orchestrator.core.runtime;

import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import dev.safra.orchestrator.model.ServiceDefinition;

public class StandalonePhpScanner {
  private static final Set<String> SKIP_DIRS = Set.of(
      ".git", "target", "node_modules", "vendor", ".idea", ".next", "dist", "build", ".turbo", ".cache");

  private final Path logsDir;

  public StandalonePhpScanner(Path logsDir) {
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
          if (!"index.php".equals(file.getFileName().toString())) {
            return FileVisitResult.CONTINUE;
          }
          Path dir = file.getParent();
          if (dir == null) {
            return FileVisitResult.CONTINUE;
          }
          if (hasManifest(dir)) {
            return FileVisitResult.CONTINUE;
          }
          Path projectDir = dir;
          String docroot = ".";
          String dirName = dir.getFileName() == null ? "" : dir.getFileName().toString();
          if ("public".equals(dirName)) {
            Path parent = dir.getParent();
            if (parent != null && (hasManifest(parent) || PhpProjectScanner.isPhpOwnedDirectory(parent))) {
              return FileVisitResult.CONTINUE;
            }
            if (parent != null) {
              projectDir = parent;
              docroot = "public";
            }
          }
          Path normalized = projectDir.toAbsolutePath().normalize();
          if (!claimedDirs.add(normalized)) {
            return FileVisitResult.CONTINUE;
          }
          out.add(PhpLaunchCommands.buildStandalonePhpService(projectDir, logsDir, docroot));
          return FileVisitResult.CONTINUE;
        }
      });
    } catch (IOException ignored) {
    }
    return out;
  }

  private boolean hasManifest(Path dir) {
    return Files.isRegularFile(dir.resolve("composer.json"))
        || Files.isRegularFile(dir.resolve("package.json"))
        || Files.isRegularFile(dir.resolve("pom.xml"));
  }
}
