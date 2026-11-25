package dev.safra.orchestrator.core.runtime.service;

import dev.safra.orchestrator.core.runtime.discovery.js.JsLaunchCommands;
import dev.safra.orchestrator.core.runtime.discovery.php.PhpLaunchCommands;
import dev.safra.orchestrator.core.runtime.workspace.WorkspaceDefinitionSync;
import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.Files;
import java.nio.file.Path;

final class ServiceLaunchPrep {
  private ServiceLaunchPrep() {
  }

  static void prepare(ServiceDefinition def, Runnable persistWorkspace) {
    if (def.getProjectType() != null && def.getProjectType() != ProjectType.SPRING_BOOT
        && JsLaunchCommands.usesNpmRun(def.getProjectType())
        && def.getAvailableScripts() != null && !def.getAvailableScripts().isEmpty()) {
      String selected = WorkspaceDefinitionSync.selectRuntimeJsScript(def.getSelectedScript(),
          def.getAvailableScripts());

      if (selected != null && (def.getSelectedScript() == null || !def.getSelectedScript().equals(selected)
          || def.getCommand() == null || def.getCommand().isEmpty())) {
        def.setSelectedScript(selected);
        def.setCommand(JsLaunchCommands.npmRunCommand(selected));
        persistWorkspace.run();
      }
    }

    if (!PhpLaunchCommands.isPhpProject(def.getProjectType())) {
      return;
    }

    requirePhpVendor(def);

    if (def.getAvailableScripts() != null && !def.getAvailableScripts().isEmpty()) {
      String selected = WorkspaceDefinitionSync.selectRuntimePhpScript(def.getSelectedScript(),
          def.getAvailableScripts());

      if (selected != null) {
        PhpLaunchCommands.applySelection(def, selected);
        persistWorkspace.run();
      }
    }
  }

  private static void requirePhpVendor(ServiceDefinition def) {
    if (def.getProjectType() == ProjectType.STANDALONE_PHP) {
      return;
    }

    if (PhpLaunchCommands.DOCKER_COMPOSE.equals(def.getSelectedScript())) {
      return;
    }

    Path vendor = Path.of(def.getPath()).resolve("vendor/autoload.php");

    if (!Files.isRegularFile(vendor)) {
      throw new IllegalStateException("Dependências PHP ausentes. Execute composer install em " + def.getPath());
    }
  }
}
