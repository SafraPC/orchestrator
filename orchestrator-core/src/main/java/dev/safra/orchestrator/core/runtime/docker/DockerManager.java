package dev.safra.orchestrator.core.runtime.docker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.runtime.workspace.StateStore;
import dev.safra.orchestrator.model.docker.DockerEngineStatus;
import dev.safra.orchestrator.model.docker.DockerInventory;
import dev.safra.orchestrator.model.docker.DockerOperationResult;
import dev.safra.orchestrator.model.docker.DockerResourceKind;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.function.BiConsumer;

public class DockerManager {
  private final ObjectMapper om;
  private final DockerCli cli;
  private final DockerEngineProbe probe;
  private final DockerEngineLauncher launcher;
  private final DockerInventoryReader inventoryReader;
  private final DockerResourceActions actions;
  private final DockerSettingsStore settings;
  private final BiConsumer<String, JsonNode> emitEvent;

  public DockerManager(ObjectMapper om, StateStore store, Path stateDir, BiConsumer<String, JsonNode> emitEvent) {
    this.om = om;
    this.emitEvent = emitEvent;
    this.cli = new DockerCli();
    this.probe = new DockerEngineProbe(om, cli);
    this.launcher = new DockerEngineLauncher(om, cli, probe, emitEvent);
    this.inventoryReader = new DockerInventoryReader(om, cli);
    this.actions = new DockerResourceActions(cli);
    this.settings = new DockerSettingsStore(store, stateDir);
  }

  public JsonNode getStatus() {
    return om.valueToTree(currentStatus());
  }

  public JsonNode startEngine(String requestedCommand) {
    String command = requestedCommand == null || requestedCommand.isBlank()
        ? settings.getStartCommand()
        : requestedCommand.trim();
    if (command == null || command.isBlank()) {
      DockerEngineStatus fallback = currentStatus();
      command = fallback.startCommand();
    }
    if (command == null || command.isBlank())
      throw new IllegalArgumentException(
          "Nenhum comando de inicialização definido. Configure o comando de start do Docker.");
    if (requestedCommand != null && !requestedCommand.isBlank())
      settings.setStartCommand(command);
    DockerEngineStatus status = launcher.start(command, settings.getStartCommand());
    emitEvent.accept("dockerEngine", om.valueToTree(status));
    return om.valueToTree(status);
  }

  public JsonNode setStartCommand(String command) {
    settings.setStartCommand(command);
    return getStatus();
  }

  public JsonNode listResources() {
    DockerEngineStatus status = currentStatus();
    if (!status.engineRunning()) {
      String message = status.message() == null ? "Docker não está disponível." : status.message();
      return om.valueToTree(DockerInventory.unavailable(message));
    }
    try {
      return om.valueToTree(inventoryReader.read());
    } catch (Exception e) {
      String message = e.getMessage() == null ? e.toString() : e.getMessage();
      return om.valueToTree(DockerInventory.unavailable(message));
    }
  }

  public JsonNode startContainer(String id) {
    return om.valueToTree(actions.startContainer(requireId(id)));
  }

  public JsonNode stopContainer(String id) {
    return om.valueToTree(actions.stopContainer(requireId(id)));
  }

  public JsonNode restartContainer(String id) {
    return om.valueToTree(actions.restartContainer(requireId(id)));
  }

  public JsonNode removeResources(JsonNode targets, boolean force) {
    List<DockerResourceActions.ResourceTarget> parsed = parseTargets(targets);
    if (parsed.isEmpty())
      throw new IllegalArgumentException("params.targets é obrigatório");
    List<DockerOperationResult> results = actions.remove(parsed, force);
    return om.valueToTree(results);
  }

  public JsonNode prune(List<String> scopes, boolean removeUnusedImages) {
    if (scopes == null || scopes.isEmpty())
      throw new IllegalArgumentException("params.scopes é obrigatório");
    return om.valueToTree(actions.prune(scopes, removeUnusedImages));
  }

  private DockerEngineStatus currentStatus() {
    return probe.probe(settings.getStartCommand(), launcher.isStarting());
  }

  private List<DockerResourceActions.ResourceTarget> parseTargets(JsonNode targets) {
    List<DockerResourceActions.ResourceTarget> parsed = new ArrayList<>();
    if (targets == null || !targets.isArray())
      return parsed;
    for (JsonNode node : targets) {
      String kind = node.path("kind").asText("");
      String id = node.path("id").asText("");
      if (id.isBlank())
        throw new IllegalArgumentException("targets[].id é obrigatório");
      parsed.add(new DockerResourceActions.ResourceTarget(DockerResourceKind.parse(kind), id));
    }
    return parsed;
  }

  private String requireId(String id) {
    if (id == null || id.isBlank())
      throw new IllegalArgumentException("params.id é obrigatório");
    return id.trim();
  }
}
