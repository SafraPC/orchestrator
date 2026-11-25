package dev.safra.orchestrator.core.runtime.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.runtime.logs.LogManager;
import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.model.ServiceRuntime;
import dev.safra.orchestrator.model.ServiceStatus;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.function.BiConsumer;

final class ServiceHealthCheck {
  private static final int MAX_TAIL_BYTES = 65_536;
  static final long CRASH_WINDOW_MS = 2_500;

  private ServiceHealthCheck() {
  }

  static boolean stillCurrent(String name, long pid, ServiceDescriptor sd, Map<String, ServiceDescriptor> services) {
    if (sd == null || services == null || name == null) {
      return false;
    }

    ServiceDescriptor current = services.get(name);

    if (current == null || current != sd) {
      return false;
    }

    ServiceRuntime runtime = sd.getRuntime();

    if (runtime == null) {
      return false;
    }

    Long tracked = runtime.getPid();

    return tracked != null && tracked == pid;
  }

  static void onProcessExit(String name, long pid, ServiceDescriptor sd, LogManager logManager,
      Runnable persistRuntime, Map<String, ServiceDescriptor> services,
      BiConsumer<String, JsonNode> emitEvent, ObjectMapper om) {
    if (!stillCurrent(name, pid, sd, services)) {
      return;
    }

    ServiceRuntime rt = sd.getRuntime();
    boolean crashedOnStart = rt.getLastStartAt() != null
        && Duration.between(rt.getLastStartAt(), Instant.now()).toMillis() < CRASH_WINDOW_MS;

    if (crashedOnStart) {
      rt.setStatus(ServiceStatus.ERROR);
      rt.setLastError("Processo terminou após iniciar. Verifique os logs.");
      emitCrashLog(name, sd, logManager);
    } else {
      rt.setStatus(ServiceStatus.STOPPED);
      rt.setLastStopAt(Instant.now());
    }

    rt.setPid(null);
    persistRuntime.run();

    ServiceDescriptor current = services.get(name);

    if (current != null && current.getDefinition() != null) {
      emitEvent.accept("service", om.valueToTree(ServiceViewMapper.fromDescriptor(current)));
    }
  }

  private static void emitCrashLog(String name, ServiceDescriptor sd, LogManager logManager) {
    try {
      if (sd.getDefinition() == null || sd.getDefinition().getLogFile() == null) {
        return;
      }

      Path logFile = Path.of(sd.getDefinition().getLogFile());

      if (!Files.exists(logFile)) {
        return;
      }

      String tail = readLogTail(logFile, 10);

      if (!tail.isBlank()) {
        logManager.emitLogStatus(name, "Processo terminou. Últimas linhas:\n" + tail);
      }
    } catch (Exception ignored) {
    }
  }

  static String readLogTail(Path logFile, int maxLines) {
    try (java.io.RandomAccessFile raf = new java.io.RandomAccessFile(logFile.toFile(), "r")) {
      long len = raf.length();
      if (len == 0) {
        return "";
      }
      long pos = len - 1;
      int lines = 0;
      while (pos >= 0 && lines < maxLines) {
        raf.seek(pos);
        int b = raf.read();
        if (b == '\n') {
          lines++;
        }
        pos--;
      }
      long start = Math.max(len - MAX_TAIL_BYTES, Math.max(0, pos + 1));
      raf.seek(start);
      byte[] bytes = new byte[(int) (len - start)];
      raf.readFully(bytes);
      return new String(bytes, StandardCharsets.UTF_8).trim();
    } catch (Exception e) {
      return "";
    }
  }
}
