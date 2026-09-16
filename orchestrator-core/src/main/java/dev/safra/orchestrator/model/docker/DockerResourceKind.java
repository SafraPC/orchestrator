package dev.safra.orchestrator.model.docker;

import java.util.Locale;

public enum DockerResourceKind {
  CONTAINER,
  IMAGE,
  VOLUME;

  public static DockerResourceKind parse(String raw) {
    if (raw == null || raw.isBlank())
      throw new IllegalArgumentException("kind do recurso Docker é obrigatório");
    String normalized = raw.trim().toUpperCase(Locale.ROOT);
    for (DockerResourceKind kind : values()) {
      if (kind.name().equals(normalized))
        return kind;
    }
    throw new IllegalArgumentException("kind de recurso Docker inválido: " + raw);
  }
}
