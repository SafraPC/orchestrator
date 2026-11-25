package dev.safra.orchestrator.core.runtime.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.Json;
import dev.safra.orchestrator.core.runtime.logs.LogManager;
import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.model.ServiceRuntime;
import dev.safra.orchestrator.model.ServiceStatus;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ServiceHealthCheckTest {

  @TempDir
  Path tempDir;

  @Test
  void emptyFileReturnsEmptyString() throws Exception {
    Path logFile = tempDir.resolve("empty.log");
    Files.writeString(logFile, "");

    assertEquals("", ServiceHealthCheck.readLogTail(logFile, 10));
  }

  @Test
  void returnsWholeFileWhenFewerThanMaxLines() throws Exception {
    Path logFile = tempDir.resolve("short.log");
    Files.writeString(logFile, "alpha\nbeta\ngamma");

    assertEquals("alpha\nbeta\ngamma", ServiceHealthCheck.readLogTail(logFile, 10));
  }

  @Test
  void returnsLastNewlineDelimitedLines() throws Exception {
    Path logFile = tempDir.resolve("tail.log");
    Files.writeString(logFile, "one\ntwo\nthree\nfour\nfive");

    assertEquals("three\nfour\nfive", ServiceHealthCheck.readLogTail(logFile, 3));
  }

  @Test
  void missingFileOrDirectoryFallsBackToEmpty() {
    assertEquals("", ServiceHealthCheck.readLogTail(tempDir.resolve("missing.log"), 10));
    assertEquals("", ServiceHealthCheck.readLogTail(tempDir, 10));
  }

  @Test
  void capsTailWhenFileHasNoNewlines() throws Exception {
    Path logFile = tempDir.resolve("huge.log");
    Files.writeString(logFile, "a".repeat(70_000));

    String tail = ServiceHealthCheck.readLogTail(logFile, 10);

    assertEquals(65_536, tail.length());
  }

  @Test
  void stillCurrentIgnoresRestartedPid() {
    ServiceDescriptor sd = descriptor(11L);
    Map<String, ServiceDescriptor> services = new HashMap<>();
    services.put("api", sd);

    assertTrue(ServiceHealthCheck.stillCurrent("api", 11L, sd, services));

    sd.getRuntime().setPid(22L);

    assertFalse(ServiceHealthCheck.stillCurrent("api", 11L, sd, services));
  }

  @Test
  void stillCurrentIgnoresReplacedDescriptor() {
    ServiceDescriptor original = descriptor(11L);
    Map<String, ServiceDescriptor> services = Map.of("api", descriptor(11L));

    assertFalse(ServiceHealthCheck.stillCurrent("api", 11L, original, services));
  }

  @Test
  void onProcessExitIgnoresStalePid() {
    ServiceDescriptor sd = descriptor(22L);
    sd.getRuntime().setLastStartAt(Instant.now());
    Map<String, ServiceDescriptor> services = new HashMap<>();
    services.put("api", sd);

    applyExit("api", 11L, sd, services);

    assertEquals(22L, sd.getRuntime().getPid());
    assertEquals(ServiceStatus.STOPPED, sd.getRuntime().getStatus());
  }

  @Test
  void onProcessExitMarksErrorWhenCrashedOnStart() {
    ServiceDescriptor sd = descriptor(11L);
    sd.getRuntime().setLastStartAt(Instant.now());
    sd.getRuntime().setStatus(ServiceStatus.RUNNING);
    Map<String, ServiceDescriptor> services = new HashMap<>();
    services.put("api", sd);

    applyExit("api", 11L, sd, services);

    assertNull(sd.getRuntime().getPid());
    assertEquals(ServiceStatus.ERROR, sd.getRuntime().getStatus());
  }

  @Test
  void onProcessExitMarksStoppedAfterCrashWindow() {
    ServiceDescriptor sd = descriptor(11L);
    sd.getRuntime().setLastStartAt(Instant.now().minusSeconds(10));
    sd.getRuntime().setStatus(ServiceStatus.RUNNING);
    Map<String, ServiceDescriptor> services = new HashMap<>();
    services.put("api", sd);

    applyExit("api", 11L, sd, services);

    assertNull(sd.getRuntime().getPid());
    assertEquals(ServiceStatus.STOPPED, sd.getRuntime().getStatus());
  }

  private static void applyExit(
      String name, long pid, ServiceDescriptor sd, Map<String, ServiceDescriptor> services) {
    ObjectMapper om = Json.mapper();
    LogManager logs = new LogManager(om, (event, payload) -> {
    }, new AtomicBoolean());
    ServiceHealthCheck.onProcessExit(name, pid, sd, logs, () -> {
    }, services, (event, payload) -> {
    }, om);
  }

  private static ServiceDescriptor descriptor(long pid) {
    ServiceDefinition def = new ServiceDefinition();
    def.setName("api");
    ServiceDescriptor sd = new ServiceDescriptor();
    sd.setDefinition(def);
    ServiceRuntime runtime = new ServiceRuntime();
    runtime.setPid(pid);
    sd.setRuntime(runtime);
    return sd;
  }
}
