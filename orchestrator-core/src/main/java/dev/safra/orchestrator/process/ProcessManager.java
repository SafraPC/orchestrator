package dev.safra.orchestrator.process;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.function.LongConsumer;
import dev.safra.orchestrator.model.ServiceDefinition;

public class ProcessManager {
  private final Duration gracefulTimeout;
  private final Duration killTimeout;
  private final JavaVersionDetector javaDetector = new JavaVersionDetector();
  private final PhpVersionDetector phpDetector = new PhpVersionDetector();
  private final ProcessLaunchEnv launchEnv = new ProcessLaunchEnv(javaDetector, phpDetector);
  private final List<Integer> protectedPorts = ProcessStartupPort.parseProtected(
      System.getenv("ORCHESTRATOR_PROTECTED_PORTS"));

  public ProcessManager(Duration gracefulTimeout, Duration killTimeout) {
    this.gracefulTimeout = gracefulTimeout;
    this.killTimeout = killTimeout;
  }

  public JavaVersionDetector getJavaDetector() {
    return javaDetector;
  }

  public PhpVersionDetector getPhpDetector() {
    return phpDetector;
  }

  public long start(ServiceDefinition def) {
    return start(def, null, null);
  }

  public long start(ServiceDefinition def, Long stalePid) {
    return start(def, stalePid, null);
  }

  public long start(ServiceDefinition def, Long stalePid, LongConsumer onExit) {
    validateDefinition(def);
    try {
      Path workDir = Path.of(def.getPath()).toAbsolutePath().normalize();
      Path logPath = Path.of(def.getLogFile()).toAbsolutePath().normalize();

      if (logPath.getParent() != null) {
        Files.createDirectories(logPath.getParent());
      }

      List<String> cmd = new ArrayList<>(def.getCommand());
      ProcessRuntimeKind kind = ProcessRuntimeKind.of(def.getProjectType());
      boolean isJava = kind == ProcessRuntimeKind.JAVA;
      Integer startupPort = ProcessStartupPort.resolve(def, isJava);
      Map<String, String> startupEnv = ProcessStartupPort.buildEnv(def, isJava, startupPort);

      ProcessStartupPort.validate(def, startupPort, protectedPorts);
      ProcessStartupPort.ensureFree(startupPort, stalePid);

      cmd = ProcessCommandBuilder.prepare(def, cmd, workDir, kind, startupPort);

      ProcessBuilder pb = new ProcessBuilder(cmd);
      pb.directory(workDir.toFile());
      pb.redirectErrorStream(true);
      pb.redirectOutput(ProcessBuilder.Redirect.appendTo(logPath.toFile()));

      launchEnv.apply(pb.environment(), def, kind, workDir, startupEnv);
      appendStartupNote(logPath, def, pb.environment(), isJava);

      Process p = pb.start();
      long pid = p.pid();

      if (onExit != null) {
        ProcessHandle.of(pid).ifPresent(handle -> handle.onExit().thenRun(() -> onExit.accept(pid)));
      }

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
    if (!h.isAlive() && !ProcessTreeKiller.anyAlive(pid)) {
      return StopResult.alreadyStopped(pid);
    }

    if (ProcessOs.isWindows()) {
      killWindowsTree(pid);
      boolean exited = waitForExit(h, gracefulTimeout);
      if (exited && !ProcessTreeKiller.anyAlive(pid)) {
        return StopResult.stopped(pid, "TASKKILL_TREE");
      }
    }

    boolean isolated = !ProcessOs.isWindows() && ProcessTreeKiller.isIsolatedFromSelf(pid);
    if (isolated) {
      ProcessTreeKiller.terminateGracefully(pid);
      boolean exited = waitForExit(h, gracefulTimeout);
      if (exited && !ProcessTreeKiller.anyAlive(pid)) {
        return StopResult.stopped(pid, "SIGTERM");
      }
    }

    ProcessTreeKiller.killForcibly(pid);
    boolean exitedAfterKill = waitForExit(h, killTimeout);
    if ((exitedAfterKill || !h.isAlive()) && !ProcessTreeKiller.anyAlive(pid)) {
      return StopResult.stopped(pid, "SIGKILL");
    }
    if (!ProcessTreeKiller.anyAlive(pid)) {
      return StopResult.stopped(pid, "SIGKILL");
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

  private void appendStartupNote(Path logPath, ServiceDefinition def, Map<String, String> env, boolean isJava) {
    try {
      if (!Files.exists(logPath)) {
        Files.createFile(logPath);
      }
      String info = isJava
          ? "[orchestrator] Iniciando com JAVA_HOME=" + env.getOrDefault("JAVA_HOME", "system")
          : "[orchestrator] Iniciando projeto " + def.getProjectType();
      Files.writeString(logPath, info + "\n",
          StandardCharsets.UTF_8, java.nio.file.StandardOpenOption.APPEND);
    } catch (Exception ignored) {
    }
  }
}
