package dev.safra.orchestrator.process;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;

import dev.safra.orchestrator.model.ServiceDefinition;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProcessCommandBuilderTest {
  @Test
  void injectsNpmPortWhenScriptHasNoPortFlag() {
    ServiceDefinition def = cliDef(4173);

    List<String> result = ProcessCommandBuilder.applyCustomJsPort(
        def, List.of("npm", "run", "dev"), 4173);

    assertEquals(List.of("npm", "run", "dev", "--", "--port", "4173", "--strictPort"), result);
  }

  @Test
  void replacesExistingPortFlag() {
    ServiceDefinition def = cliDef(3001);

    List<String> result = ProcessCommandBuilder.applyCustomJsPort(
        def, List.of("npx", "serve", "--port", "3000"), 3001);

    assertEquals(List.of("npx", "serve", "--port", "3001"), result);
  }

  @Test
  void returnsOriginalCommandWhenPortStrategyIsNotCli() {
    ServiceDefinition def = new ServiceDefinition();
    def.setCustomPort(3001);
    def.setPortStrategy("ENV");
    List<String> cmd = List.of("npm", "run", "dev");

    assertSame(cmd, ProcessCommandBuilder.applyCustomJsPort(def, cmd, 3001));
    assertSame(cmd, ProcessCommandBuilder.applyPhpBuiltinPort(def, cmd, 3001));
  }

  @Test
  void returnsOriginalCommandWhenCustomPortOrStartupPortIsNull() {
    ServiceDefinition withPort = cliDef(3001);
    ServiceDefinition withoutPort = new ServiceDefinition();
    withoutPort.setPortStrategy("CLI");
    List<String> cmd = List.of("npx", "serve", "--port", "3000");

    assertSame(cmd, ProcessCommandBuilder.applyCustomJsPort(withPort, cmd, null));
    assertSame(cmd, ProcessCommandBuilder.applyCustomJsPort(withoutPort, cmd, 3001));
    assertSame(cmd, ProcessCommandBuilder.applyPhpBuiltinPort(withPort, cmd, null));
    assertSame(cmd, ProcessCommandBuilder.applyPhpBuiltinPort(withoutPort, cmd, 3001));
  }

  @Test
  void replacesEqualsAndShortPortTokens() {
    ServiceDefinition def = cliDef(4173);

    assertEquals(
        List.of("vite", "--port=4173"),
        ProcessCommandBuilder.applyCustomJsPort(def, List.of("vite", "--port=3000"), 4173));
    assertEquals(
        List.of("serve", "-p", "4173"),
        ProcessCommandBuilder.applyCustomJsPort(def, List.of("serve", "-p", "3000"), 4173));
    assertEquals(
        List.of("http-server", "-l", "4173"),
        ProcessCommandBuilder.applyCustomJsPort(def, List.of("http-server", "-l", "8080"), 4173));
    assertEquals(
        List.of("http-server", "-l=4173"),
        ProcessCommandBuilder.applyCustomJsPort(def, List.of("http-server", "-l=8080"), 4173));
    assertEquals(
        List.of("node", "server.js", "--PORT=4173"),
        ProcessCommandBuilder.applyCustomJsPort(def, List.of("node", "server.js", "--PORT=3000"), 4173));
  }

  @Test
  void replacesPhpBuiltinListenAddress() {
    ServiceDefinition def = cliDef(8088);

    List<String> result = ProcessCommandBuilder.applyPhpBuiltinPort(
        def, List.of("php", "-S", "localhost:8000", "-t", "public"), 8088);

    assertEquals(List.of("php", "-S", "localhost:8088", "-t", "public"), result);
  }

  @Test
  void replacesPhpLoopbackListenAddress() {
    ServiceDefinition def = cliDef(8088);

    List<String> result = ProcessCommandBuilder.applyPhpBuiltinPort(
        def, List.of("php", "127.0.0.1:8000", "-t", "public"), 8088);

    assertEquals(List.of("php", "127.0.0.1:8088", "-t", "public"), result);
  }

  @Test
  void leavesPhpCommandUnchangedWhenNoListenAddress() {
    ServiceDefinition def = cliDef(8088);
    List<String> cmd = List.of("php", "artisan", "serve");

    assertEquals(cmd, ProcessCommandBuilder.applyPhpBuiltinPort(def, cmd, 8088));
  }

  private static ServiceDefinition cliDef(int port) {
    ServiceDefinition def = new ServiceDefinition();
    def.setCustomPort(port);
    def.setPortStrategy("CLI");
    return def;
  }
}
