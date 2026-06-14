package dev.safra.orchestrator.process;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Stream;

import lombok.Data;

public class PhpVersionDetector {
  private static final Pattern VERSION_PATTERN = Pattern.compile("PHP\\s+(\\d+\\.\\d+)(?:\\.\\d+)?");

  @Data
  public static class PhpInfo {
    private final String version;
    private final String fullVersion;
    private final String path;
    private final String source;

    public PhpInfo(String version, String fullVersion, String path, String source) {
      this.version = version;
      this.fullVersion = fullVersion;
      this.path = path;
      this.source = source;
    }
  }

  public List<PhpInfo> detectAll() {
    Map<String, PhpInfo> byPath = new LinkedHashMap<>();
    scanHomebrew(byPath);
    scanPhpenv(byPath);
    scanWindowsCommon(byPath);
    probeCommand("php", "PATH", byPath);
    List<PhpInfo> result = new ArrayList<>(byPath.values());
    result.sort(Comparator.comparing(PhpInfo::getVersion));
    return result;
  }

  public String resolvePhpBinary(String requiredVersion) {
    if (requiredVersion == null || requiredVersion.isBlank()) {
      return null;
    }
    String major = requiredVersion.trim();
    for (PhpInfo info : detectAll()) {
      if (info.getVersion().equals(major) || info.getVersion().startsWith(major + ".")) {
        return info.getPath();
      }
    }
    return null;
  }

  private void scanHomebrew(Map<String, PhpInfo> out) {
    String[] prefixes = {"/opt/homebrew/opt", "/usr/local/opt"};
    for (String prefix : prefixes) {
      Path base = Path.of(prefix);
      if (!Files.isDirectory(base)) {
        continue;
      }
      try (Stream<Path> dirs = Files.list(base)) {
        dirs.filter(Files::isDirectory)
            .filter(d -> d.getFileName().toString().startsWith("php"))
            .forEach(d -> probeAndAdd(d.resolve("bin/php"), "Homebrew", out));
      } catch (Exception ignored) {
      }
    }
  }

  private void scanPhpenv(Map<String, PhpInfo> out) {
    Path root = Path.of(System.getProperty("user.home"), ".phpenv", "versions");
    if (!Files.isDirectory(root)) {
      return;
    }
    try (Stream<Path> dirs = Files.list(root)) {
      dirs.filter(Files::isDirectory).forEach(d -> probeAndAdd(d.resolve("bin/php"), "phpenv", out));
    } catch (Exception ignored) {
    }
  }

  private void scanWindowsCommon(Map<String, PhpInfo> out) {
    if (!System.getProperty("os.name").toLowerCase().contains("win")) {
      return;
    }
  }

  private void probeCommand(String command, String source, Map<String, PhpInfo> out) {
    try {
      Process p = new ProcessBuilder(command, "-v").redirectErrorStream(true).start();
      String output = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
      if (p.waitFor() != 0) {
        return;
      }
      Matcher matcher = VERSION_PATTERN.matcher(output);
      if (!matcher.find()) {
        return;
      }
      String version = matcher.group(1);
      String resolved = resolveExecutable(command);
      addInfo(out, version, output.trim(), resolved, source);
    } catch (Exception ignored) {
    }
  }

  private void probeAndAdd(Path phpBin, String source, Map<String, PhpInfo> out) {
    if (!Files.isRegularFile(phpBin)) {
      return;
    }
    try {
      Process p = new ProcessBuilder(phpBin.toString(), "-v").redirectErrorStream(true).start();
      String output = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
      if (p.waitFor() != 0) {
        return;
      }
      Matcher matcher = VERSION_PATTERN.matcher(output);
      if (!matcher.find()) {
        return;
      }
      addInfo(out, matcher.group(1), output.trim(), phpBin.toAbsolutePath().normalize().toString(), source);
    } catch (Exception ignored) {
    }
  }

  private String resolveExecutable(String command) {
    boolean windows = System.getProperty("os.name").toLowerCase().contains("win");
    String lookup = windows ? "where" : "which";
    try {
      Process p = new ProcessBuilder(lookup, command).redirectErrorStream(true).start();
      String output = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
      if (p.waitFor() == 0 && !output.isBlank()) {
        return output.lines().findFirst().orElse(command);
      }
    } catch (Exception ignored) {
    }
    return command;
  }

  private void addInfo(Map<String, PhpInfo> out, String version, String fullVersion, String path, String source) {
    String key = path.toLowerCase();
    if (!out.containsKey(key)) {
      out.put(key, new PhpInfo(version, fullVersion, path, source));
    }
  }
}
