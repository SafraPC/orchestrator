package dev.safra.orchestrator.core.runtime.discovery.php;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class DockerComposeSupport {
  private static final List<String> COMPOSE_FILES = List.of(
      "compose.yaml", "compose.yml", "docker-compose.yaml", "docker-compose.yml");
  private static final List<String> PREFERRED_SERVICES = List.of("app", "web", "php", "apache", "nginx");
  private static final Pattern PORT_MAPPING = Pattern.compile(
      "^\\s*-\\s*[\"']?(?:\\[?\\d+\\.\\d+\\.\\d+\\.\\d+:)?(\\d{2,5}):(\\d{2,5})(?:/(?:tcp|udp))?[\"']?\\s*$");

  private DockerComposeSupport() {
  }

  public static boolean hasComposeFile(Path dir) {
    return resolveComposeFile(dir) != null;
  }

  public static Path resolveComposeFile(Path dir) {
    if (dir == null || !Files.isDirectory(dir)) {
      return null;
    }
    for (String name : COMPOSE_FILES) {
      Path candidate = dir.resolve(name);
      if (Files.isRegularFile(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  public static Integer readPublishedHttpPort(Path dir) {
    Path composeFile = resolveComposeFile(dir);
    if (composeFile == null) {
      return null;
    }
    try {
      List<String> lines = Files.readAllLines(composeFile, StandardCharsets.UTF_8);
      Integer preferred = findPortForPreferredService(lines);
      if (preferred != null) {
        return preferred;
      }
      return findFirstHostPort(lines);
    } catch (Exception ignored) {
      return null;
    }
  }

  public static List<String> upCommand() {
    return List.of("docker", "compose", "up");
  }

  private static Integer findPortForPreferredService(List<String> lines) {
    String currentService = null;
    boolean inPorts = false;
    int portsIndent = -1;
    for (String raw : lines) {
      String line = stripComment(raw);
      if (line.isBlank()) {
        continue;
      }
      int indent = leadingSpaces(raw);
      if (indent == 2 && line.endsWith(":") && !line.startsWith("-")) {
        currentService = line.substring(0, line.length() - 1).trim().toLowerCase(Locale.ROOT);
        inPorts = false;
        portsIndent = -1;
        continue;
      }
      if (indent == 4 && line.equals("ports:")) {
        inPorts = true;
        portsIndent = indent;
        continue;
      }
      if (inPorts && indent <= portsIndent) {
        inPorts = false;
      }
      if (!inPorts || currentService == null) {
        continue;
      }
      Integer port = parseHostPort(line);
      if (port != null && PREFERRED_SERVICES.contains(currentService)) {
        return port;
      }
    }
    return null;
  }

  private static Integer findFirstHostPort(List<String> lines) {
    boolean inPorts = false;
    int portsIndent = -1;
    for (String raw : lines) {
      String line = stripComment(raw);
      if (line.isBlank()) {
        continue;
      }
      int indent = leadingSpaces(raw);
      if (indent >= 2 && line.equals("ports:")) {
        inPorts = true;
        portsIndent = indent;
        continue;
      }
      if (inPorts && indent <= portsIndent) {
        inPorts = false;
      }
      if (!inPorts) {
        continue;
      }
      Integer port = parseHostPort(line);
      if (port != null && !isDatabasePort(port)) {
        return port;
      }
    }
    for (String raw : lines) {
      Integer port = parseHostPort(stripComment(raw));
      if (port != null && !isDatabasePort(port)) {
        return port;
      }
    }
    return null;
  }

  private static boolean isDatabasePort(int port) {
    return port == 3306 || port == 5432 || port == 27017 || port == 6379
        || (port >= 3307 && port <= 3319);
  }

  private static Integer parseHostPort(String line) {
    Matcher matcher = PORT_MAPPING.matcher(line);
    if (!matcher.matches()) {
      return null;
    }
    try {
      return Integer.parseInt(matcher.group(1));
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  private static String stripComment(String line) {
    if (line == null) {
      return "";
    }
    int hash = line.indexOf('#');
    if (hash < 0) {
      return line;
    }
    return line.substring(0, hash);
  }

  private static int leadingSpaces(String line) {
    int count = 0;
    while (count < line.length() && line.charAt(count) == ' ') {
      count++;
    }
    return count;
  }
}
