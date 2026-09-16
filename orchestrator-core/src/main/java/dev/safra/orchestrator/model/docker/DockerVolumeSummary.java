package dev.safra.orchestrator.model.docker;

public record DockerVolumeSummary(
    String name,
    String driver,
    String mountpoint,
    String scope,
    boolean anonymous,
    boolean inUse) {
}
