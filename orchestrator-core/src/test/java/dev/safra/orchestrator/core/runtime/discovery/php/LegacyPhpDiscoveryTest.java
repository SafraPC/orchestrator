package dev.safra.orchestrator.core.runtime.discovery.php;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.runtime.workspace.WorkspaceDefinitionSync;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LegacyPhpDiscoveryTest {

  @TempDir
  Path tempDir;

  @Test
  void scansComposerProjectWithoutScriptsUsingRootIndexAndDockerCompose() throws Exception {
    Path project = tempDir.resolve("portal-pedido-racao");
    Files.createDirectories(project);
    Files.writeString(project.resolve("composer.json"), """
        {
          "autoload": { "psr-4": { "App\\\\": "app/" } },
          "require": { "guzzlehttp/guzzle": "^7.9" }
        }
        """);
    Files.writeString(project.resolve("index.php"), "<?php echo 'ok';");
    Files.writeString(project.resolve("docker-compose.yml"), """
        services:
          mysql:
            image: mariadb:10.11
            ports:
              - "3312:3306"
          app:
            build: .
            ports:
              - "8088:80"
        """);

    PhpProjectScanner scanner = new PhpProjectScanner(new ObjectMapper(), tempDir.resolve("logs"));
    List<ServiceDefinition> found = scanner.scanRoot(tempDir, List.of());

    assertEquals(1, found.size());
    ServiceDefinition def = found.get(0);
    assertEquals("portal-pedido-racao", def.getName());
    assertEquals(ProjectType.PHP_COMPOSER, def.getProjectType());
    assertTrue(def.getAvailableScripts().contains(PhpLaunchCommands.DOCKER_COMPOSE));
    assertTrue(def.getAvailableScripts().contains(PhpLaunchCommands.PHP_BUILTIN_SERVE));
    assertEquals(PhpLaunchCommands.DOCKER_COMPOSE, def.getSelectedScript());
    assertEquals(8088, def.getDetectedPort());
    assertEquals(List.of("docker", "compose", "up"), def.getCommand());
  }

  @Test
  void ignoresComposerRootWithOnlyNonRuntimeScripts() throws Exception {
    Path project = tempDir.resolve("monorepo-root");
    Files.createDirectories(project);
    Files.writeString(project.resolve("composer.json"), """
        {
          "scripts": {
            "lint": "composer --working-dir=backend lint",
            "test": "composer --working-dir=backend test"
          }
        }
        """);

    PhpProjectScanner scanner = new PhpProjectScanner(new ObjectMapper(), tempDir.resolve("logs"));
    List<ServiceDefinition> found = scanner.scanRoot(tempDir, List.of());
    assertTrue(found.isEmpty());
  }

  @Test
  void prefersArtisanOverDockerCompose() {
    String selected = WorkspaceDefinitionSync.selectRuntimePhpScript(
        null,
        List.of(PhpLaunchCommands.DOCKER_COMPOSE, PhpLaunchCommands.ARTISAN_SERVE, PhpLaunchCommands.PHP_BUILTIN_SERVE));
    assertEquals(PhpLaunchCommands.ARTISAN_SERVE, selected);
  }

  @Test
  void readsPreferredAppPortFromCompose() throws Exception {
    Path project = tempDir.resolve("app");
    Files.createDirectories(project);
    Files.writeString(project.resolve("docker-compose.yml"), """
        services:
          mysql:
            ports:
              - "3312:3306"
          app:
            ports:
              - "8088:80"
        """);
    assertTrue(DockerComposeSupport.hasComposeFile(project));
    assertEquals(8088, DockerComposeSupport.readPublishedHttpPort(project));
  }

  @Test
  void applyDockerComposeSelectionSetsCommandAndPort() throws Exception {
    Path project = tempDir.resolve("legacy");
    Files.createDirectories(project);
    Files.writeString(project.resolve("docker-compose.yml"), """
        services:
          app:
            ports:
              - "8099:80"
        """);
    ServiceDefinition def = new ServiceDefinition();
    def.setPath(project.toString());
    def.setProjectType(ProjectType.PHP_COMPOSER);
    def.setAvailableScripts(List.of(PhpLaunchCommands.DOCKER_COMPOSE));
    PhpLaunchCommands.applySelection(def, PhpLaunchCommands.DOCKER_COMPOSE);
    assertEquals(List.of("docker", "compose", "up"), def.getCommand());
    assertEquals(8099, def.getDetectedPort());
    assertEquals("UNSUPPORTED", def.getPortStrategy());
    assertNotNull(def.getSelectedScript());
    assertFalse(PhpLaunchCommands.isCustomCommandScript(def.getSelectedScript()));
  }
}
