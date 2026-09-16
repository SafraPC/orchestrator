package dev.safra.orchestrator.model.docker;

public record DockerContainerSummary(
    String id,
    String name,
    String image,
    String command,
    String state,
    String status,
    String ports,
    String createdAt,
    String runningFor,
    String size,
    String project,
    String service,
    int localVolumes) {
}
