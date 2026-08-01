package dev.safra.orchestrator.process;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

public final class ProcessTreeKiller {
  private static final Set<String> TREE_PARENT_BASES = Set.of(
      "composer", "php", "node", "npm", "npx", "yarn", "pnpm",
      "concurrently", "zsh", "bash", "sh", "dash", "cmd.exe", "cmd", "python", "python3", "perl"
  );

  private ProcessTreeKiller() {
  }

  public static void terminateGracefully(long pid) {
    if (!isSafeTarget(pid)) {
      return;
    }
    if (!isWindows() && isIsolatedFromSelf(pid)) {
      signalProcessGroup(processGroupId(pid), false);
      return;
    }
    resolveSafeTreeRoot(pid).ifPresent(h -> apply(h, true));
  }

  public static void killForcibly(long pid) {
    if (!isSafeTarget(pid)) {
      return;
    }
    if (!isWindows() && isIsolatedFromSelf(pid)) {
      signalProcessGroup(processGroupId(pid), true);
    }
    resolveSafeTreeRoot(pid).ifPresent(h -> apply(h, true));
    killPid(pid);
  }

  public static void killForcibly(ProcessHandle root) {
    killForcibly(root.pid());
  }

  public static boolean anyAlive(long pid) {
    Optional<ProcessHandle> opt = ProcessHandle.of(pid);
    if (opt.isEmpty()) {
      return false;
    }
    ProcessHandle root = opt.get();
    if (root.isAlive()) {
      return true;
    }
    return root.descendants().anyMatch(ProcessHandle::isAlive);
  }

  public static long processGroupId(long pid) {
    if (isWindows() || pid <= 0) {
      return -1;
    }
    try {
      Process ps = new ProcessBuilder("ps", "-o", "pgid=", "-p", String.valueOf(pid))
          .redirectErrorStream(true)
          .start();
      String out = new String(ps.getInputStream().readAllBytes()).trim();
      ps.waitFor(3, TimeUnit.SECONDS);
      if (out.isEmpty()) {
        return -1;
      }
      String pgid = out.split("\\s+")[0].trim();
      if (!pgid.matches("\\d+")) {
        return -1;
      }
      return Long.parseLong(pgid);
    } catch (Exception ignored) {
      return -1;
    }
  }

  public static boolean isIsolatedFromSelf(long pid) {
    long selfPgid = processGroupId(ProcessHandle.current().pid());
    long targetPgid = processGroupId(pid);
    return selfPgid > 0 && targetPgid > 0 && selfPgid != targetPgid;
  }

  static Optional<ProcessHandle> resolveSafeTreeRoot(long pid) {
    return ProcessHandle.of(pid).map(ProcessTreeKiller::resolveSafeTreeRoot);
  }

  static ProcessHandle resolveSafeTreeRoot(ProcessHandle start) {
    long selfPid = ProcessHandle.current().pid();
    if (start.pid() == selfPid) {
      return start;
    }
    ProcessHandle current = start;
    int depth = 0;
    while (depth < 8) {
      Optional<ProcessHandle> parentOpt = current.parent();
      if (parentOpt.isEmpty()) {
        break;
      }
      ProcessHandle parent = parentOpt.get();
      long parentPid = parent.pid();
      if (parentPid <= 1 || parentPid == selfPid || !parent.isAlive()) {
        break;
      }
      if (isJvmOrOwnsSelf(parent, selfPid)) {
        break;
      }
      if (!isServiceTreeParent(parent)) {
        break;
      }
      current = parent;
      depth++;
    }
    return current;
  }

  private static boolean isSafeTarget(long pid) {
    return pid > 0 && pid != ProcessHandle.current().pid();
  }

  private static boolean isJvmOrOwnsSelf(ProcessHandle h, long selfPid) {
    if (h.pid() == selfPid) {
      return true;
    }
    String base = commandBase(h);
    if (base.equals("java") || base.equals("javaw")) {
      return true;
    }
    try {
      return h.descendants().anyMatch(d -> d.pid() == selfPid);
    } catch (Exception ignored) {
      return false;
    }
  }

  private static boolean isServiceTreeParent(ProcessHandle h) {
    return TREE_PARENT_BASES.contains(commandBase(h));
  }

  private static String commandBase(ProcessHandle h) {
    String cmd = h.info().command()
        .or(() -> h.info().commandLine())
        .orElse("")
        .toLowerCase(Locale.ROOT)
        .trim();
    if (cmd.isBlank()) {
      return "";
    }
    int slash = Math.max(cmd.lastIndexOf('/'), cmd.lastIndexOf('\\'));
    if (slash >= 0 && slash + 1 < cmd.length()) {
      cmd = cmd.substring(slash + 1);
    }
    int space = cmd.indexOf(' ');
    if (space > 0) {
      cmd = cmd.substring(0, space);
    }
    return cmd;
  }

  private static void apply(ProcessHandle root, boolean force) {
    long selfPid = ProcessHandle.current().pid();
    if (root.pid() == selfPid || isJvmOrOwnsSelf(root, selfPid)) {
      return;
    }
    List<ProcessHandle> nodes = new ArrayList<>();
    try {
      root.descendants().forEach(nodes::add);
    } catch (Exception ignored) {
    }
    nodes.sort(Comparator.comparingLong(ProcessHandle::pid).reversed());
    nodes.add(root);
    Set<Long> seen = new LinkedHashSet<>();
    for (ProcessHandle h : nodes) {
      long nodePid = h.pid();
      if (!seen.add(nodePid) || nodePid == selfPid || !h.isAlive()) {
        continue;
      }
      if (isJvmOrOwnsSelf(h, selfPid)) {
        continue;
      }
      try {
        if (force) {
          h.destroyForcibly();
        } else {
          h.destroy();
        }
      } catch (Exception ignored) {
      }
      if (force) {
        killPid(nodePid);
      }
    }
  }

  private static void signalProcessGroup(long pgid, boolean force) {
    if (pgid <= 1) {
      return;
    }
    long selfPgid = processGroupId(ProcessHandle.current().pid());
    if (selfPgid > 0 && selfPgid == pgid) {
      return;
    }
    try {
      String signal = force ? "-9" : "-15";
      new ProcessBuilder("kill", signal, "-" + pgid)
          .redirectErrorStream(true)
          .start()
          .waitFor(3, TimeUnit.SECONDS);
    } catch (Exception ignored) {
    }
  }

  private static void killPid(long pid) {
    if (isWindows() || !isSafeTarget(pid)) {
      return;
    }
    try {
      new ProcessBuilder("kill", "-9", String.valueOf(pid))
          .redirectErrorStream(true)
          .start()
          .waitFor(3, TimeUnit.SECONDS);
    } catch (Exception ignored) {
    }
  }

  private static boolean isWindows() {
    return System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win");
  }
}
