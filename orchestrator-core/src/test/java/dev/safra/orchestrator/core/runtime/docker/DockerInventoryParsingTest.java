package dev.safra.orchestrator.core.runtime.docker;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class DockerInventoryParsingTest {

  private static final String LABELS = "com.docker.compose.config-hash=abc,"
      + "com.docker.compose.container-number=1,"
      + "com.docker.compose.project=pesquisa-satisfacao,"
      + "com.docker.compose.service=backend";

  @Test
  void extractsComposeProjectAndService() {
    assertEquals("pesquisa-satisfacao", DockerInventoryReader.label(LABELS, "com.docker.compose.project"));
    assertEquals("backend", DockerInventoryReader.label(LABELS, "com.docker.compose.service"));
  }

  @Test
  void returnsNullForAbsentLabelWithoutPrefixCollision() {
    assertNull(DockerInventoryReader.label(LABELS, "com.docker.compose.oneoff"));
    assertNull(DockerInventoryReader.label(LABELS, "com.docker.compose"));
    assertNull(DockerInventoryReader.label("", "com.docker.compose.project"));
  }

  @Test
  void shortensImageAndContainerIdentifiers() {
    assertEquals("f6b1e14e1797",
        DockerInventoryReader.shortId("sha256:f6b1e14e1797c130b9e625eadc29a4d5ef839cf7dde93c4d0666fb01f61fce53"));
    assertEquals("5d41b52e46af", DockerInventoryReader.shortId("5d41b52e46af"));
    assertEquals("abc", DockerInventoryReader.shortId("abc"));
  }

  @Test
  void keepsOnlyFirstContainerName() {
    assertEquals("pedido-racao-app", DockerInventoryReader.firstName("pedido-racao-app,alias-antigo"));
    assertEquals("solo", DockerInventoryReader.firstName("solo"));
  }
}
