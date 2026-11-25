package dev.safra.orchestrator.core.runtime.discovery.java;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.runtime.discovery.PortDeclaration;
import dev.safra.orchestrator.core.runtime.workspace.StateStore;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class PortExtractorTest {

  @TempDir
  Path tempDir;

  private PortExtractor extractor;

  @BeforeEach
  void setUp() {
    extractor = new PortExtractor(new StateStore(new ObjectMapper()));
  }

  @Test
  void emptyDirectoryHasNoPort() {
    assertTrue(extractor.locate(tempDir).isEmpty());
    assertTrue(extractor.locate(null).isEmpty());
  }

  @Test
  void readsServerPortFromProperties() throws Exception {
    Path resources = tempDir.resolve("src/main/resources");
    Files.createDirectories(resources);
    Files.writeString(resources.resolve("application.properties"), "server.port=8081 # http\n");

    PortDeclaration declaration = extractor.locate(tempDir).orElseThrow();

    assertEquals(8081, declaration.port());
    assertTrue(declaration.filePath().endsWith("application.properties"));
  }

  @Test
  void ignoresNonPortKeysInProperties() throws Exception {
    Path resources = tempDir.resolve("src/main/resources");
    Files.createDirectories(resources);
    Files.writeString(resources.resolve("application.properties"), "server.port.additional=9\nname=app\n");
    Files.writeString(resources.resolve("application.yml"), "server:\n  port: 9090\n");

    PortDeclaration declaration = extractor.locate(tempDir).orElseThrow();

    assertEquals(9090, declaration.port());
    assertTrue(declaration.filePath().endsWith("application.yml"));
  }

  @Test
  void propertiesWithoutPortFallsThroughToYaml() throws Exception {
    Path resources = tempDir.resolve("src/main/resources");
    Files.createDirectories(resources);
    Files.writeString(resources.resolve("application.properties"), "spring.application.name=api\n");
    Files.writeString(resources.resolve("application.yml"), "server:\n  port: \"7070\"\n");

    PortDeclaration declaration = extractor.locate(tempDir).orElseThrow();

    assertEquals(7070, declaration.port());
    assertTrue(declaration.filePath().endsWith("application.yml"));
  }

  @Test
  void readsQuotedYamlPort() throws Exception {
    Path resources = tempDir.resolve("src/main/resources");
    Files.createDirectories(resources);
    Files.writeString(resources.resolve("application.yml"), "server:\n  port: '6060'\n");

    assertEquals(6060, extractor.extract(tempDir).orElseThrow());
  }

  @Test
  void readsLocalYamlWhenMainHasNoPort() throws Exception {
    Path resources = tempDir.resolve("src/main/resources");
    Files.createDirectories(resources);
    Files.writeString(resources.resolve("application.yml"), "spring:\n  application:\n    name: api\n");
    Files.writeString(resources.resolve("application-local.yml"), "server:\n  port: 5050\n");

    Optional<PortDeclaration> declaration = extractor.locate(tempDir);

    assertTrue(declaration.isPresent());
    assertEquals(5050, declaration.get().port());
    assertTrue(declaration.get().filePath().endsWith("application-local.yml"));
  }
}
