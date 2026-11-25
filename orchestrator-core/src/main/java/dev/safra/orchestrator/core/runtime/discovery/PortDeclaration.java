package dev.safra.orchestrator.core.runtime.discovery;

import java.nio.file.Path;

public record PortDeclaration(Integer port, Path file) {
  public static PortDeclaration of(int port, Path file) {
    return new PortDeclaration(port, file);
  }

  public String filePath() {
    if (file == null) {
      return null;
    }

    return file.toAbsolutePath().normalize().toString();
  }
}
