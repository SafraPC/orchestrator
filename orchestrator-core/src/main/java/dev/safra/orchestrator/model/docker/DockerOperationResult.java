package dev.safra.orchestrator.model.docker;

public record DockerOperationResult(
    String kind,
    String id,
    boolean ok,
    String message) {

  public static DockerOperationResult ok(String kind, String id, String message) {
    return new DockerOperationResult(kind, id, true, message);
  }

  public static DockerOperationResult failed(String kind, String id, String message) {
    return new DockerOperationResult(kind, id, false, message);
  }
}
