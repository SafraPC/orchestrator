package dev.safra.orchestrator.model.docker;

public record DockerDiskUsage(
    String type,
    String totalCount,
    String active,
    String size,
    String reclaimable) {
}
