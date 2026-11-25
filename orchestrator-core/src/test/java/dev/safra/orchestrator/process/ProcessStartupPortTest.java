package dev.safra.orchestrator.process;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.ServerSocket;
import org.junit.jupiter.api.Test;

class ProcessStartupPortTest {

  @Test
  void ensureFreeAllowsNullPort() {
    assertDoesNotThrow(() -> ProcessStartupPort.ensureFree(null, null));
  }

  @Test
  void ensureFreeThrowsWhenOccupiedWithoutStalePid() throws Exception {
    try (ServerSocket socket = new ServerSocket(0)) {
      int port = socket.getLocalPort();

      IllegalStateException error = assertThrows(
          IllegalStateException.class,
          () -> ProcessStartupPort.ensureFree(port, null));

      assertTrue(error.getMessage().contains(String.valueOf(port)));
    }
  }
}
