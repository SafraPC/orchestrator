package dev.safra.orchestrator.core.ipc;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

@Data
public class IpcResponse {
  private String id;
  private boolean ok;
  private JsonNode result;
  private IpcError error;

  public static IpcResponse ok(String id, JsonNode result) {
    IpcResponse r = new IpcResponse();
    r.setId(id);
    r.setOk(true);
    r.setResult(result);
    return r;
  }

  public static IpcResponse err(String id, String code, String message) {
    IpcResponse r = new IpcResponse();
    r.setId(id);
    r.setOk(false);
    r.setError(new IpcError(code, message));
    return r;
  }
}

