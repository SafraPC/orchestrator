package dev.safra.orchestrator.process;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dev.safra.orchestrator.model.ListeningPortView;
import java.util.List;
import org.junit.jupiter.api.Test;

class DevPortHeuristicsTest {

  @Test
  void marksDevRangeAndCommonDevPorts() {
    assertTrue(DevPortHeuristics.isDevPort(3000));
    assertTrue(DevPortHeuristics.isDevPort(5173));
    assertTrue(DevPortHeuristics.isDevPort(9999));
    assertTrue(DevPortHeuristics.isDevPort(27017));
    assertFalse(DevPortHeuristics.isDevPort(2999));
    assertFalse(DevPortHeuristics.isDevPort(60569));
  }

  @Test
  void detectsEditorAndTerminalAncestry() {
    List<String> cursorTerminal = List.of(
        "node /Users/dev/app/node_modules/.bin/vite",
        "/bin/zsh -il",
        "/Applications/Cursor.app/Contents/Frameworks/Cursor Helper (Plugin).app/Contents/MacOS/Cursor Helper (Plugin)");
    assertEquals("cursor", DevPortHeuristics.originOf(cursorTerminal, "node"));

    List<String> vscodeTerminal = List.of(
        "node server.js",
        "/bin/bash",
        "/Applications/Visual Studio Code.app/Contents/MacOS/Electron");
    assertEquals("vscode", DevPortHeuristics.originOf(vscodeTerminal, "node"));

    List<String> plainTerminal = List.of("php -S 127.0.0.1:8000", "/bin/zsh", "/Applications/iTerm.app/Contents/MacOS/iTerm2");
    assertEquals("terminal", DevPortHeuristics.originOf(plainTerminal, "php"));
  }

  @Test
  void classifiesRuntimeAndSystemProcesses() {
    assertEquals("runtime", DevPortHeuristics.originOf(List.of("/usr/bin/java -jar api.jar"), "java"));
    assertEquals("system", DevPortHeuristics.originOf(List.of("/usr/libexec/rapportd"), "rapportd"));
    assertTrue(DevPortHeuristics.isDevRelated("terminal"));
    assertFalse(DevPortHeuristics.isDevRelated("system"));
  }

  @Test
  void scanReturnsValidPortsWithDevEntriesFirstAndSystemLast() {
    List<ListeningPortView> ports = ListeningPortScanner.scan();
    boolean seenSystem = false;
    boolean seenNonDevPort = false;
    for (ListeningPortView view : ports) {
      assertTrue(view.port() >= 1 && view.port() <= 65535);
      assertTrue(view.pid() > 0);
      if (view.devRelated()) {
        assertFalse(seenSystem, "portas de sistema devem vir por último");
        if (view.devPort()) {
          assertFalse(seenNonDevPort, "portas dev devem vir antes das demais do mesmo grupo");
        } else {
          seenNonDevPort = true;
        }
      } else {
        seenSystem = true;
      }
    }
  }
}
