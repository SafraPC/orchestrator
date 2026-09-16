package dev.safra.orchestrator.core.runtime.docker;

import dev.safra.orchestrator.core.runtime.workspace.StateStore;
import java.nio.file.Path;
import lombok.Data;

public class DockerSettingsStore {

  @Data
  public static class DockerSettings {
    private String engineStartCommand;
  }

  private final StateStore store;
  private final Path file;
  private DockerSettings settings = new DockerSettings();

  public DockerSettingsStore(StateStore store, Path stateDir) {
    this.store = store;
    this.file = stateDir.resolve("docker.json");
    load();
  }

  public String getStartCommand() {
    String value = settings.getEngineStartCommand();
    return value == null || value.isBlank() ? null : value.trim();
  }

  public void setStartCommand(String command) {
    settings.setEngineStartCommand(command == null || command.isBlank() ? null : command.trim());
    store.writeJson(file, settings);
  }

  private void load() {
    store.readJson(file, DockerSettings.class).ifPresent(loaded -> this.settings = loaded);
  }
}
