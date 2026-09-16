package dev.safra.orchestrator.core.runtime.docker;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import org.junit.jupiter.api.Test;

class DockerEngineLauncherTest {

  @Test
  void tokenizesSimpleCommand() {
    assertEquals(List.of("colima", "start"), DockerEngineLauncher.tokenize("colima start"));
  }

  @Test
  void collapsesExtraWhitespace() {
    assertEquals(List.of("colima", "start", "--cpu", "4"),
        DockerEngineLauncher.tokenize("  colima   start  --cpu 4 "));
  }

  @Test
  void keepsQuotedPathsTogether() {
    assertEquals(List.of("C:\\Program Files\\Docker\\Docker Desktop.exe"),
        DockerEngineLauncher.tokenize("\"C:\\Program Files\\Docker\\Docker Desktop.exe\""));
    assertEquals(List.of("open", "-a", "Docker Desktop"),
        DockerEngineLauncher.tokenize("open -a 'Docker Desktop'"));
  }

  @Test
  void returnsEmptyForBlankOrNullCommand() {
    assertTrue(DockerEngineLauncher.tokenize(null).isEmpty());
    assertTrue(DockerEngineLauncher.tokenize("   ").isEmpty());
  }
}
