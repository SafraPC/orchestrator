package dev.safra.orchestrator.process;

import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

final class ProcessCommandBuilder {
  private ProcessCommandBuilder() {
  }

  static List<String> prepare(ServiceDefinition def, List<String> cmd, Path workDir, ProcessRuntimeKind kind,
      Integer startupPort) {
    List<String> prepared = new ArrayList<>(cmd);
    if (kind == ProcessRuntimeKind.JAVA) {
      prepared = MavenLaunchCommands.normalizeWindowsMvnw(prepared, workDir);
      prepared = MavenLaunchCommands.wrapWindowsMvn(prepared);
    }
    if (!prepared.isEmpty() && workDir.resolve("mvnw").toFile().exists()) {
      try {
        workDir.resolve("mvnw").toFile().setExecutable(true);
      } catch (Exception ignored) {
      }
    }
    if (kind != ProcessRuntimeKind.JAVA) {
      prepared = applyCustomShellPort(def, prepared, startupPort);
      String joined = String.join(" ", prepared);
      if (ProcessOs.isWindows()) {
        prepared = List.of("cmd.exe", "/d", "/s", "/c", "chcp 65001>nul && " + joined);
      } else {
        String shell = System.getenv("SHELL");
        if (shell == null || shell.isBlank()) {
          shell = "/bin/zsh";
        }
        prepared = wrapUnixSession(List.of(shell, "-lc", joined));
      }
    }
    return prepared;
  }

  static List<String> applyCustomJsPort(ServiceDefinition def, List<String> cmd, Integer startupPort) {
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
      } else if ("-l".equals(token) && i + 1 < updated.size()) {
        updated.set(i + 1, value);
        changed = true;
      } else if (token.startsWith("-l=")) {
        updated.set(i, "-l=" + value);
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

  static List<String> applyPhpBuiltinPort(ServiceDefinition def, List<String> cmd, Integer startupPort) {
    if (startupPort == null || def.getCustomPort() == null || !"CLI".equalsIgnoreCase(def.getPortStrategy())) {
      return cmd;
    }
    List<String> updated = new ArrayList<>(cmd);
    String value = "localhost:" + startupPort;
    for (int i = 0; i < updated.size(); i++) {
      String token = updated.get(i);
      if (token.startsWith("127.0.0.1:") || token.startsWith("localhost:")) {
        int colon = token.indexOf(':');
        updated.set(i, token.substring(0, colon + 1) + startupPort);
        return updated;
      }
      if ("-S".equals(token) && i + 1 < updated.size()) {
        String next = updated.get(i + 1);
        if (next.startsWith("127.0.0.1:") || next.startsWith("localhost:")) {
          updated.set(i + 1, value);
          return updated;
        }
      }
    }
    return updated;
  }

  private static List<String> applyCustomShellPort(ServiceDefinition def, List<String> cmd, Integer startupPort) {
    List<String> updated = applyCustomJsPort(def, cmd, startupPort);
    return applyPhpBuiltinPort(def, updated, startupPort);
  }

  private static List<String> wrapUnixSession(List<String> command) {
    String python = resolvePython3();
    if (python == null) {
      return command;
    }
    List<String> wrapped = new ArrayList<>();
    wrapped.add(python);
    wrapped.add("-c");
    wrapped.add("import os,sys; os.setsid(); os.execvp(sys.argv[1], sys.argv[1:])");
    wrapped.addAll(command);
    return wrapped;
  }

  private static String resolvePython3() {
    for (String candidate : List.of("/opt/homebrew/bin/python3", "/usr/bin/python3", "python3")) {
      try {
        Path path = Path.of(candidate);
        if (candidate.equals("python3") || Files.isExecutable(path)) {
          Process probe = new ProcessBuilder(candidate, "-c", "import os; assert hasattr(os,'setsid')")
              .redirectErrorStream(true)
              .start();
          if (probe.waitFor(3, TimeUnit.SECONDS) && probe.exitValue() == 0) {
            return candidate;
          }
        }
      } catch (Exception ignored) {
      }
    }
    return null;
  }
}
