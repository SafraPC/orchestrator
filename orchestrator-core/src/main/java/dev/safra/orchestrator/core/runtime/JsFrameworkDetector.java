package dev.safra.orchestrator.core.runtime;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;

import dev.safra.orchestrator.model.ProjectType;

public final class JsFrameworkDetector {
  private static final Set<ProjectType> ENV_PORT_TYPES = Set.of(
      ProjectType.EXPRESS,
      ProjectType.FASTIFY,
      ProjectType.HONO,
      ProjectType.REMIX);
  private static final Set<ProjectType> CLI_PORT_TYPES = Set.of(
      ProjectType.ASTRO,
      ProjectType.SVELTE,
      ProjectType.ANGULAR,
      ProjectType.NEXT);
  private static final List<CommandStrategy> COMMAND_STRATEGIES = List.of(
      new CommandStrategy("CLI", List.of(
          "astro",
          "vite",
          "svelte-kit",
          "next ",
          "nuxt",
          "ng serve",
          "@angular/cli",
          "webpack serve",
          "webpack-dev-server",
          "vue-cli-service serve"), List.of("next")),
      new CommandStrategy("ENV", List.of("react-scripts start"), List.of()));
  private static final Map<ProjectType, List<String>> CLI_TYPE_COMMANDS = Map.of(
      ProjectType.ANGULAR, List.of("serve"));

  private JsFrameworkDetector() {
  }

  public static ProjectType detect(Path dir, JsonNode root) {
    JsonNode deps = root.path("dependencies");
    JsonNode devDeps = root.path("devDependencies");

    if (has(deps, devDeps, "next")) {
      return ProjectType.NEXT;
    }
    if (has(deps, devDeps, "@nestjs/core")) {
      return ProjectType.NEST;
    }
    if (has(deps, devDeps, "@remix-run/node") || has(deps, devDeps, "@remix-run/react")
        || has(deps, devDeps, "@remix-run/serve")) {
      return ProjectType.REMIX;
    }
    if (isAngular(dir, deps, devDeps)) {
      return ProjectType.ANGULAR;
    }
    if (has(deps, devDeps, "astro")) {
      return ProjectType.ASTRO;
    }
    if (isSvelte(dir, deps, devDeps)) {
      return ProjectType.SVELTE;
    }
    if (has(deps, devDeps, "fastify")) {
      return ProjectType.FASTIFY;
    }
    if (has(deps, devDeps, "hono")) {
      return ProjectType.HONO;
    }
    if (has(deps, devDeps, "express")) {
      return ProjectType.EXPRESS;
    }
    if (has(deps, devDeps, "vue")) {
      return ProjectType.VUE;
    }
    if (has(deps, devDeps, "react")) {
      return ProjectType.REACT;
    }
    return null;
  }

  public static int defaultPort(ProjectType type) {
    if (type == null) {
      return 3000;
    }
    return switch (type) {
      case ANGULAR -> 4200;
      case ASTRO -> 4321;
      case SVELTE -> 5173;
      case NEXT, NEST, REMIX, EXPRESS, FASTIFY, HONO, REACT, VUE, UNKNOWN -> 3000;
      default -> 3000;
    };
  }

  public static String defaultPortStrategy(ProjectType type) {
    if (type == null) {
      return "UNSUPPORTED";
    }
    if (ENV_PORT_TYPES.contains(type)) {
      return "ENV";
    }
    if (CLI_PORT_TYPES.contains(type)) {
      return "CLI";
    }
    return "UNSUPPORTED";
  }

  public static String resolvePortStrategy(String scriptCommand, ProjectType type) {
    String typed = defaultPortStrategy(type);
    if ("ENV".equals(typed) || "CLI".equals(typed)) {
      return typed;
    }
    String cmd = scriptCommand == null ? "" : scriptCommand.toLowerCase(Locale.ROOT);
    String commandStrategy = resolveCommandStrategy(cmd);
    if (commandStrategy != null) {
      return commandStrategy;
    }
    if (CLI_TYPE_COMMANDS.getOrDefault(type, List.of()).stream().anyMatch(cmd::contains)) {
      return "CLI";
    }
    return "UNSUPPORTED";
  }

  public static boolean usesVite(JsonNode root, String scriptCommand) {
    String cmd = scriptCommand == null ? "" : scriptCommand.toLowerCase(Locale.ROOT);
    return cmd.contains("vite") || has(root.path("dependencies"), root.path("devDependencies"), "vite");
  }

  public static List<String> preferredScripts(ProjectType type) {
    if (type == null) {
      return List.of("dev", "start", "serve");
    }
    return switch (type) {
      case NEST -> List.of("start:dev", "start:debug", "dev", "start", "serve");
      case ANGULAR -> List.of("start", "serve", "dev");
      case ASTRO, SVELTE, REMIX, EXPRESS, FASTIFY, HONO -> List.of("dev", "start", "serve");
      default -> List.of("dev", "start", "serve");
    };
  }

  private static boolean isAngular(Path dir, JsonNode deps, JsonNode devDeps) {
    if (Files.isRegularFile(dir.resolve("angular.json"))) {
      return true;
    }
    return has(deps, devDeps, "@angular/core") || has(deps, devDeps, "@angular/cli");
  }

  private static boolean isSvelte(Path dir, JsonNode deps, JsonNode devDeps) {
    if (has(deps, devDeps, "@sveltejs/kit")) {
      return true;
    }
    if (!has(deps, devDeps, "svelte")) {
      return false;
    }
    return Files.isRegularFile(dir.resolve("svelte.config.js"))
        || Files.isRegularFile(dir.resolve("svelte.config.ts"))
        || Files.isRegularFile(dir.resolve("svelte.config.mjs"));
  }

  private static boolean has(JsonNode deps, JsonNode devDeps, String name) {
    return hasDep(deps, name) || hasDep(devDeps, name);
  }

  private static boolean hasDep(JsonNode deps, String name) {
    return deps != null && deps.has(name);
  }

  private static String resolveCommandStrategy(String cmd) {
    return COMMAND_STRATEGIES.stream()
        .filter(strategy -> strategy.matches(cmd))
        .map(CommandStrategy::name)
        .findFirst()
        .orElse(null);
  }

  private record CommandStrategy(String name, List<String> includes, List<String> prefixes) {
    private boolean matches(String cmd) {
      return includes.stream().anyMatch(cmd::contains) || prefixes.stream().anyMatch(cmd::startsWith);
    }
  }
}
