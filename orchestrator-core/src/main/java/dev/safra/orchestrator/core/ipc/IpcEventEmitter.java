package dev.safra.orchestrator.core.ipc;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@FunctionalInterface
public interface IpcEventEmitter {
  void emit(ObjectMapper om, String event, JsonNode payload);
}
