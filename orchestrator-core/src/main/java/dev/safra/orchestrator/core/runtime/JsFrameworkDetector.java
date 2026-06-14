package dev.safra.orchestrator.core.runtime;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import com.fasterxml.jackson.databind.JsonNode;

import dev.safra.orchestrator.model.ProjectType;

public final class JsFrameworkDetector {
  private static final Set<ProjectType> ENV_PORT_TYPES = Set.of(
      ProjectType.EXPRESS,
      ProjectType.FASTIFY,
      ProjectType.HONO,
      ProjectType.REMIX);

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
    if (type == ProjectType.ASTRO || type == ProjectType.SVELTE || type == ProjectType.ANGULAR
        || type == ProjectType.NEXT) {
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
    if (cmd.contains("astro")) {
      return "CLI";
    }
    if (cmd.contains("vite") || cmd.contains("svelte-kit")) {
      return "CLI";
    }
    if (cmd.contains("next ")) {
      return "CLI";
    }
    if (cmd.startsWith("next")) {
      return "CLI";
    }
    if (cmd.contains("nuxt")) {
      return "CLI";
    }
    if (cmd.contains("ng serve") || cmd.contains("@angular/cli")) {
      return "CLI";
    }
    if (cmd.contains("webpack serve") || cmd.contains("webpack-dev-server")) {
      return "CLI";
    }
    if (cmd.contains("vue-cli-service serve")) {
      return "CLI";
    }
    if (cmd.contains("react-scripts start")) {
      return "ENV";
    }
    if (type == ProjectType.ANGULAR && cmd.contains("serve")) {
      return "CLI";
    }
    return "UNSUPPORTED";
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
}
