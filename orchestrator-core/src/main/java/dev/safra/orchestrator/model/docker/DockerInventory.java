package dev.safra.orchestrator.model.docker;

import java.util.List;

public record DockerInventory(
    boolean available,
    String message,
    List<DockerContainerSummary> containers,
    List<DockerImageSummary> images,
    List<DockerVolumeSummary> volumes,
    List<DockerDiskUsage> diskUsage) {

  public static DockerInventory unavailable(String message) {
    return new DockerInventory(false, message, List.of(), List.of(), List.of(), List.of());
  }
}
