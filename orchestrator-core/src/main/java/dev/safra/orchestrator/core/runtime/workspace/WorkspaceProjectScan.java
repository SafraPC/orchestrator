package dev.safra.orchestrator.core.runtime.workspace;

import dev.safra.orchestrator.core.runtime.discovery.java.ProjectScanner;
import dev.safra.orchestrator.core.runtime.discovery.js.JsProjectScanner;
import dev.safra.orchestrator.core.runtime.discovery.js.StandaloneJsScanner;
import dev.safra.orchestrator.core.runtime.discovery.php.PhpProjectScanner;
import dev.safra.orchestrator.core.runtime.discovery.php.StandalonePhpScanner;
import dev.safra.orchestrator.model.ServiceDefinition;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

final class WorkspaceProjectScan {
  private final ProjectScanner javaScanner;
  private final JsProjectScanner jsScanner;
  private final StandaloneJsScanner standaloneJsScanner;
  private final PhpProjectScanner phpScanner;
  private final StandalonePhpScanner standalonePhpScanner;

  WorkspaceProjectScan(ProjectScanner javaScanner, JsProjectScanner jsScanner,
      StandaloneJsScanner standaloneJsScanner, PhpProjectScanner phpScanner,
      StandalonePhpScanner standalonePhpScanner) {
    this.javaScanner = javaScanner;
    this.jsScanner = jsScanner;
    this.standaloneJsScanner = standaloneJsScanner;
    this.phpScanner = phpScanner;
    this.standalonePhpScanner = standalonePhpScanner;
  }

  List<ServiceDefinition> scan(Path root, List<String> excludeDirs) {
    List<ServiceDefinition> found = new ArrayList<>();
    found.addAll(javaScanner.scanRoot(root, excludeDirs));
    found.addAll(phpScanner.scanRoot(root, excludeDirs));
    found.addAll(standalonePhpScanner.scanRoot(root, excludeDirs));
    found.addAll(jsScanner.scanRoot(root, excludeDirs));
    found.addAll(standaloneJsScanner.scanRoot(root, excludeDirs));
    return found;
  }
}
