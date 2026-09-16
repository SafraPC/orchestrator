package dev.safra.orchestrator.core.runtime.docker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.model.docker.DockerEngineStatus;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.BiConsumer;

public class DockerEngineLauncher {
  private static final Duration READY_TIMEOUT = Duration.ofMinutes(5);
  private static final long POLL_INTERVAL_MS = 3000;

  private final ObjectMapper om;
  private final DockerCli cli;
  private final DockerEngineProbe probe;
  private final BiConsumer<String, JsonNode> emitEvent;
  private final AtomicBoolean starting = new AtomicBoolean(false);

  public DockerEngineLauncher(ObjectMapper om, DockerCli cli, DockerEngineProbe probe,
      BiConsumer<String, JsonNode> emitEvent) {
    this.om = om;
    this.cli = cli;
    this.probe = probe;
    this.emitEvent = emitEvent;
  }

  public boolean isStarting() {
    return starting.get();
  }

  public DockerEngineStatus start(String command, String configuredStartCommand) {
    List<String> tokens = tokenize(command);
    if (tokens.isEmpty())
      throw new IllegalArgumentException("Comando de inicialização do Docker é obrigatório.");

    DockerEngineStatus current = probe.probe(configuredStartCommand, starting.get());
    if (current.engineRunning())
      return current;
    if (!starting.compareAndSet(false, true))
      return current;

    Thread worker = new Thread(() -> runStart(tokens, configuredStartCommand), "docker-engine-start");
    worker.setDaemon(true);
    worker.start();
    return current.withStarting(true);
  }

  private void runStart(List<String> tokens, String configuredStartCommand) {
    try {
      emitLog("$ " + String.join(" ", tokens));
      Process process = new ProcessBuilder(resolveExecutable(tokens))
          .redirectErrorStream(true)
          .start();
      streamOutput(process);
      int exitCode = process.waitFor();
      if (exitCode != 0)
        emitLog("Comando finalizou com código " + exitCode + ".");
      awaitEngine(configuredStartCommand);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      emitLog("Inicialização interrompida.");
    } catch (Exception e) {
      emitLog("Falha ao iniciar o Docker: " + (e.getMessage() == null ? e.toString() : e.getMessage()));
    } finally {
      starting.set(false);
      emitStatus(probe.probe(configuredStartCommand, false));
    }
  }

  private void streamOutput(Process process) {
    try (BufferedReader reader = new BufferedReader(
        new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        String trimmed = line.strip();
        if (!trimmed.isEmpty())
          emitLog(trimmed);
      }
    } catch (Exception ignored) {
    }
  }

  private void awaitEngine(String configuredStartCommand) throws InterruptedException {
    long deadline = System.currentTimeMillis() + READY_TIMEOUT.toMillis();
    while (System.currentTimeMillis() < deadline) {
      DockerEngineStatus status = probe.probe(configuredStartCommand, true);
      if (status.engineRunning()) {
        emitLog("Docker disponível" + (status.serverVersion() == null ? "." : " (server " + status.serverVersion() + ")."));
        return;
      }
      emitStatus(status);
      Thread.sleep(POLL_INTERVAL_MS);
    }
    emitLog("Tempo limite aguardando o daemon do Docker responder.");
  }

  private List<String> resolveExecutable(List<String> tokens) {
    List<String> command = new ArrayList<>(tokens);
    String resolved = cli.resolveBinary(command.get(0));
    if (resolved != null)
      command.set(0, resolved);
    return command;
  }

  private void emitLog(String line) {
    emitEvent.accept("dockerEngineLog", om.createObjectNode().put("line", line));
  }

  private void emitStatus(DockerEngineStatus status) {
    emitEvent.accept("dockerEngine", om.valueToTree(status));
  }

  static List<String> tokenize(String command) {
    List<String> tokens = new ArrayList<>();
    if (command == null)
      return tokens;
    StringBuilder current = new StringBuilder();
    char quote = 0;
    boolean hasToken = false;
    for (char c : command.trim().toCharArray()) {
      if (quote != 0) {
        if (c == quote)
          quote = 0;
        else
          current.append(c);
        continue;
      }
      if (c == '"' || c == '\'') {
        quote = c;
        hasToken = true;
        continue;
      }
      if (Character.isWhitespace(c)) {
        if (hasToken || current.length() > 0) {
          tokens.add(current.toString());
          current.setLength(0);
          hasToken = false;
        }
        continue;
      }
      current.append(c);
    }
    if (hasToken || current.length() > 0)
      tokens.add(current.toString());
    return tokens;
  }
}
