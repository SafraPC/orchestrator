package dev.safra.orchestrator.core.runtime;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;

import dev.safra.orchestrator.model.ProjectType;
import dev.safra.orchestrator.model.ServiceDefinition;

public final class PhpLaunchCommands {
  public static final String ARTISAN_SERVE = "artisan:serve";
  public static final String SYMFONY_SERVE = "symfony:serve";
  public static final String PHP_BUILTIN_SERVE = "php:serve";
  private static final int DEFAULT_PORT = 8000;

  private PhpLaunchCommands() {
  }

  public static boolean isPhpProject(ProjectType type) {
    return type == ProjectType.LARAVEL
        || type == ProjectType.SYMFONY
        || type == ProjectType.PHP_COMPOSER
        || type == ProjectType.STANDALONE_PHP;
  }

  public static boolean usesComposerRun(ProjectType type) {
    return type == ProjectType.PHP_COMPOSER
        || type == ProjectType.LARAVEL
        || type == ProjectType.SYMFONY;
  }

  public static boolean isInternalScript(String scriptId) {
    return ARTISAN_SERVE.equals(scriptId)
        || SYMFONY_SERVE.equals(scriptId)
        || PHP_BUILTIN_SERVE.equals(scriptId);
  }

  public static void applySelection(ServiceDefinition def, String selected) {
    if (def == null || selected == null || selected.isBlank()) {
      return;
    }
    ProjectType type = def.getProjectType();
    if (!isPhpProject(type)) {
      return;
    }
    def.setSelectedScript(selected);
    int port = resolvePort(def);
    if (ARTISAN_SERVE.equals(selected)) {
      def.setCommand(artisanServeCommand(port));
      return;
    }
    if (SYMFONY_SERVE.equals(selected)) {
      def.setCommand(symfonyServeCommand(port, def.getPath()));
      return;
    }
    if (PHP_BUILTIN_SERVE.equals(selected)) {
      def.setCommand(builtinServerCommand(resolvePublicDocroot(Path.of(def.getPath())), port));
      return;
    }
    if (type == ProjectType.STANDALONE_PHP) {
      def.setCommand(builtinServerCommand(resolveDocroot(def), port));
      return;
    }
    if (def.getAvailableScripts() != null && def.getAvailableScripts().contains(selected)) {
      def.setCommand(composerRunCommand(selected));
    }
  }

  public static List<String> artisanServeCommand(int port) {
    return List.of("php", "artisan", "serve", "--host=127.0.0.1", "--port=" + port);
  }

  public static List<String> composerRunCommand(String script) {
    return List.of("composer", "run", script);
  }

  public static List<String> symfonyServeCommand(int port, String projectPath) {
    if (isSymfonyCliAvailable()) {
      return List.of("symfony", "server:start", "--port=" + port, "--no-tls");
    }
    return builtinServerCommand(resolvePublicDocroot(Path.of(projectPath)), port);
  }

  public static List<String> builtinServerCommand(String docroot, int port) {
    return List.of("php", "-S", "127.0.0.1:" + port, "-t", docroot);
  }

  public static int defaultPort(ProjectType type) {
    return DEFAULT_PORT;
  }

  public static String defaultPortStrategy(ProjectType type) {
    if (type == ProjectType.STANDALONE_PHP) {
      return "CLI";
    }
    if (isPhpProject(type)) {
      return "CLI";
    }
    return "UNSUPPORTED";
  }

  public static boolean isSymfonyCliAvailable() {
    try {
      Process p = new ProcessBuilder("symfony", "version").redirectErrorStream(true).start();
      if (!p.waitFor(3, TimeUnit.SECONDS)) {
        p.destroyForcibly();
        return false;
      }
      return p.exitValue() == 0;
    } catch (Exception e) {
      return false;
    }
  }

  public static String resolvePublicDocroot(Path dir) {
    Path publicDir = dir.resolve("public");
    if (Files.isDirectory(publicDir)) {
      return "public";
    }
    return ".";
  }

  private static String resolveDocroot(ServiceDefinition def) {
    if (def.getEnv() != null && def.getEnv().containsKey("PHP_DOCROOT")) {
      return def.getEnv().get("PHP_DOCROOT");
    }
    return resolvePublicDocroot(Path.of(def.getPath()));
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

  public static ServiceDefinition buildStandalonePhpService(Path dir, Path logsDir, String docroot) {
    String serviceName = dir.getFileName() == null ? "php-app" : dir.getFileName().toString();
    int port = defaultPort(ProjectType.STANDALONE_PHP);
    ServiceDefinition def = new ServiceDefinition();
    def.setName(serviceName);
    def.setPath(dir.toAbsolutePath().normalize().toString());
    def.setLogFile(logsDir.resolve(serviceName + ".log").toString());
    def.setContainerIds(new java.util.ArrayList<>());
    def.setProjectType(ProjectType.STANDALONE_PHP);
    def.setAvailableScripts(List.of(docroot));
    def.setSelectedScript(docroot);
    def.setDetectedPort(port);
    def.setPortStrategy("CLI");
    java.util.Map<String, String> env = new java.util.HashMap<>();
    env.put("PHP_DOCROOT", docroot);
    def.setEnv(env);
    def.setCommand(builtinServerCommand(docroot, port));
    return def;
  }
}
