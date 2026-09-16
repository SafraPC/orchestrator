package dev.safra.orchestrator.core.runtime.docker;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

public class DockerCli {

  public record Result(int exitCode, String stdout, String stderr) {
    public boolean ok() {
      return exitCode == 0;
    }

    public String errorText() {
      String combined = ((stderr == null ? "" : stderr) + "\n" + (stdout == null ? "" : stdout)).trim();
      if (combined.isBlank())
        return "Falha ao executar comando Docker.";
      return combined.lines()
          .map(String::strip)
          .filter(line -> !line.isBlank())
          .filter(line -> DAEMON_ERROR_MARKERS.stream().anyMatch(line::startsWith))
          .findFirst()
          .orElseGet(() -> combined.lines().map(String::strip).filter(line -> !line.isBlank()).findFirst()
              .orElse("Falha ao executar comando Docker."));
    }

    public boolean reportedError() {
      String combined = (stdout == null ? "" : stdout) + "\n" + (stderr == null ? "" : stderr);
      return combined.lines()
          .map(String::strip)
          .anyMatch(line -> DAEMON_ERROR_MARKERS.stream().anyMatch(line::startsWith));
    }

    public boolean succeeded() {
      return ok() && !reportedError();
    }
  }

  private static final List<String> DAEMON_ERROR_MARKERS = List.of(
      "Error response from daemon:",
      "Error: No such",
      "error during connect:",
      "Cannot connect to the Docker daemon");

  private static final boolean WINDOWS = System.getProperty("os.name", "").toLowerCase().contains("win");
  private static final List<String> UNIX_DIRS = List.of(
      "/usr/local/bin",
      "/opt/homebrew/bin",
      "/opt/local/bin",
      "/usr/bin",
      "/bin",
      "/Applications/Docker.app/Contents/Resources/bin");
  private static final List<String> WINDOWS_DIRS = List.of(
      "C:\\Program Files\\Docker\\Docker\\resources\\bin",
      "C:\\ProgramData\\DockerDesktop\\version-bin");
  private static final List<String> HOME_DIRS = List.of(".docker/bin", ".local/bin", ".rd/bin", "bin");

  private final Map<String, String> binaries = new ConcurrentHashMap<>();
  private volatile String context;

  public String resolveBinary(String name) {
    String cached = binaries.get(name);
    if (cached != null && Files.isExecutable(Path.of(cached)))
      return cached;
    binaries.remove(name);
    String resolved = lookup(name);
    if (resolved != null)
      binaries.put(name, resolved);
    return resolved;
  }

  public boolean isAvailable(String name) {
    return resolveBinary(name) != null;
  }

  public void setContext(String value) {
    this.context = value == null || value.isBlank() ? null : value.trim();
  }

  public String getContext() {
    return context;
  }

  public Result docker(List<String> args, Duration timeout) {
    return dockerWithContext(context, args, timeout);
  }

  public Result dockerWithContext(String contextName, List<String> args, Duration timeout) {
    String binary = resolveBinary("docker");
    if (binary == null)
      return new Result(-1, "", "Docker CLI não encontrado. Instale o Docker e garanta que o comando esteja no PATH.");
    List<String> command = new ArrayList<>();
    command.add(binary);
    if (contextName != null && !contextName.isBlank()) {
      command.add("--context");
      command.add(contextName);
    }
    command.addAll(args);
    return execute(command, timeout);
  }

  public Result colima(List<String> args, Duration timeout) {
    String binary = resolveBinary("colima");
    if (binary == null)
      return new Result(-1, "", "Colima não encontrado no PATH.");
    List<String> command = new ArrayList<>();
    command.add(binary);
    command.addAll(args);
    return execute(command, timeout);
  }

  public Result execute(List<String> command, Duration timeout) {
    Process process = null;
    try {
      process = new ProcessBuilder(command).start();
      StringBuilder out = new StringBuilder();
      StringBuilder err = new StringBuilder();
      Thread stdout = drain(process.getInputStream(), out);
      Thread stderr = drain(process.getErrorStream(), err);
      boolean finished = process.waitFor(timeout.toMillis(), TimeUnit.MILLISECONDS);
      if (!finished) {
        process.destroyForcibly();
        process.waitFor(2, TimeUnit.SECONDS);
        stdout.join(500);
        stderr.join(500);
        return new Result(-1, out.toString(),
            "Tempo limite de " + timeout.toSeconds() + "s excedido em: " + String.join(" ", command));
      }
      stdout.join(2000);
      stderr.join(2000);
      return new Result(process.exitValue(), out.toString(), err.toString());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      if (process != null)
        process.destroyForcibly();
      return new Result(-1, "", "Execução interrompida.");
    } catch (Exception e) {
      return new Result(-1, "", e.getMessage() == null ? e.toString() : e.getMessage());
    }
  }

  private Thread drain(InputStream stream, StringBuilder target) {
    Thread thread = new Thread(() -> {
      try (InputStream in = stream) {
        byte[] buffer = new byte[8192];
        int read;
        while ((read = in.read(buffer)) != -1) {
          synchronized (target) {
            target.append(new String(buffer, 0, read, StandardCharsets.UTF_8));
          }
        }
      } catch (Exception ignored) {
      }
    });
    thread.setDaemon(true);
    thread.start();
    return thread;
  }

  private String lookup(String name) {
    String fromPath = lookupOnPath(name);
    if (fromPath != null)
      return fromPath;
    for (String dir : WINDOWS ? WINDOWS_DIRS : UNIX_DIRS) {
      String found = probe(Path.of(dir), name);
      if (found != null)
        return found;
    }
    String home = System.getProperty("user.home");
    if (home != null && !home.isBlank()) {
      for (String dir : HOME_DIRS) {
        String found = probe(Path.of(home, dir.split("/")), name);
        if (found != null)
          return found;
      }
    }
    return null;
  }

  private String lookupOnPath(String name) {
    Result result = execute(List.of(WINDOWS ? "where" : "which", name), Duration.ofSeconds(5));
    if (!result.ok())
      return null;
    return result.stdout().lines()
        .map(String::trim)
        .filter(line -> !line.isBlank())
        .filter(line -> Files.isExecutable(Path.of(line)))
        .findFirst()
        .orElse(null);
  }

  private String probe(Path dir, String name) {
    for (String candidate : WINDOWS ? List.of(name + ".exe", name) : List.of(name)) {
      Path file = dir.resolve(candidate);
      if (Files.isRegularFile(file) && Files.isExecutable(file))
        return file.toAbsolutePath().normalize().toString();
    }
    return null;
  }
}
