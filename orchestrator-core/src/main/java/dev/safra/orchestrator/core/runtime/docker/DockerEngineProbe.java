package dev.safra.orchestrator.core.runtime.docker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.model.docker.DockerEngineProvider;
import dev.safra.orchestrator.model.docker.DockerEngineStatus;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

public class DockerEngineProbe {
  private static final Duration FAST = Duration.ofSeconds(10);
  private static final String OS = System.getProperty("os.name", "").toLowerCase();

  private final ObjectMapper om;
  private final DockerCli cli;

  public DockerEngineProbe(ObjectMapper om, DockerCli cli) {
    this.om = om;
    this.cli = cli;
  }

  public DockerEngineStatus probe(String configuredStartCommand, boolean starting) {
    ColimaState colima = probeColima();
    DockerEngineProvider provider = resolveProvider(colima.available());
    boolean configured = configuredStartCommand != null && !configuredStartCommand.isBlank();
    String startCommand = configured ? configuredStartCommand.trim() : defaultStartCommand(provider, colima.profile());
    boolean startCommandRequired = colima.available() && !configured;

    String cliPath = cli.resolveBinary("docker");
    if (cliPath == null) {
      return status(false, null, false, starting, null, null, null, provider, colima, startCommand, configured,
          startCommandRequired,
          "Docker CLI não encontrado. Instale o Docker e garanta que o comando esteja disponível no PATH.");
    }

    VersionInfo version = readVersion(cli.getContext());
    if (version.serverVersion() == null) {
      VersionInfo recovered = recoverThroughContexts();
      if (recovered != null)
        version = recovered;
    }

    boolean running = version.serverVersion() != null;
    if (running)
      cli.setContext(version.context());

    return status(true, cliPath, running, starting, version.clientVersion(), version.serverVersion(),
        version.context(), provider, colima, startCommand, configured, startCommandRequired,
        running ? null : offlineMessage(provider, colima));
  }

  private VersionInfo readVersion(String context) {
    DockerCli.Result result = cli.dockerWithContext(context, List.of("version", "--format", "{{json .}}"), FAST);
    String client = null;
    String server = null;
    try {
      JsonNode root = om.readTree(result.stdout());
      client = textAt(root, "Client", "Version");
      server = textAt(root, "Server", "Version");
    } catch (Exception ignored) {
    }
    return new VersionInfo(client, server, context);
  }

  private VersionInfo recoverThroughContexts() {
    for (String candidate : listContexts()) {
      VersionInfo info = readVersion(candidate);
      if (info.serverVersion() != null)
        return info;
    }
    return null;
  }

  private List<String> listContexts() {
    List<String> names = new ArrayList<>();
    DockerCli.Result result = cli.dockerWithContext(null, List.of("context", "ls", "--format", "{{json .}}"), FAST);
    if (!result.ok())
      return names;
    for (String line : result.stdout().split("\\R")) {
      if (line.isBlank())
        continue;
      try {
        JsonNode node = om.readTree(line);
        String name = node.path("Name").asText("");
        if (!name.isBlank() && !name.equals(cli.getContext()))
          names.add(name);
      } catch (Exception ignored) {
      }
    }
    return names;
  }

  private ColimaState probeColima() {
    if (!cli.isAvailable("colima"))
      return new ColimaState(false, false, null);
    DockerCli.Result result = cli.colima(List.of("list", "--json"), FAST);
    if (!result.ok())
      return new ColimaState(true, false, null);
    String profile = null;
    boolean running = false;
    for (String line : result.stdout().split("\\R")) {
      if (line.isBlank())
        continue;
      try {
        JsonNode node = om.readTree(line);
        String name = node.path("name").asText("");
        boolean isRunning = "Running".equalsIgnoreCase(node.path("status").asText(""));
        if (profile == null || isRunning) {
          profile = name.isBlank() ? profile : name;
          running = running || isRunning;
        }
      } catch (Exception ignored) {
      }
    }
    return new ColimaState(true, running, profile);
  }

  private DockerEngineProvider resolveProvider(boolean colimaAvailable) {
    if (colimaAvailable)
      return DockerEngineProvider.COLIMA;
    if (OS.contains("mac") || OS.contains("win"))
      return DockerEngineProvider.DOCKER_DESKTOP;
    if (OS.contains("nux") || OS.contains("nix"))
      return DockerEngineProvider.SYSTEMD;
    return DockerEngineProvider.UNKNOWN;
  }

  private String defaultStartCommand(DockerEngineProvider provider, String profile) {
    return switch (provider) {
      case COLIMA -> profile == null || profile.isBlank() || "default".equals(profile)
          ? "colima start"
          : "colima start " + profile;
      case DOCKER_DESKTOP -> OS.contains("win")
          ? "\"C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe\""
          : "open -a Docker";
      case SYSTEMD -> "systemctl start docker";
      case UNKNOWN -> "";
    };
  }

  private String offlineMessage(DockerEngineProvider provider, ColimaState colima) {
    if (provider == DockerEngineProvider.COLIMA && !colima.running())
      return "Colima detectado mas parado. Inicie a VM para usar o Docker.";
    if (provider == DockerEngineProvider.COLIMA)
      return "Colima está rodando mas o daemon do Docker não respondeu. Verifique o contexto do Docker.";
    return "Daemon do Docker não está respondendo. Inicie o Docker para continuar.";
  }

  private String textAt(JsonNode root, String parent, String field) {
    JsonNode node = root.path(parent).path(field);
    return node.isMissingNode() || node.isNull() || node.asText("").isBlank() ? null : node.asText();
  }

  private DockerEngineStatus status(boolean cliAvailable, String cliPath, boolean running, boolean starting,
      String clientVersion, String serverVersion, String context, DockerEngineProvider provider, ColimaState colima,
      String startCommand, boolean configured, boolean startCommandRequired, String message) {
    return new DockerEngineStatus(cliAvailable, cliPath, running, starting, clientVersion, serverVersion, context,
        provider, colima.available(), colima.running(), colima.profile(), startCommand, configured,
        startCommandRequired && !running, message);
  }

  private record VersionInfo(String clientVersion, String serverVersion, String context) {
  }

  private record ColimaState(boolean available, boolean running, String profile) {
  }
}
