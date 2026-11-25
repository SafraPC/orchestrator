package dev.safra.orchestrator.core.runtime.discovery.php;

import dev.safra.orchestrator.core.runtime.discovery.PortDeclaration;
import dev.safra.orchestrator.core.runtime.discovery.js.DevServerPortDetector;
import dev.safra.orchestrator.model.ProjectType;
import java.nio.file.Path;
import java.util.List;

public final class PhpPortSource {
  private PhpPortSource() {
  }

  public static PortDeclaration locate(Path dir, String selectedScript, ProjectType type) {
    if (PhpLaunchCommands.DOCKER_COMPOSE.equals(selectedScript)) {
      Integer composePort = DockerComposeSupport.readPublishedHttpPort(dir);

      if (composePort != null) {
        return PortDeclaration.of(composePort, DockerComposeSupport.resolveComposeFile(dir));
      }
    }

    if (PhpLaunchCommands.ARTISAN_SERVE.equals(selectedScript)
        || PhpLaunchCommands.SYMFONY_SERVE.equals(selectedScript)
        || PhpLaunchCommands.PHP_BUILTIN_SERVE.equals(selectedScript)) {
      PortDeclaration envPort = DevServerPortDetector.locateEnvPort(dir, List.of("APP_PORT", "SERVER_PORT", "PORT"));

      if (envPort != null) {
        return envPort;
      }

      PortDeclaration frontendProxyPort = DevServerPortDetector.locateSiblingFrontendProxyPort(dir);

      if (frontendProxyPort != null) {
        return frontendProxyPort;
      }

      return PortDeclaration.of(PhpLaunchCommands.defaultPort(type), null);
    }

    return new PortDeclaration(null, null);
  }
}
