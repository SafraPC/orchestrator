package dev.safra.orchestrator.core.runtime.discovery;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.runtime.discovery.java.PortExtractor;
import dev.safra.orchestrator.core.runtime.discovery.js.JsProjectScanner;
import dev.safra.orchestrator.core.runtime.discovery.php.PhpProjectScanner;
import dev.safra.orchestrator.core.runtime.workspace.StateStore;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PortFileDiscoveryTest {
  @TempDir
  Path tempDir;

  @Test
  void jsScriptPortPointsAtPackageJson() throws Exception {
    Path dir = tempDir.resolve("web");
    Files.createDirectories(dir);
    Files.writeString(dir.resolve("package.json"), """
        {"scripts":{"dev":"vite --port 4173"},"dependencies":{"react":"18.3.1","vite":"5.4.0"}}
        """);

    ServiceDefinition def = scanJs(dir);

    assertEquals(4173, def.getDetectedPort());
    assertTrue(def.getPortFile().endsWith("package.json"));
  }

  @Test
  void viteConfigPortPointsAtConfigFile() throws Exception {
    Path dir = tempDir.resolve("vite-app");
    Files.createDirectories(dir);
    Files.writeString(dir.resolve("package.json"), """
        {"scripts":{"dev":"vite"},"dependencies":{"react":"18.3.1"},"devDependencies":{"vite":"5.4.0"}}
        """);
    Files.writeString(dir.resolve("vite.config.ts"), "export default { server: { port: 4000 } }\n");

    ServiceDefinition def = scanJs(dir);

    assertEquals(4000, def.getDetectedPort());
    assertTrue(def.getPortFile().endsWith("vite.config.ts"));
  }

  @Test
  void phpEnvPortPointsAtDotEnv() throws Exception {
    Path dir = tempDir.resolve("api");
    Files.createDirectories(dir);
    Files.writeString(dir.resolve("composer.json"), "{\"require\":{\"laravel/framework\":\"^10.0\"}}");
    Files.writeString(dir.resolve("artisan"), "");
    Files.writeString(dir.resolve(".env"), "APP_PORT=8081\n");

    List<ServiceDefinition> found = new PhpProjectScanner(new ObjectMapper(), tempDir.resolve("logs"))
        .scanRoot(dir, List.of());

    assertEquals(1, found.size());
    assertEquals(8081, found.get(0).getDetectedPort());
    assertTrue(found.get(0).getPortFile().endsWith(".env"));
  }

  @Test
  void springPropertiesPointAtApplicationFile() throws Exception {
    Path dir = tempDir.resolve("boot");
    Path resources = dir.resolve("src/main/resources");
    Files.createDirectories(resources);
    Files.writeString(resources.resolve("application.yml"), "server:\n  port: 9090\n");

    PortDeclaration declaration = new PortExtractor(new StateStore(new ObjectMapper())).locate(dir).orElseThrow();

    assertEquals(9090, declaration.port());
    assertTrue(declaration.filePath().endsWith("application.yml"));
  }

  @Test
  void missingDeclaredFileFallsBackToExistingConfig() throws Exception {
    Path dir = tempDir.resolve("plain");
    Files.createDirectories(dir);
    Files.writeString(dir.resolve("package.json"), "{\"name\":\"plain\"}");
    Files.writeString(dir.resolve("vite.config.ts"), "export default {}\n");

    ServiceDefinition def = new ServiceDefinition();
    def.setPath(dir.toString());
    def.setProjectType(ProjectType.REACT);

    Path file = DeclaredPortFiles.preferred(def);

    assertTrue(file.endsWith("vite.config.ts"));
    assertNull(def.getPortFile());
  }

  private ServiceDefinition scanJs(Path dir) {
    List<ServiceDefinition> found = new JsProjectScanner(new ObjectMapper(), tempDir.resolve("logs"))
        .scanRoot(dir, List.of());
    assertEquals(1, found.size());
    return found.get(0);
  }
}
