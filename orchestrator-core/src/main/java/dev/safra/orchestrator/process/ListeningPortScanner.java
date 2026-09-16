package dev.safra.orchestrator.process;

import dev.safra.orchestrator.model.ListeningPortView;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.TimeUnit;

public final class ListeningPortScanner {
  private static final Comparator<ListeningPortView> ORDER = Comparator
      .comparingInt((ListeningPortView view) -> view.devRelated() ? 0 : 1)
      .thenComparingInt(view -> view.devPort() ? 0 : 1)
      .thenComparingInt(ListeningPortView::port)
      .thenComparingLong(ListeningPortView::pid);

  private ListeningPortScanner() {
  }

  public static List<ListeningPortView> scan() {
    boolean windows = System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win");
    List<Binding> bindings = windows ? collectWindows() : collectUnix();
    ProcessSnapshot snapshot = ProcessSnapshot.capture();
    Map<String, ListeningPortView> unique = new LinkedHashMap<>();
    for (Binding binding : bindings) {
      String key = binding.pid() + ":" + binding.port();
      unique.computeIfAbsent(key, ignored -> toView(binding, snapshot));
    }
    List<ListeningPortView> views = new ArrayList<>(unique.values());
    views.sort(ORDER);
    return views;
  }

  private static ListeningPortView toView(Binding binding, ProcessSnapshot snapshot) {
    String command = snapshot.command(binding.pid());
    String processName = binding.processName().isBlank()
        ? DevPortHeuristics.commandBase(command)
        : binding.processName();
    String origin = DevPortHeuristics.originOf(snapshot.ancestry(binding.pid()), processName);
    boolean devPort = DevPortHeuristics.isDevPort(binding.port());
    return new ListeningPortView(
        binding.port(),
        binding.pid(),
        processName,
        command,
        binding.address(),
        origin,
        DevPortHeuristics.isDevRelated(origin),
        devPort);
  }

  private static List<Binding> collectUnix() {
    List<Binding> bindings = new ArrayList<>();
    String output = exec("lsof", "+c", "0", "-nP", "-iTCP", "-sTCP:LISTEN", "-Fpcn");
    long pid = -1;
    String processName = "";
    for (String line : output.split("\\R")) {
      if (line.length() < 2) {
        continue;
      }
      char tag = line.charAt(0);
      String value = line.substring(1).trim();
      switch (tag) {
        case 'p' -> {
          pid = parsePid(value);
          processName = "";
        }
        case 'c' -> processName = value;
        case 'n' -> {
          int port = portOf(value);
          if (pid > 0 && port > 0) {
            bindings.add(new Binding(port, pid, addressOf(value), processName));
          }
        }
        default -> {
        }
      }
    }
    return bindings;
  }

  private static List<Binding> collectWindows() {
    List<Binding> bindings = new ArrayList<>();
    Map<Long, String> names = windowsProcessNames();
    String output = exec("cmd.exe", "/c", "netstat -ano -p tcp");
    for (String line : output.split("\\R")) {
      String row = line.trim();
      if (!row.toUpperCase(Locale.ROOT).startsWith("TCP")) {
        continue;
      }
      String[] parts = row.split("\\s+");
      if (parts.length < 5 || !"LISTENING".equalsIgnoreCase(parts[3])) {
        continue;
      }
      long pid = parsePid(parts[4]);
      int port = portOf(parts[1]);
      if (pid <= 0 || port <= 0) {
        continue;
      }
      bindings.add(new Binding(port, pid, addressOf(parts[1]), names.getOrDefault(pid, "")));
    }
    return bindings;
  }

  private static Map<Long, String> windowsProcessNames() {
    Map<Long, String> names = new LinkedHashMap<>();
    String output = exec("cmd.exe", "/c", "tasklist /NH /FO CSV");
    for (String line : output.split("\\R")) {
      String[] columns = line.trim().split("\",\"");
      if (columns.length < 2) {
        continue;
      }
      String name = columns[0].replace("\"", "").trim();
      long pid = parsePid(columns[1].replace("\"", "").trim());
      if (pid > 0 && !name.isEmpty()) {
        names.putIfAbsent(pid, name);
      }
    }
    return names;
  }

  private static int portOf(String address) {
    if (address == null) {
      return -1;
    }
    int colon = address.lastIndexOf(':');
    if (colon < 0 || colon + 1 >= address.length()) {
      return -1;
    }
    String port = address.substring(colon + 1).trim();
    if (!port.matches("\\d+")) {
      return -1;
    }
    int value = Integer.parseInt(port);
    return value >= 1 && value <= 65535 ? value : -1;
  }

  private static String addressOf(String address) {
    if (address == null) {
      return "";
    }
    int colon = address.lastIndexOf(':');
    String host = colon > 0 ? address.substring(0, colon).trim() : address.trim();
    return host.isEmpty() || "*".equals(host) ? "*" : host;
  }

  private static long parsePid(String value) {
    if (value == null || !value.trim().matches("\\d+")) {
      return -1;
    }
    long pid = Long.parseLong(value.trim());
    return pid > 0 && pid != ProcessHandle.current().pid() ? pid : -1;
  }

  private static String exec(String... command) {
    try {
      Process process = new ProcessBuilder(command).redirectErrorStream(true).start();
      String output = new String(process.getInputStream().readAllBytes());
      process.waitFor(10, TimeUnit.SECONDS);
      return output;
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      return "";
    } catch (Exception ignored) {
      return "";
    }
  }

  private record Binding(int port, long pid, String address, String processName) {
  }
}
