package dev.safra.orchestrator.core.runtime.workspace;

import dev.safra.orchestrator.core.runtime.discovery.DeclaredPortFiles;
import dev.safra.orchestrator.core.runtime.discovery.PortDeclaration;
import dev.safra.orchestrator.core.runtime.discovery.java.PortExtractor;
import dev.safra.orchestrator.core.runtime.discovery.js.JsProjectScanner;
import dev.safra.orchestrator.core.runtime.discovery.php.PhpLaunchCommands;
import dev.safra.orchestrator.core.runtime.discovery.php.PhpProjectScanner;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.ServiceDescriptor;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

final class WorkspaceMetadataRefresh {
  private final JsProjectScanner jsScanner;
  private final PhpProjectScanner phpScanner;
  private final PortExtractor portExtractor;

  WorkspaceMetadataRefresh(JsProjectScanner jsScanner, PhpProjectScanner phpScanner, PortExtractor portExtractor) {
    this.jsScanner = jsScanner;
    this.phpScanner = phpScanner;
    this.portExtractor = portExtractor;
  }

  boolean refresh(ServiceDefinition def) {
    if (def == null || def.getProjectType() == null) {
      return false;
    }

    if (def.getProjectType() == ProjectType.SPRING_BOOT) {
      return refreshSpring(def);
    }

    Snapshot before = Snapshot.capture(def);

    if (PhpLaunchCommands.isPhpProject(def.getProjectType())) {
      phpScanner.refreshServiceDefinition(def);
    } else {
      jsScanner.refreshServiceDefinition(def);
    }

    return before.changed(def);
  }

  void refreshScope(Collection<ServiceDescriptor> descriptors, String containerId, Runnable persist) {
    if (applyScope(descriptors, containerId)) {
      persist.run();
    }
  }

  Path preparePortFile(ServiceDefinition def, Runnable persist) {
    if (refresh(def)) {
      persist.run();
    }

    return DeclaredPortFiles.require(def);
  }

  private boolean applyScope(Collection<ServiceDescriptor> descriptors, String containerId) {
    String scope = containerId == null ? "" : containerId.trim();
    boolean changed = false;

    for (ServiceDescriptor descriptor : descriptors) {
      ServiceDefinition def = descriptor.getDefinition();

      if (!inScope(def, scope)) {
        continue;
      }

      changed |= refresh(def);

      if (def.getPortFile() != null && !def.getPortFile().isBlank() && def.getCustomPort() != null) {
        def.setCustomPort(null);
        changed = true;
      }
    }

    return changed;
  }

  private boolean refreshSpring(ServiceDefinition def) {
    if (def.getPath() == null || def.getPath().isBlank()) {
      return false;
    }

    Path dir = Path.of(def.getPath());

    if (!Files.isDirectory(dir)) {
      return false;
    }

    Snapshot before = Snapshot.capture(def);
    Optional<PortDeclaration> located = portExtractor.locate(dir);

    if (located.isEmpty()) {
      def.setPortFile(null);
      return before.changed(def);
    }

    PortDeclaration declaration = located.get();
    def.setDetectedPort(declaration.port());
    def.setPortFile(declaration.filePath());

    if (def.getCommand() != null && !def.getCommand().isEmpty()) {
      WorkspaceDefinitionSync.applyPortFromConfig(def, dir, portExtractor);
    }

    return before.changed(def);
  }

  private static boolean inScope(ServiceDefinition def, String scope) {
    if (def == null) {
      return false;
    }

    if (scope.isEmpty()) {
      return true;
    }

    List<String> ids = def.getContainerIds();
    return ids != null && ids.contains(scope);
  }

  record Snapshot(
      List<String> scripts,
      Integer port,
      String strategy,
      String selected,
      List<String> command,
      String portFile
  ) {
    static Snapshot capture(ServiceDefinition def) {
      return new Snapshot(
          copy(def.getAvailableScripts()),
          def.getDetectedPort(),
          def.getPortStrategy(),
          def.getSelectedScript(),
          copy(def.getCommand()),
          def.getPortFile());
    }

    boolean changed(ServiceDefinition def) {
      return !copy(def.getAvailableScripts()).equals(scripts)
          || !Objects.equals(port, def.getDetectedPort())
          || !Objects.equals(strategy, def.getPortStrategy())
          || !Objects.equals(selected, def.getSelectedScript())
          || !copy(def.getCommand()).equals(command)
          || !Objects.equals(portFile, def.getPortFile());
    }

    private static List<String> copy(List<String> values) {
      return values == null ? List.of() : new ArrayList<>(values);
    }
  }
}
