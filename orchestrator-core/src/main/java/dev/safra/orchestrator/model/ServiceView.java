package dev.safra.orchestrator.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ServiceView(
    String name,
    String path,
    List<String> command,
    String logFile,
    Map<String, String> env,
    Integer detectedPort,
    Integer customPort,
    String portStrategy,
    String javaHome,
    String javaVersion,
    String phpHome,
    String phpVersion,
    List<String> containerIds,
    ProjectType projectType,
    List<String> availableScripts,
    String selectedScript,
    Boolean useMvnWrapper,
    Boolean hasMvnWrapper,
    Long pid,
    ServiceStatus status,
    Instant lastStartAt,
    Instant lastStopAt,
    String lastError) {
}
