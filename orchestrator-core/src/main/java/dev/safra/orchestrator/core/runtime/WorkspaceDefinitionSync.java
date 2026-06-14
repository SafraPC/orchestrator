package dev.safra.orchestrator.core.runtime;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;

public final class WorkspaceDefinitionSync {
  private static final Set<String> NON_RUNTIME_JS_SCRIPTS = Set.of(
      "build", "test", "lint", "typecheck", "check", "format", "preview");

  private WorkspaceDefinitionSync() {
  }

  public static void applyPortFromConfig(ServiceDefinition def, Path servicePath, PortExtractor portExtractor) {
    Optional<Integer> configPort = portExtractor.extract(servicePath);
    if (configPort.isEmpty()) {
      return;
    }
    int port = configPort.get();
    if (def.getEnv() == null) {
      def.setEnv(new HashMap<>());
    }
    def.getEnv().put("SERVER_PORT", String.valueOf(port));
    List<String> cmd = new ArrayList<>(def.getCommand());
    for (int i = 0; i < cmd.size(); i++) {
      if (cmd.get(i).startsWith("-Dspring-boot.run.arguments=--server.port=")) {
        cmd.set(i, "-Dspring-boot.run.arguments=--server.port=" + port);
        def.setCommand(cmd);
        return;
      }
    }
    boolean hasMvnw = Files.exists(servicePath.resolve("mvnw"))
        || Files.exists(servicePath.resolve("mvnw.cmd"))
        || Files.exists(servicePath.resolve("mvnw.bat"));
    String mvnCmd = hasMvnw ? "./mvnw" : "mvn";
    def.setCommand(
        List.of(mvnCmd, "-q", "-DskipTests", "-Dspring-boot.run.arguments=--server.port=" + port, "spring-boot:run"));
  }

  public static void mergeScannedWithPrevious(Map<String, ServiceDefinition> byName,
      Map<String, ServiceDefinition> previousByName) {
    for (ServiceDefinition def : byName.values()) {
      ServiceDefinition prev = previousByName.get(def.getName());
      if (prev == null) {
        continue;
      }
      Path defPath = Path.of(def.getPath()).toAbsolutePath().normalize();
      Path prevPath = Path.of(prev.getPath()).toAbsolutePath().normalize();
      if (!defPath.equals(prevPath)) {
        continue;
      }
      ProjectType pt = def.getProjectType();
      if (PhpLaunchCommands.isPhpProject(pt)) {
        def.setCustomPort(prev.getCustomPort());
        if (prev.getPhpHome() != null && !prev.getPhpHome().isBlank()) {
          def.setPhpHome(prev.getPhpHome());
        }
        if (prev.getPhpVersion() != null && !prev.getPhpVersion().isBlank()) {
          def.setPhpVersion(prev.getPhpVersion());
        }
        if (def.getAvailableScripts() != null && !def.getAvailableScripts().isEmpty()) {
          String preferred = prev.getSelectedScript();
          String runtimeScript = selectRuntimePhpScript(preferred, def.getAvailableScripts());
          if (runtimeScript != null) {
            PhpLaunchCommands.applySelection(def, runtimeScript);
          }
        }
        continue;
      }
      if (pt != null && pt != ProjectType.SPRING_BOOT && JsLaunchCommands.isJsProject(pt)) {
        def.setCustomPort(prev.getCustomPort());
        if (def.getAvailableScripts() != null && !def.getAvailableScripts().isEmpty()) {
          String preferred = prev.getSelectedScript();
          String runtimeScript = selectRuntimeJsScript(preferred, def.getAvailableScripts());
          if (runtimeScript != null) {
            JsLaunchCommands.applySelection(def, runtimeScript);
          }
        }
        continue;
      }
      if (prev.getJavaHome() != null && !prev.getJavaHome().isBlank()) {
        def.setJavaHome(prev.getJavaHome());
        if (prev.getJavaVersion() != null && !prev.getJavaVersion().isBlank()) {
          def.setJavaVersion(prev.getJavaVersion());
        }
      } else if (prev.getJavaVersion() != null && !prev.getJavaVersion().isBlank()
          && (def.getJavaVersion() == null || !prev.getJavaVersion().equals(def.getJavaVersion()))) {
        def.setJavaVersion(prev.getJavaVersion());
        def.setJavaHome(null);
      }
      if (prev.getUseMvnWrapper() != null) {
        def.setUseMvnWrapper(prev.getUseMvnWrapper());
        applyMvnWrapperPreference(def);
      }
    }
  }

  public static void applyMvnWrapperPreference(ServiceDefinition def) {
    if (def == null || def.getCommand() == null || def.getCommand().isEmpty()) return;
    if (def.getProjectType() != null && def.getProjectType() != ProjectType.SPRING_BOOT) return;
    boolean hasWrapper = MavenWrapperDetector.hasWrapper(def);
    boolean preferWrapper = def.getUseMvnWrapper() != null ? def.getUseMvnWrapper() : hasWrapper;
    boolean useWrapper = preferWrapper && hasWrapper;
    String desired = useWrapper ? "./mvnw" : "mvn";
    List<String> next = new ArrayList<>(def.getCommand());
    String first = next.get(0);
    if ("mvn".equalsIgnoreCase(first) || "./mvnw".equals(first) || "mvnw".equalsIgnoreCase(first)) {
      next.set(0, desired);
      def.setCommand(next);
    }
  }

  public static String selectRuntimeJsScript(String preferred, List<String> available) {
    if (available == null || available.isEmpty()) return null;
    if (preferred != null && !preferred.isBlank() && available.contains(preferred)
        && !NON_RUNTIME_JS_SCRIPTS.contains(preferred.toLowerCase())) {
      return preferred;
    }
    for (String candidate : List.of("dev", "start", "serve")) {
      if (available.contains(candidate)) return candidate;
    }
    for (String script : available) {
      if (!NON_RUNTIME_JS_SCRIPTS.contains(script.toLowerCase())) return script;
    }
    return available.get(0);
  }

  public static String selectRuntimePhpScript(String preferred, List<String> available) {
    if (available == null || available.isEmpty()) {
      return null;
    }
    if (preferred != null && !preferred.isBlank() && available.contains(preferred)
        && PhpProjectScanner.isRuntimeComposerScriptName(preferred)) {
      return preferred;
    }
    if (available.contains(PhpLaunchCommands.ARTISAN_SERVE)) {
      return PhpLaunchCommands.ARTISAN_SERVE;
    }
    for (String candidate : List.of("dev", "serve", "start")) {
      if (available.contains(candidate)) {
        return candidate;
      }
    }
    if (available.contains(PhpLaunchCommands.SYMFONY_SERVE)) {
      return PhpLaunchCommands.SYMFONY_SERVE;
    }
    if (available.contains(PhpLaunchCommands.PHP_BUILTIN_SERVE)) {
      return PhpLaunchCommands.PHP_BUILTIN_SERVE;
    }
    for (String script : available) {
      if (PhpProjectScanner.isRuntimeComposerScriptName(script)
          && !PhpLaunchCommands.isInternalScript(script)) {
        return script;
      }
    }
    return available.get(0);
  }
}
