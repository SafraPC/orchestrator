package dev.safra.orchestrator.core.ipc;

import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.JsonNode;

public final class IpcParams {
  private IpcParams() {}

  public static String reqName(JsonNode params) {
    String name = text(params, "name");
    if (name == null || name.isBlank())
      throw new IllegalArgumentException("params.name é obrigatório");
    return name;
  }

  public static String reqSubId(JsonNode params) {
    String subId = text(params, "subId");
    if (subId == null || subId.isBlank())
      throw new IllegalArgumentException("params.subId é obrigatório");
    return subId;
  }

  public static String reqRoot(JsonNode params) {
    String root = text(params, "root");
    if (root == null || root.isBlank())
      throw new IllegalArgumentException("params.root é obrigatório");
    return root;
  }

  public static String text(JsonNode params, String field) {
    return params != null && params.hasNonNull(field) ? params.get(field).asText() : null;
  }

  public static String textOr(JsonNode params, String field, String fallback) {
    String value = text(params, field);
    return value != null ? value : fallback;
  }

  public static boolean bool(JsonNode params, String field, boolean fallback) {
    return params != null && params.has(field) && params.get(field).asBoolean(fallback);
  }

  public static int intOr(JsonNode params, String field, int fallback) {
    return params != null && params.has(field) ? params.get(field).asInt(fallback) : fallback;
  }

  public static int reqPort(JsonNode params) {
    int port = intOr(params, "port", -1);
    if (port < 1 || port > 65535)
      throw new IllegalArgumentException("params.port inválida");
    return port;
  }

  public static List<String> stringList(JsonNode params, String field) {
    List<String> out = new ArrayList<>();
    if (params != null && params.has(field) && params.get(field).isArray()) {
      for (JsonNode node : params.get(field))
        out.add(node.asText());
    }
    return out;
  }
}
