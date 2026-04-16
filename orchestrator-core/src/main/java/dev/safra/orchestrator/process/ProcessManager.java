package dev.safra.orchestrator.process;
import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;

public class ProcessManager {
  private final Duration gracefulTimeout;
  private final Duration killTimeout;
  private final JavaVersionDetector javaDetector = new JavaVersionDetector();

  public ProcessManager(Duration gracefulTimeout, Duration killTimeout) {
    this.gracefulTimeout = gracefulTimeout;
    this.killTimeout = killTimeout;
  }

  public JavaVersionDetector getJavaDetector() {
    return javaDetector;
  }

  public long start(ServiceDefinition def) {
    validateDefinition(def);
    try {
      Path workDir = Path.of(def.getPath()).toAbsolutePath().normalize();
      Path logPath = Path.of(def.getLogFile()).toAbsolutePath().normalize();

      if (logPath.getParent() != null) {
        Files.createDirectories(logPath.getParent());
      }

      List<String> cmd = new ArrayList<>(def.getCommand());
      boolean isJava = def.getProjectType() == null || def.getProjectType() == ProjectType.SPRING_BOOT;
      Integer startupPort = resolveStartupPort(def, isJava);
      Map<String, String> startupEnv = buildStartupEnv(def, isJava, startupPort);

      freePort(startupPort);

      if (isJava) {
        cmd = MavenLaunchCommands.normalizeWindowsMvnw(cmd, workDir);
        cmd = MavenLaunchCommands.wrapWindowsMvn(cmd);
      }

      if (!cmd.isEmpty() && workDir.resolve("mvnw").toFile().exists()) {
        try {
          workDir.resolve("mvnw").toFile().setExecutable(true);
        } catch (Exception ignored) {
        }
      }

      if (!isJava) {
        cmd = applyCustomJsPort(def, cmd, startupPort);
        String joined = String.join(" ", cmd);
        if (isWindows()) {
          cmd = List.of("cmd.exe", "/d", "/s", "/c", "chcp 65001>nul && " + joined);
        } else {
          String shell = System.getenv("SHELL");
          if (shell == null || shell.isBlank()) shell = "/bin/zsh";
          cmd = List.of(shell, "-lc", joined);
        }
      }

      ProcessBuilder pb = new ProcessBuilder(cmd);
      pb.directory(workDir.toFile());
      pb.redirectErrorStream(true);
      pb.redirectOutput(ProcessBuilder.Redirect.appendTo(logPath.toFile()));

      Map<String, String> env = pb.environment();
      env.putAll(startupEnv);

      String path = env.getOrDefault("PATH", "");

      if (isJava) {
        path = setupJavaPath(def, env, path);
      } else {
        path = setupNodePath(env, path, workDir);
      }

      applyUtf8Env(env, isJava);

      for (String extra : new String[]{"/opt/homebrew/bin", "/usr/local/bin"}) {
        if (!path.contains(extra) && Files.isDirectory(Path.of(extra))) path = prependPath(path, extra);
      }
      env.put("PATH", path);

      try {
        if (!Files.exists(logPath)) Files.createFile(logPath);
        String info = isJava
            ? "[orchestrator] Iniciando com JAVA_HOME=" + env.getOrDefault("JAVA_HOME", "system")
            : "[orchestrator] Iniciando projeto " + def.getProjectType();
        Files.writeString(logPath, info + "\n",
            StandardCharsets.UTF_8, java.nio.file.StandardOpenOption.APPEND);
      } catch (Exception ignored) {
      }

      Process p = pb.start();
      long pid = p.pid();

      monitorProcess(pid, def.getName());

      return pid;
    } catch (IOException e) {
      String detail = e.getMessage() != null ? e.getMessage() : e.toString();
      throw new IllegalStateException("Falha ao iniciar processo para serviço: " + def.getName() + " - " + detail, e);
    }
  }

  public boolean isAlive(long pid) {
    return ProcessHandle.of(pid).map(ProcessHandle::isAlive).orElse(false);
  }

