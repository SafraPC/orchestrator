package dev.safra.orchestrator.model.docker;

public record DockerImageSummary(
    String id,
    String repository,
    String tag,
    String size,
    String createdAt,
    String createdSince,
    boolean dangling,
    boolean inUse) {
}
