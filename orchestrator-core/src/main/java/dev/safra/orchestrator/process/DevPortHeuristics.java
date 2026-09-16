package dev.safra.orchestrator.process;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class DevPortHeuristics {
  private static final int DEV_RANGE_START = 3000;
  private static final int DEV_RANGE_END = 9999;

  private static final Set<Integer> EXTRA_DEV_PORTS = Set.of(
      1337, 1420, 2368, 11211, 15672, 19000, 19006, 24678, 27017, 35729);

  private static final String ORIGIN_SYSTEM = "system";

  private static final Set<String> DEV_RUNTIME_BASES = Set.of(
      "node", "npm", "npx", "yarn", "pnpm", "bun", "deno", "ts-node", "tsx", "nodemon",
      "vite", "next", "ng", "webpack", "esbuild", "rollup", "parcel",
      "java", "javaw", "mvn", "mvnw", "gradle", "gradlew",
      "php", "php-fpm", "artisan", "symfony", "composer",
      "python", "python3", "uvicorn", "gunicorn", "flask", "django",
      "ruby", "rails", "puma", "dotnet", "go", "air", "rustc", "cargo", "dart", "flutter");

  private static final List<OriginRule> ORIGIN_RULES = List.of(
      new OriginRule("cursor", Set.of("cursor", "cursor.exe"), List.of("cursor.app", "cursor helper", "cursor nightly")),
      new OriginRule("vscode", Set.of("code", "code.exe", "codium"),
          List.of("visual studio code", "code helper", "vscodium", "code - insiders", ".vscode-server")),
      new OriginRule("ide", Set.of("idea", "webstorm", "phpstorm", "pycharm", "goland", "rider", "eclipse", "zed"),
          List.of("intellij", "jetbrains", "android studio", "netbeans", "sublime text", "fleet")),
      new OriginRule("terminal",
          Set.of("zsh", "bash", "sh", "dash", "fish", "login", "tmux", "screen",
              "cmd.exe", "powershell.exe", "pwsh", "pwsh.exe", "conhost.exe", "wt.exe"),
          List.of("iterm", "terminal.app", "apple_terminal", "warp.app", "wezterm", "alacritty",
              "kitty.app", "hyper.app", "windowsterminal", "tabby")),
      new OriginRule("docker", Set.of("docker", "dockerd", "podman", "colima", "limactl"),
          List.of("docker desktop", "com.docker")));

  private DevPortHeuristics() {
  }

  public static boolean isDevPort(int port) {
    return (port >= DEV_RANGE_START && port <= DEV_RANGE_END) || EXTRA_DEV_PORTS.contains(port);
  }

  public static String originOf(List<String> ancestryCommands, String processName) {
    List<String> haystack = normalize(ancestryCommands, processName);
    for (OriginRule rule : ORIGIN_RULES) {
      if (haystack.stream().anyMatch(rule::matches)) {
        return rule.origin();
      }
    }
    return isDevRuntime(processName) ? "runtime" : ORIGIN_SYSTEM;
  }

  public static boolean isDevRelated(String origin) {
    return !ORIGIN_SYSTEM.equals(origin);
  }

  public static String commandBase(String command) {
    String value = command == null ? "" : command.toLowerCase(Locale.ROOT).trim();
    if (value.isEmpty()) {
      return "";
    }
    int space = value.indexOf(' ');
    if (space > 0) {
      value = value.substring(0, space);
    }
    int slash = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'));
    if (slash >= 0 && slash + 1 < value.length()) {
      value = value.substring(slash + 1);
    }
    return value;
  }

  private static boolean isDevRuntime(String processName) {
    return DEV_RUNTIME_BASES.contains(commandBase(processName));
  }

  private static List<String> normalize(List<String> ancestryCommands, String processName) {
    List<String> haystack = new ArrayList<>();
    if (processName != null && !processName.isBlank()) {
      haystack.add(processName.toLowerCase(Locale.ROOT));
    }
    for (String command : ancestryCommands) {
      haystack.add(command.toLowerCase(Locale.ROOT));
    }
    return haystack;
  }

  private record OriginRule(String origin, Set<String> commandBases, List<String> pathMarkers) {
    boolean matches(String command) {
      if (commandBases.contains(commandBase(command))) {
        return true;
      }
      return pathMarkers.stream().anyMatch(command::contains);
    }
  }
}
