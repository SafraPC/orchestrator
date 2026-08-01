package dev.safra.orchestrator.process;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

public final class ProcessTreeKiller {
  private static final Set<String> TREE_PARENT_MARKERS = Set.of(
      "composer", "php", "node", "npm", "npx", "yarn", "pnpm",
      "concurrently", "zsh", "bash", "sh", "cmd.exe", "cmd"
  );

  private ProcessTreeKiller() {
  }

  public static void terminateGracefully(long pid) {
    resolveTreeRoot(pid).ifPresent(h -> apply(h, false));
  }

  public static void killForcibly(long pid) {
    resolveTreeRoot(pid).ifPresent(h -> apply(h, true));
  }

  public static void killForcibly(ProcessHandle root) {
    apply(resolveTreeRoot(root), true);
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

  static Optional<ProcessHandle> resolveTreeRoot(long pid) {
    return ProcessHandle.of(pid).map(ProcessTreeKiller::resolveTreeRoot);
  }

  static ProcessHandle resolveTreeRoot(ProcessHandle start) {
    long selfPid = ProcessHandle.current().pid();
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
      if (!isServiceTreeParent(parent)) {
        break;
      }
      current = parent;
      depth++;
    }
    return current;
  }

  private static boolean isServiceTreeParent(ProcessHandle h) {
    String cmd = h.info().commandLine()
        .or(() -> h.info().command())
        .orElse("")
        .toLowerCase(Locale.ROOT);
    if (cmd.isBlank()) {
      return false;
    }
    String base = cmd;
    int slash = Math.max(base.lastIndexOf('/'), base.lastIndexOf('\\'));
    if (slash >= 0 && slash + 1 < base.length()) {
      base = base.substring(slash + 1);
    }
    int space = base.indexOf(' ');
    if (space > 0) {
      base = base.substring(0, space);
    }
    if (TREE_PARENT_MARKERS.contains(base)) {
      return true;
    }
    for (String marker : TREE_PARENT_MARKERS) {
      if (cmd.contains(marker)) {
        return true;
      }
    }
    return false;
  }

  private static void apply(ProcessHandle root, boolean force) {
    List<ProcessHandle> nodes = new ArrayList<>();
    root.descendants().forEach(nodes::add);
    nodes.add(root);
    for (ProcessHandle h : nodes) {
      if (!h.isAlive()) {
        continue;
      }
      if (force) {
        h.destroyForcibly();
      } else {
        h.destroy();
      }
    }
  }
}
