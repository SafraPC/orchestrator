package dev.safra.orchestrator.model;

public record ListeningPortView(
    int port,
    long pid,
    String processName,
    String command,
    String address,
    String origin,
    boolean devRelated,
    boolean devPort) {
}
