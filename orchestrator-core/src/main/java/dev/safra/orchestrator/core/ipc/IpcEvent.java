package dev.safra.orchestrator.core.ipc;

import com.fasterxml.jackson.databind.JsonNode;

public record IpcEvent(String event, JsonNode payload) {
}