  public StopResult stop(long pid) {
    Optional<ProcessHandle> opt = ProcessHandle.of(pid);
    if (opt.isEmpty()) {
      return StopResult.notFound(pid);
    }
    ProcessHandle h = opt.get();
    if (!h.isAlive()) {
      return StopResult.alreadyStopped(pid);
    }

    if (isWindows()) {
      killWindowsTree(pid);
      boolean exited = waitForExit(h, gracefulTimeout);
      if (exited) return StopResult.stopped(pid, "TASKKILL_TREE");
    }

    boolean termSent = h.destroy();
    boolean exited = waitForExit(h, gracefulTimeout);
    if (exited) {
      return StopResult.stopped(pid, termSent ? "SIGTERM" : "TERM_NOT_SENT");
    }

    boolean killSent = h.destroyForcibly();
    boolean exitedAfterKill = waitForExit(h, killTimeout);
    if (exitedAfterKill) {
      return StopResult.stopped(pid, killSent ? "SIGKILL" : "KILL_NOT_SENT");
    }
    return StopResult.failed(pid, "Não foi possível finalizar o processo (TERM+KILL) dentro do timeout.");
  }

  private void killWindowsTree(long pid) {
    try {
      new ProcessBuilder("taskkill", "/PID", String.valueOf(pid), "/T", "/F")
          .redirectErrorStream(true)
          .start()
          .waitFor(5, TimeUnit.SECONDS);
    } catch (Exception ignored) {
    }
  }

  private boolean waitForExit(ProcessHandle h, Duration timeout) {
    try {
      return h.onExit().toCompletableFuture().get(timeout.toMillis(), TimeUnit.MILLISECONDS) != null;
    } catch (Exception ignored) {
      return !h.isAlive();
    }
  }

  private void validateDefinition(ServiceDefinition def) {
    if (def.getName() == null || def.getName().isBlank()) {
      throw new IllegalArgumentException("name é obrigatório");
    }
    if (def.getPath() == null || def.getPath().isBlank()) {
      throw new IllegalArgumentException("path é obrigatório");
    }
    if (def.getCommand() == null || def.getCommand().isEmpty()) {
      throw new IllegalArgumentException("command é obrigatório");
    }
    if (def.getLogFile() == null || def.getLogFile().isBlank()) {
      throw new IllegalArgumentException("logFile é obrigatório");
    }
  }

  private String detectJavaHome(String requiredVersion) {
    return javaDetector.resolveJavaHome(requiredVersion);
  }

  private String setupJavaPath(ServiceDefinition def, Map<String, String> env, String path) {
    env.remove("JAVA_HOME");
    String javaHome = def.getJavaHome();
    if (javaHome == null || javaHome.isBlank()) {
      javaHome = detectJavaHome(def.getJavaVersion());
    }
    if (javaHome != null && !javaHome.isBlank()) {
      env.put("JAVA_HOME", javaHome);
      path = prependPath(path, Path.of(javaHome, "bin").toString());
    }
    path = setupMavenPath(env, path);
    String home = System.getProperty("user.home");
    String sdkmanMvn = home + "/.sdkman/candidates/maven/current/bin";
    if (Files.isDirectory(Path.of(sdkmanMvn))) path = prependPath(path, sdkmanMvn);
    return path;
  }

