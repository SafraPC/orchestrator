package dev.safra.orchestrator.core.runtime.discovery.java;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.Set;

import dev.safra.orchestrator.core.runtime.discovery.ConfigText;
import dev.safra.orchestrator.core.runtime.discovery.DeclaredPortFiles;
import dev.safra.orchestrator.core.runtime.discovery.PortDeclaration;
import dev.safra.orchestrator.core.runtime.workspace.StateStore;

public class PortExtractor {
  private static final int MAX_CONFIG_BYTES = 65_536;
  private static final Set<String> PROPERTY_KEYS = Set.of("server.port", "SERVER_PORT");

  private final StateStore store;

  public PortExtractor(StateStore store) {
    this.store = store;
  }

  public Optional<Integer> extract(Path serviceDir) {
    return locate(serviceDir).map(PortDeclaration::port);
  }

  public Optional<PortDeclaration> locate(Path serviceDir) {
    if (serviceDir == null || !Files.isDirectory(serviceDir)) {
      return Optional.empty();
    }

    for (String relative : DeclaredPortFiles.springConfigFiles()) {
      Path file = serviceDir.resolve(relative);

      if (!Files.isRegularFile(file)) {
        continue;
      }

      String content = store.readSmallText(file, MAX_CONFIG_BYTES);

      if (content == null || content.isBlank()) {
        continue;
      }

      Optional<Integer> port = isProperties(file) ? portInProperties(content) : portInYaml(content);

      if (port.isPresent()) {
        return Optional.of(PortDeclaration.of(port.get(), file));
      }
    }

    return Optional.empty();
  }

  private static boolean isProperties(Path file) {
    String name = file.getFileName().toString().toLowerCase();
    return name.endsWith(".properties");
  }

  private static Optional<Integer> portInProperties(String content) {
    for (String raw : content.split("\n")) {
      String line = raw.trim();

      if (line.isEmpty() || line.startsWith("#")) {
        continue;
      }

      String[] parts = line.split("=", 2);

      if (parts.length < 2) {
        continue;
      }

      if (!PROPERTY_KEYS.contains(parts[0].trim())) {
        continue;
      }

      Optional<Integer> port = parsePort(parts[1].trim().split("#")[0].trim());

      if (port.isPresent()) {
        return port;
      }
    }

    return Optional.empty();
  }

  private static Optional<Integer> portInYaml(String content) {
    String[] lines = content.split("\n");
    boolean inServerSection = false;
    int serverIndent = -1;

    for (String line : lines) {
      String trimmed = line.trim();

      if (trimmed.isEmpty() || trimmed.startsWith("#")) {
        continue;
      }

      if (trimmed.equals("---")) {
        inServerSection = false;
        serverIndent = -1;
        continue;
      }

      int indent = leadingIndent(line);

      if (trimmed.startsWith("server:")) {
        inServerSection = true;
        serverIndent = indent;
        continue;
      }

      if (!inServerSection) {
        continue;
      }

      if (indent <= serverIndent && !trimmed.startsWith("-")) {
        inServerSection = false;
        continue;
      }

      if (!trimmed.startsWith("port:") && !trimmed.startsWith("port ")) {
        continue;
      }

      String portStr = ConfigText.stripQuotes(trimmed.replaceFirst("^port:?", "").trim().split("#")[0].trim());
      Optional<Integer> port = parsePort(portStr);

      if (port.isPresent()) {
        return port;
      }
    }

    return Optional.empty();
  }

  private static int leadingIndent(String line) {
    int indent = 0;

    for (int i = 0; i < line.length() && (line.charAt(i) == ' ' || line.charAt(i) == '\t'); i++) {
      indent++;
    }

    return indent;
  }

  private static Optional<Integer> parsePort(String raw) {
    if (raw == null || raw.isBlank()) {
      return Optional.empty();
    }

    try {
      return Optional.of(Integer.parseInt(raw.trim()));
    } catch (NumberFormatException ignored) {
      return Optional.empty();
    }
  }

}
