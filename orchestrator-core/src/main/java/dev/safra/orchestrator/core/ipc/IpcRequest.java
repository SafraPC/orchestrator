package dev.safra.orchestrator.core.ipc;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
public class IpcRequest {
  private String id;
  private String method;
  private JsonNode params;
}

