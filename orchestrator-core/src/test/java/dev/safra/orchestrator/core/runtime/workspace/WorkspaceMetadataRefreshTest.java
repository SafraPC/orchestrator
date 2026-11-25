package dev.safra.orchestrator.core.runtime.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.runtime.discovery.java.PortExtractor;
import dev.safra.orchestrator.core.runtime.discovery.js.JsProjectScanner;
import dev.safra.orchestrator.core.runtime.discovery.php.PhpProjectScanner;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.ServiceDescriptor;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class WorkspaceMetadataRefreshTest {

  @TempDir
  Path tempDir;

  @Test
  void springBootOrNullTypeReturnsFalseWithoutMutation() {
    WorkspaceMetadataRefresh refresh = newRefresh();
    ServiceDefinition spring = definition(ProjectType.SPRING_BOOT, List.of("boot"), 8080, "ENV", "boot",
        List.of("mvn", "spring-boot:run"));
    ServiceDefinition missingType = definition(null, List.of("boot"), 8080, "ENV", "boot",
        List.of("mvn", "spring-boot:run"));

    assertFalse(refresh.refresh(spring));
    assertEquals(List.of("boot"), spring.getAvailableScripts());
    assertEquals(8080, spring.getDetectedPort());
    assertEquals("ENV", spring.getPortStrategy());
    assertEquals("boot", spring.getSelectedScript());
    assertEquals(List.of("mvn", "spring-boot:run"), spring.getCommand());

    assertFalse(refresh.refresh(missingType));
    assertEquals(List.of("boot"), missingType.getAvailableScripts());
    assertEquals(8080, missingType.getDetectedPort());
  }

  @Test
  void snapshotTreatsNullListsAsEmptyAndIgnoresUnrelatedFields() {
    ServiceDefinition js = definition(ProjectType.REACT, null, 3000, "CLI", "dev", null);
    WorkspaceMetadataRefresh.Snapshot snap = WorkspaceMetadataRefresh.Snapshot.capture(js);

    ServiceDefinition same = definition(ProjectType.REACT, List.of(), 3000, "CLI", "dev", List.of());
    same.setName("ui");
    same.setPath("/tmp/ui");
    assertFalse(snap.changed(same));

    ServiceDefinition php = definition(ProjectType.LARAVEL, null, 8000, "CLI", "artisan:serve", null);
    assertFalse(WorkspaceMetadataRefresh.Snapshot.capture(php).changed(
        definition(ProjectType.LARAVEL, List.of(), 8000, "CLI", "artisan:serve", List.of())));
  }

  @Test
  void snapshotChangesOnlyWhenTrackedFieldsDiffer() {
    WorkspaceMetadataRefresh.Snapshot snap = WorkspaceMetadataRefresh.Snapshot.capture(
        definition(ProjectType.REACT, List.of("dev"), 3000, "CLI", "dev", List.of("npm", "run", "dev")));

    assertTrue(snap.changed(definition(ProjectType.REACT, List.of("start"), 3000, "CLI", "dev",
        List.of("npm", "run", "dev"))));
    assertTrue(snap.changed(definition(ProjectType.REACT, List.of("dev"), 4173, "CLI", "dev",
        List.of("npm", "run", "dev"))));
    assertTrue(snap.changed(definition(ProjectType.REACT, List.of("dev"), 3000, "ENV", "dev",
        List.of("npm", "run", "dev"))));
    assertTrue(snap.changed(definition(ProjectType.REACT, List.of("dev"), 3000, "CLI", "start",
        List.of("npm", "run", "dev"))));
    assertTrue(snap.changed(definition(ProjectType.REACT, List.of("dev"), 3000, "CLI", "dev",
        List.of("npm", "run", "start"))));
    assertFalse(snap.changed(definition(ProjectType.REACT, List.of("dev"), 3000, "CLI", "dev",
        List.of("npm", "run", "dev"))));
  }

  @Test
  void springRefreshReadsServerPortFromProperties() throws Exception {
    Path dir = tempDir.resolve("api");
    Path resources = dir.resolve("src/main/resources");
    Files.createDirectories(resources);
    Files.writeString(resources.resolve("application.properties"), "server.port=9091\n");

    ServiceDefinition def = definition(
        ProjectType.SPRING_BOOT,
        List.of(),
        8080,
        null,
        null,
        List.of("mvn", "spring-boot:run"));
    def.setPath(dir.toString());
    def.setCustomPort(7000);
    def.setContainerIds(List.of("box"));

    ServiceDescriptor descriptor = new ServiceDescriptor();
    descriptor.setDefinition(def);
    newRefresh().refreshScope(List.of(descriptor), "box", () -> { });

    assertEquals(9091, def.getDetectedPort());
    assertEquals("9091", def.getEnv().get("SERVER_PORT"));
    assertTrue(def.getPortFile().endsWith("application.properties"));
    assertNull(def.getCustomPort());
  }

  private WorkspaceMetadataRefresh newRefresh() {
    ObjectMapper om = new ObjectMapper();
    return new WorkspaceMetadataRefresh(
        new JsProjectScanner(om, tempDir.resolve("logs")),
        new PhpProjectScanner(om, tempDir.resolve("logs")),
        new PortExtractor(new StateStore(om)));
  }

  private static ServiceDefinition definition(
      ProjectType type,
      List<String> scripts,
      Integer port,
      String strategy,
      String selected,
      List<String> command
  ) {
    ServiceDefinition def = new ServiceDefinition();
    def.setProjectType(type);
    def.setAvailableScripts(scripts);
    def.setDetectedPort(port);
    def.setPortStrategy(strategy);
    def.setSelectedScript(selected);
    def.setCommand(command);
    return def;
  }
}