  private String setupMavenPath(Map<String, String> env, String path) {
    String mvnHome = env.get("MAVEN_HOME");
    if (mvnHome != null && !mvnHome.isBlank()) {
      Path mvnBin = Path.of(mvnHome, "bin");
      if (Files.isDirectory(mvnBin)) {
        path = prependPath(path, mvnBin.toString());
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
          .filter(p -> Files.exists(p.resolve("bin").resolve(isWindows() ? "mvn.cmd" : "mvn")))
          .max(Comparator.comparingLong(p -> p.toFile().lastModified()));
      if (latestMaven.isPresent()) {
        Path home = latestMaven.get();
        env.putIfAbsent("MAVEN_HOME", home.toString());
        path = prependPath(path, home.resolve("bin").toString());
      }
    } catch (Exception ignored) {
    }
    return path;
  }

  private String setupNodePath(Map<String, String> env, String path, Path workDir) {
    String localBin = workDir.resolve("node_modules/.bin").toAbsolutePath().toString();
    path = prependPath(path, localBin);

    String shellPath = resolveShellPath();
    if (!shellPath.isEmpty()) path = prependPath(path, shellPath);

    String home = System.getProperty("user.home");
    String[] nodePaths = {
        home + "/.nvm/versions/node",
        home + "/.volta/bin",
        home + "/.fnm/aliases/default/bin"
    };
    for (String dir : nodePaths) {
      Path p = Path.of(dir);
      if (!Files.isDirectory(p)) continue;
      if (dir.endsWith("/node")) {
        try (var stream = Files.list(p)) {
          var latest = stream.filter(Files::isDirectory).max(java.util.Comparator.naturalOrder());
          if (latest.isPresent()) {
            String bin = latest.get().resolve("bin").toString();
            if (!path.contains(bin)) path = prependPath(path, bin);
          }
        } catch (Exception ignored) {}
      } else {
        if (!path.contains(dir)) path = prependPath(path, dir);
      }
    }
    return path;
  }

  private String resolveShellPath() {
    try {
      if (isWindows()) {
        Process p = new ProcessBuilder("cmd.exe", "/c", "echo %PATH%")
            .redirectErrorStream(true).start();
        String out = new String(p.getInputStream().readAllBytes()).trim();
        p.waitFor(5, TimeUnit.SECONDS);
        return out;
      }
      String shell = System.getenv("SHELL");
      if (shell == null || shell.isBlank()) shell = "/bin/zsh";
      Process p = new ProcessBuilder(shell, "-lc", "echo $PATH")
          .redirectErrorStream(true).start();
      String out = new String(p.getInputStream().readAllBytes()).trim();
      p.waitFor(5, TimeUnit.SECONDS);
      return out;
    } catch (Exception ignored) {
      return "";
    }
  }

  private boolean isWindows() {
    return System.getProperty("os.name").toLowerCase().contains("win");
  }

  private String prependPath(String path, String entry) {
    if (entry == null || entry.isBlank()) return path;
    if (path == null || path.isBlank()) return entry;
    return entry + File.pathSeparator + path;
  }

  private Integer resolveStartupPort(ServiceDefinition def, boolean isJava) {
    if (!isJava && def.getCustomPort() != null) {
      return def.getCustomPort();
    }
    if (def.getDetectedPort() != null) {
      return def.getDetectedPort();
    }
    if (def.getEnv() == null) {
      return null;
    }
    String port = def.getEnv().getOrDefault("SERVER_PORT", def.getEnv().get("PORT"));
    if (port == null || port.isBlank()) {
      return null;
    }
    try {
      return Integer.parseInt(port.trim());
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  private Map<String, String> buildStartupEnv(ServiceDefinition def, boolean isJava, Integer startupPort) {
    Map<String, String> env = new HashMap<>();
    if (def.getEnv() != null) {
      env.putAll(def.getEnv());
    }
    if (!isJava) {
      env.remove("SERVER_PORT");
      env.remove("PORT");
      if (def.getCustomPort() != null && startupPort != null && "ENV".equalsIgnoreCase(def.getPortStrategy())) {
        String port = String.valueOf(startupPort);
        env.put("SERVER_PORT", port);
        env.put("PORT", port);
      }
    }
    return env;
  }

  private List<String> applyCustomJsPort(ServiceDefinition def, List<String> cmd, Integer startupPort) {
    if (startupPort == null || def.getCustomPort() == null || !"CLI".equalsIgnoreCase(def.getPortStrategy())) {
      return cmd;
    }
    List<String> updated = new ArrayList<>(cmd);
    String value = String.valueOf(startupPort);
    boolean changed = false;
    for (int i = 0; i < updated.size(); i++) {
      String token = updated.get(i);
      if ("--port".equalsIgnoreCase(token) || "-p".equalsIgnoreCase(token)) {
        if (i + 1 < updated.size()) {
          updated.set(i + 1, value);
          changed = true;
        }
      } else if (token.startsWith("--port=")) {
        updated.set(i, "--port=" + value);
        changed = true;
      } else if (token.startsWith("--PORT=")) {
        updated.set(i, "--PORT=" + value);
        changed = true;
      }
    }
    if (!changed && updated.size() >= 2 && "npm".equalsIgnoreCase(updated.get(0)) && "run".equalsIgnoreCase(updated.get(1))) {
      updated.add("--");
      updated.add("--port");
      updated.add(value);
      updated.add("--strictPort");
    }
    return updated;
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

  private void freePort(Integer port) {
    if (port == null) {
      return;
    }
    Map<String, String> env = Map.of("SERVER_PORT", String.valueOf(port));
    PortProcessKiller.freePort(env, isWindows());
  }

  private void monitorProcess(long pid, String serviceName) {
    Thread t = new Thread(() -> {
      try {
        Optional<ProcessHandle> opt = ProcessHandle.of(pid);
        if (opt.isEmpty())
          return;
        opt.get().onExit().thenRun(() -> {
        });
      } catch (Exception ignored) {
      }
    }, "monitor-" + serviceName);
    t.setDaemon(true);
    t.start();
  }
}
