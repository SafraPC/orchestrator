package dev.safra.orchestrator.core.runtime.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class ImportPathMatcherTest {

  @TempDir
  Path tempDir;

  @Test
  void matchesExactAndNestedPathsAndRejectsSiblings() {
    Path root = tempDir.resolve("apps").toAbsolutePath().normalize();
    Path nested = root.resolve("api");
    Path sibling = tempDir.resolve("apps-extra").resolve("api");
    List<Path> imported = List.of(root);

    assertTrue(ImportPathMatcher.isUnderImported(root.toString(), imported));
    assertTrue(ImportPathMatcher.isUnderImported(nested.toString(), imported));
    assertFalse(ImportPathMatcher.isUnderImported(sibling.toString(), imported));
    assertFalse(ImportPathMatcher.isUnderImported("", imported));
    assertFalse(ImportPathMatcher.isUnderImported(root.toString(), List.of()));
  }

  @Test
  void assignsExistingAndNewServicesUnderImportedRoots() {
    Path root = tempDir.resolve("workspace").toAbsolutePath().normalize();
    ServiceDefinition existing = service("billing", root.resolve("billing").toString(), List.of("other"));
    ServiceDefinition alreadyIn = service("ui", root.resolve("ui").toString(), List.of("target"));
    ServiceDefinition outside = service("docs", tempDir.resolve("docs").toString(), List.of());
    List<ServiceDefinition> services = new ArrayList<>(List.of(existing, alreadyIn, outside));

    int assigned = ImportPathMatcher.assignContainer(services, List.of(root), "target");

    assertEquals(1, assigned);
    assertEquals(List.of("other", "target"), existing.getContainerIds());
    assertEquals(List.of("target"), alreadyIn.getContainerIds());
    assertTrue(outside.getContainerIds() == null || outside.getContainerIds().isEmpty());
  }

  @Test
  void skipsAssignmentWithoutContainer() {
    ServiceDefinition def = service("api", tempDir.resolve("api").toString(), List.of());
    int assigned = ImportPathMatcher.assignContainer(List.of(def), List.of(tempDir), "  ");
    assertEquals(0, assigned);
    assertTrue(def.getContainerIds().isEmpty());
  }

  private static ServiceDefinition service(String name, String path, List<String> containerIds) {
    ServiceDefinition def = new ServiceDefinition();
    def.setName(name);
    def.setPath(path);
    def.setContainerIds(new ArrayList<>(containerIds));
    return def;
  }
}
