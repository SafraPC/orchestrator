package dev.safra.orchestrator.model.docker;

public record DockerEngineStatus(
    boolean cliAvailable,
    String cliPath,
    boolean engineRunning,
    boolean starting,
    String clientVersion,
    String serverVersion,
    String context,
    DockerEngineProvider provider,
    boolean colimaAvailable,
    boolean colimaRunning,
    String colimaProfile,
    String startCommand,
    boolean startCommandConfigured,
    boolean startCommandRequired,
    String message) {

  public DockerEngineStatus withStarting(boolean value) {
    return new DockerEngineStatus(cliAvailable, cliPath, engineRunning, value, clientVersion, serverVersion, context,
        provider, colimaAvailable, colimaRunning, colimaProfile, startCommand, startCommandConfigured,
        startCommandRequired, message);
  }
}
