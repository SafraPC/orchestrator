package dev.safra.orchestrator.process;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class ProcessSnapshot {
  private static final int MAX_ANCESTRY_DEPTH = 12;

  private final Map<Long, String> commands;
  private final Map<Long, Long> parents;

  private ProcessSnapshot(Map<Long, String> commands, Map<Long, Long> parents) {
    this.commands = commands;
    this.parents = parents;
  }

  public static ProcessSnapshot capture() {
    Map<Long, String> commands = new HashMap<>();
    Map<Long, Long> parents = new HashMap<>();
    try {
      ProcessHandle.allProcesses().forEach(handle -> {
        long pid = handle.pid();
        ProcessHandle.Info info = handle.info();
        String command = info.commandLine().or(info::command).orElse("").trim();
        if (!command.isEmpty()) {
          commands.put(pid, command);
        }
        handle.parent().map(ProcessHandle::pid).ifPresent(parent -> parents.put(pid, parent));
      });
    } catch (Exception ignored) {
    }
    return new ProcessSnapshot(commands, parents);
  }

  public String command(long pid) {
    return commands.getOrDefault(pid, "");
  }

  public List<String> ancestry(long pid) {
    List<String> chain = new ArrayList<>();
    long current = pid;
    int depth = 0;
    while (current > 1 && depth < MAX_ANCESTRY_DEPTH) {
      String command = commands.get(current);
      if (command != null && !command.isBlank()) {
        chain.add(command);
      }
      Long parent = parents.get(current);
      if (parent == null || parent == current) {
        break;
      }
      current = parent;
      depth++;
    }
    return chain;
  }
}
