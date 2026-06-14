package dev.safra.orchestrator.core.runtime;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public final class DevServerPortDetector {
  private static final Pattern CLI_PORT_PATTERN = Pattern.compile(
      "(?:--port=|--PORT=|--port\\s+|--PORT\\s+|-p\\s+|-l\\s+|127\\.0\\.0\\.1:|localhost:)(\\d+)");
  private static final Pattern VITE_PORT_PATTERN = Pattern.compile("(?m)\\bport\\s*:\\s*(\\d+)");
  private static final Pattern VITE_PROXY_TARGET_PATTERN = Pattern.compile(
      "target\\s*:\\s*['\"]https?://(?:localhost|127\\.0\\.0\\.1):(\\d+)");
  private static final List<String> VITE_CONFIG_FILES = List.of(
      "vite.config.ts",
      "vite.config.js",
      "vite.config.mts",
      "vite.config.mjs",
      "vite.config.cts",
      "vite.config.cjs");

  private DevServerPortDetector() {
  }

  public static Integer parsePort(String text) {
    if (text == null || text.isBlank()) {
      return null;
    }
    Matcher match = CLI_PORT_PATTERN.matcher(text);
    if (match.find()) {
      return parseInt(match.group(1));
    }
    return null;
  }

  public static Integer readEnvPort(Path dir, List<String> keys) {
    Path envFile = dir.resolve(".env");
    if (!Files.isRegularFile(envFile)) {
      return null;
    }
    try {
      for (String line : Files.readAllLines(envFile)) {
        String trimmed = line.trim();
        if (trimmed.isBlank() || trimmed.startsWith("#")) {
          continue;
        }
        int equals = trimmed.indexOf('=');
        if (equals <= 0) {
          continue;
        }
        String key = trimmed.substring(0, equals).trim();
        if (!keys.contains(key)) {
          continue;
        }
        Integer port = parseInt(stripQuotes(trimmed.substring(equals + 1).trim()));
        if (port != null) {
          return port;
        }
      }
    } catch (Exception ignored) {
    }
    return null;
  }

  public static Integer readViteServerPort(Path dir) {
    for (Path config : viteConfigFiles(dir)) {
      Integer port = readFirstMatch(config, VITE_PORT_PATTERN);
      if (port != null) {
        return port;
      }
    }
    return null;
  }

  public static Integer readSiblingFrontendProxyPort(Path backendDir) {
    Path parent = backendDir.getParent();
    if (parent == null || !Files.isDirectory(parent)) {
      return null;
    }
    try (Stream<Path> configs = Files.walk(parent, 3)) {
      Optional<Integer> port = configs
          .filter(Files::isRegularFile)
          .filter(DevServerPortDetector::isViteConfig)
          .filter(config -> !config.startsWith(backendDir))
          .map(config -> readFirstMatch(config, VITE_PROXY_TARGET_PATTERN))
          .filter(value -> value != null)
          .findFirst();
      return port.orElse(null);
    } catch (Exception ignored) {
      return null;
    }
  }

  private static List<Path> viteConfigFiles(Path dir) {
    return VITE_CONFIG_FILES.stream()
        .map(dir::resolve)
        .filter(Files::isRegularFile)
        .toList();
  }

  private static boolean isViteConfig(Path path) {
    String fileName = path.getFileName() == null ? "" : path.getFileName().toString();
    return VITE_CONFIG_FILES.contains(fileName);
  }

  private static Integer readFirstMatch(Path file, Pattern pattern) {
    try {
      String content = Files.readString(file);
      Matcher match = pattern.matcher(content);
      if (match.find()) {
        return parseInt(match.group(1));
      }
    } catch (Exception ignored) {
    }
    return null;
  }

  private static String stripQuotes(String value) {
    if (value.length() >= 2
        && ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'")))) {
      return value.substring(1, value.length() - 1);
    }
    return value;
  }

  private static Integer parseInt(String value) {
    try {
      return Integer.parseInt(value.trim());
    } catch (Exception ignored) {
      return null;
    }
  }
}
