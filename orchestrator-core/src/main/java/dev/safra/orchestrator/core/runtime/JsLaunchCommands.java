package dev.safra.orchestrator.core.runtime;

import java.nio.file.Path;
import java.util.List;

import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;

public final class JsLaunchCommands {
  private static final int DEFAULT_STATIC_PORT = 3000;

  private JsLaunchCommands() {
  }

  public static boolean isJsProject(ProjectType type) {
    return type != null && type != ProjectType.SPRING_BOOT && !PhpLaunchCommands.isPhpProject(type);
  }

  public static boolean usesNpmRun(ProjectType type) {
    return isJsProject(type) && type != ProjectType.STATIC_HTML && type != ProjectType.STANDALONE_JS;
  }

  public static void applySelection(ServiceDefinition def, String selected) {
    if (def == null || selected == null || selected.isBlank()) {
      return;
    }
    ProjectType type = def.getProjectType();
    def.setSelectedScript(selected);
    if (type == ProjectType.STATIC_HTML) {
      def.setCommand(staticHtmlCommand(selected, resolvePort(def)));
      return;
    }
    if (type == ProjectType.STANDALONE_JS) {
      def.setCommand(nodeFileCommand(selected));
      return;
    }
    if (def.getAvailableScripts() != null && !def.getAvailableScripts().isEmpty()) {
      String runtime = WorkspaceDefinitionSync.selectRuntimeJsScript(selected, def.getAvailableScripts());
      if (runtime != null) {
        def.setSelectedScript(runtime);
        def.setCommand(npmRunCommand(runtime));
      }
    }
  }

  public static List<String> npmRunCommand(String script) {
    return List.of("npm", "run", script);
  }

  public static List<String> staticHtmlCommand(String entryFile, int port) {
    if (entryFile == null || entryFile.isBlank() || "index.html".equalsIgnoreCase(entryFile)) {
      return List.of("npx", "--yes", "serve", ".", "-l", String.valueOf(port));
    }
    return List.of("npx", "--yes", "serve", entryFile, "-l", String.valueOf(port));
  }

  public static List<String> nodeFileCommand(String fileName) {
    return List.of("node", fileName);
  }

  public static int defaultPort(ProjectType type) {
    if (type == ProjectType.ANGULAR) {
      return 4200;
    }
    if (type == ProjectType.NEXT) {
      return 3000;
    }
    if (type == ProjectType.STATIC_HTML) {
      return DEFAULT_STATIC_PORT;
    }
    return DEFAULT_STATIC_PORT;
  }

  public static String defaultPortStrategy(ProjectType type) {
    if (type == ProjectType.STATIC_HTML) {
      return "CLI";
    }
    if (type == ProjectType.STANDALONE_JS) {
      return "UNSUPPORTED";
    }
    return "UNSUPPORTED";
  }

  private static int resolvePort(ServiceDefinition def) {
    if (def.getCustomPort() != null) {
      return def.getCustomPort();
    }
    if (def.getDetectedPort() != null) {
      return def.getDetectedPort();
    }
    return defaultPort(def.getProjectType());
  }

  public static ServiceDefinition buildStaticHtmlService(Path dir, Path logsDir, String entryFile, List<String> htmlEntries) {
    String serviceName = serviceNameFor(dir, entryFile);
    int port = defaultPort(ProjectType.STATIC_HTML);
    ServiceDefinition def = new ServiceDefinition();
    def.setName(serviceName);
    def.setPath(dir.toAbsolutePath().normalize().toString());
    def.setLogFile(logsDir.resolve(serviceName + ".log").toString());
    def.setContainerIds(new java.util.ArrayList<>());
    def.setProjectType(ProjectType.STATIC_HTML);
    def.setAvailableScripts(htmlEntries);
    def.setSelectedScript(entryFile);
    def.setDetectedPort(port);
    def.setPortStrategy("CLI");
    def.setCommand(staticHtmlCommand(entryFile, port));
    return def;
  }

  public static ServiceDefinition buildStandaloneJsService(Path dir, Path logsDir, String fileName) {
    String serviceName = serviceNameFor(dir, stripExtension(fileName));
    ServiceDefinition def = new ServiceDefinition();
    def.setName(serviceName);
    def.setPath(dir.toAbsolutePath().normalize().toString());
    def.setLogFile(logsDir.resolve(serviceName + ".log").toString());
    def.setContainerIds(new java.util.ArrayList<>());
    def.setProjectType(ProjectType.STANDALONE_JS);
    def.setAvailableScripts(List.of(fileName));
    def.setSelectedScript(fileName);
    def.setPortStrategy("UNSUPPORTED");
    def.setCommand(nodeFileCommand(fileName));
    return def;
  }

  static String serviceNameFor(Path dir, String suffix) {
    String folder = dir.getFileName() == null ? "app" : dir.getFileName().toString();
    if (suffix == null || suffix.isBlank() || "index.html".equalsIgnoreCase(suffix)) {
      return folder;
    }
    String safe = suffix.replace('.', '-').replace('/', '-');
    if (safe.equals(folder)) {
      return folder;
    }
    return folder + "-" + safe;
  }

  private static String stripExtension(String fileName) {
    int dot = fileName.lastIndexOf('.');
    return dot > 0 ? fileName.substring(0, dot) : fileName;
  }
}
