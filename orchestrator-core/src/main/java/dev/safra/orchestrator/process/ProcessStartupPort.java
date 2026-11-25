package dev.safra.orchestrator.process;

import dev.safra.orchestrator.model.ServiceDefinition;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

final class ProcessStartupPort {
  private ProcessStartupPort() {
  }

  static Integer resolve(ServiceDefinition def, boolean isJava) {
    if (!isJava && !"CLI".equalsIgnoreCase(def.getPortStrategy()) && !"ENV".equalsIgnoreCase(def.getPortStrategy())) {
      return null;
    }
    if (!isJava && def.getCustomPort() != null) {
      return def.getCustomPort();
    }
    if (def.getDetectedPort() != null) {
      return def.getDetectedPort();
    }
    if (def.getEnv() == null) {
      return null;
    }
    String port = def.getEnv().getOrDefault("SERVER_PORT", def.getEnv().get("PORT"));
    if (port == null || port.isBlank()) {
      return null;
    }
    try {
      return Integer.parseInt(port.trim());
    } catch (NumberFormatException ignored) {
      return null;
    }
  }

  static Map<String, String> buildEnv(ServiceDefinition def, boolean isJava, Integer startupPort) {
    Map<String, String> env = new HashMap<>();
    if (def.getEnv() != null) {
      env.putAll(def.getEnv());
    }
    if (!isJava) {
      env.remove("SERVER_PORT");
      env.remove("PORT");
      if (def.getCustomPort() != null && startupPort != null && "ENV".equalsIgnoreCase(def.getPortStrategy())) {
        String port = String.valueOf(startupPort);
        env.put("SERVER_PORT", port);
        env.put("PORT", port);
      }
    }
    return env;
  }

  static void validate(ServiceDefinition def, Integer port, List<Integer> protectedPorts) {
    if (port == null || !protectedPorts.contains(port)) {
      return;
    }
    throw new IllegalStateException("Porta " + port
        + " está reservada pelo Orchestrator em modo desenvolvimento. Configure outra porta para o serviço "
        + def.getName() + ".");
  }

  static void ensureFree(Integer port, Long stalePid) {
    if (port == null || PortProcessKiller.isPortFree(port)) {
      return;
    }

    if (stalePid != null) {
      ProcessTreeKiller.killForcibly(stalePid);

      if (waitUntilFree(port)) {
        return;
      }
    }

    throw new IllegalStateException(
        "Porta " + port + " está em uso. Libere-a em Matar porta ou configure outra porta.");
  }

  private static boolean waitUntilFree(int port) {
    for (int attempt = 0; attempt < 10; attempt++) {
      if (PortProcessKiller.isPortFree(port)) {
        return true;
      }

      try {
        Thread.sleep(100);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
        return PortProcessKiller.isPortFree(port);
      }
    }

    return PortProcessKiller.isPortFree(port);
  }

  static List<Integer> parseProtected(String raw) {
    if (raw == null || raw.isBlank()) {
      return List.of();
    }
    List<Integer> ports = new ArrayList<>();
    for (String part : raw.split(",")) {
      try {
        ports.add(Integer.parseInt(part.trim()));
      } catch (NumberFormatException ignored) {
      }
    }
    return ports;
  }
}
