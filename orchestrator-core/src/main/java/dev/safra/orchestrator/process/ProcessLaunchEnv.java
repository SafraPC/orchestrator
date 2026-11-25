package dev.safra.orchestrator.process;

import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

final class ProcessLaunchEnv {
  private final JavaVersionDetector javaDetector;
  private final PhpVersionDetector phpDetector;

  ProcessLaunchEnv(JavaVersionDetector javaDetector, PhpVersionDetector phpDetector) {
    this.javaDetector = javaDetector;
    this.phpDetector = phpDetector;
  }

  void apply(Map<String, String> env, ServiceDefinition def, ProcessRuntimeKind kind, Path workDir,
      Map<String, String> startupEnv) {
    env.putAll(startupEnv);
    String path = env.getOrDefault("PATH", "");
    if (kind == ProcessRuntimeKind.JAVA) {
      path = setupJavaPath(def, env, path);
    } else {
      if (kind == ProcessRuntimeKind.PHP) {
        path = setupPhpPath(def, env, path);
      }
      path = setupNodePath(env, path, workDir);
    }
    applyUtf8Env(env, kind == ProcessRuntimeKind.JAVA);
    for (String extra : new String[] {"/opt/homebrew/bin", "/usr/local/bin"}) {
      if (!path.contains(extra) && Files.isDirectory(Path.of(extra))) {
        path = ProcessOs.prependPath(path, extra);
      }
    }
    env.put("PATH", path);
  }

  private String setupJavaPath(ServiceDefinition def, Map<String, String> env, String path) {
    env.remove("JAVA_HOME");
    String javaHome = def.getJavaHome();
    if (javaHome == null || javaHome.isBlank()) {
      javaHome = javaDetector.resolveJavaHome(def.getJavaVersion());
    }
    if (javaHome != null && !javaHome.isBlank()) {
      env.put("JAVA_HOME", javaHome);
      path = ProcessOs.prependPath(path, Path.of(javaHome, "bin").toString());
    }
    path = setupMavenPath(env, path);
    String home = System.getProperty("user.home");
    String sdkmanMvn = home + "/.sdkman/candidates/maven/current/bin";
    if (Files.isDirectory(Path.of(sdkmanMvn))) {
      path = ProcessOs.prependPath(path, sdkmanMvn);
    }
    return path;
  }

  private String setupMavenPath(Map<String, String> env, String path) {
    String mvnHome = env.get("MAVEN_HOME");
    if (mvnHome != null && !mvnHome.isBlank()) {
      Path mvnBin = Path.of(mvnHome, "bin");
      if (Files.isDirectory(mvnBin)) {
        path = ProcessOs.prependPath(path, mvnBin.toString());
      }
    }

    String localAppData = env.getOrDefault("LOCALAPPDATA", System.getenv("LOCALAPPDATA"));
    if (localAppData == null || localAppData.isBlank()) {
      return path;
    }
    Path depsRoot = Path.of(localAppData, "OrchestratorBuildDeps");
    if (!Files.isDirectory(depsRoot)) {
      return path;
    }
    try (var dirs = Files.list(depsRoot)) {
      Optional<Path> latestMaven = dirs
          .filter(Files::isDirectory)
          .filter(p -> p.getFileName().toString().startsWith("apache-maven-"))
          .filter(p -> Files.exists(p.resolve("bin").resolve(ProcessOs.isWindows() ? "mvn.cmd" : "mvn")))
          .max(Comparator.comparingLong(p -> p.toFile().lastModified()));
      if (latestMaven.isPresent()) {
        Path home = latestMaven.get();
        env.putIfAbsent("MAVEN_HOME", home.toString());
        path = ProcessOs.prependPath(path, home.resolve("bin").toString());
      }
    } catch (Exception ignored) {
    }
    return path;
  }

  private String setupNodePath(Map<String, String> env, String path, Path workDir) {
    String localBin = workDir.resolve("node_modules/.bin").toAbsolutePath().toString();
    path = ProcessOs.prependPath(path, localBin);

    String shellPath = resolveShellPath();
    if (!shellPath.isEmpty()) {
      path = ProcessOs.prependPath(path, shellPath);
    }

    String home = System.getProperty("user.home");
    String[] nodePaths = {
        home + "/.nvm/versions/node",
        home + "/.volta/bin",
        home + "/.fnm/aliases/default/bin"
    };
    for (String dir : nodePaths) {
      Path p = Path.of(dir);
      if (!Files.isDirectory(p)) {
        continue;
      }
      if (dir.endsWith("/node")) {
        try (var stream = Files.list(p)) {
          var latest = stream.filter(Files::isDirectory).max(Comparator.naturalOrder());
          if (latest.isPresent()) {
            String bin = latest.get().resolve("bin").toString();
            if (!path.contains(bin)) {
              path = ProcessOs.prependPath(path, bin);
            }
          }
        } catch (Exception ignored) {
        }
      } else if (!path.contains(dir)) {
        path = ProcessOs.prependPath(path, dir);
      }
    }
    return path;
  }

  private String setupPhpPath(ServiceDefinition def, Map<String, String> env, String path) {
    String phpBinary = def.getPhpHome();
    if (phpBinary == null || phpBinary.isBlank()) {
      phpBinary = phpDetector.resolvePhpBinary(def.getPhpVersion());
    }
    if (phpBinary != null && !phpBinary.isBlank()) {
      Path bin = Path.of(phpBinary);
      if (Files.isRegularFile(bin)) {
        path = ProcessOs.prependPath(path, bin.getParent().toString());
      } else if (Files.isDirectory(bin)) {
        path = ProcessOs.prependPath(path, bin.resolve("bin").toString());
      }
    }
    String composerHome = System.getProperty("user.home") + "/.composer/vendor/bin";
    if (Files.isDirectory(Path.of(composerHome))) {
      path = ProcessOs.prependPath(path, composerHome);
    }
    return path;
  }

  private String resolveShellPath() {
    try {
      if (ProcessOs.isWindows()) {
        Process p = new ProcessBuilder("cmd.exe", "/c", "echo %PATH%")
            .redirectErrorStream(true).start();
        String out = new String(p.getInputStream().readAllBytes()).trim();
        p.waitFor(5, TimeUnit.SECONDS);
        return out;
      }
      String shell = System.getenv("SHELL");
      if (shell == null || shell.isBlank()) {
        shell = "/bin/zsh";
      }
      Process p = new ProcessBuilder(shell, "-lc", "echo $PATH")
          .redirectErrorStream(true).start();
      String out = new String(p.getInputStream().readAllBytes()).trim();
      p.waitFor(5, TimeUnit.SECONDS);
      return out;
    } catch (Exception ignored) {
      return "";
    }
  }

  private void applyUtf8Env(Map<String, String> env, boolean isJava) {
    env.put("LANG", "en_US.UTF-8");
    env.put("LC_ALL", "en_US.UTF-8");
    env.put("PYTHONIOENCODING", "utf-8");
    if (!isJava) {
      return;
    }
    String utf8Flags = "-Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 -Dsun.stderr.encoding=UTF-8";
    env.merge("JAVA_TOOL_OPTIONS", utf8Flags, (current, extra) -> current.contains(extra) ? current : current + " " + extra);
    env.merge("MAVEN_OPTS", utf8Flags, (current, extra) -> current.contains(extra) ? current : current + " " + extra);
  }
}
