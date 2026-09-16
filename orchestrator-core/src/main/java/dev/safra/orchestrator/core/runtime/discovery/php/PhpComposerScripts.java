package dev.safra.orchestrator.core.runtime.discovery.php;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

public final class PhpComposerScripts {
  private static final Set<String> NON_RUNTIME_SCRIPTS = Set.of(
      "test", "tests", "lint", "cs-fix", "cs", "stan", "phpstan", "psalm", "check", "format",
      "analyse", "analysis", "static-analysis", "qa", "quality", "rector", "pest", "phpunit",
      "php-cs-fixer", "deptrac", "infection", "fix",
      "post-autoload-dump", "post-root-package-install", "post-create-project-cmd",
      "post-update-cmd", "pre-autoload-dump", "install-cmd");

  private PhpComposerScripts() {
  }

  public static boolean isRuntimeScriptName(String name) {
    if (name == null || name.isBlank()) {
      return false;
    }
    String lower = name.toLowerCase(Locale.ROOT);
    if (NON_RUNTIME_SCRIPTS.contains(lower)) {
      return false;
    }
    if (lower.startsWith("post-") || lower.startsWith("pre-")) {
      return false;
    }
    if (lower.contains("analys") || lower.contains("stan") || lower.contains("lint")
        || lower.contains("test") || lower.contains("format") || lower.contains("cs-fix")) {
      return false;
    }
    return true;
  }

  public static List<String> extractRuntimeScripts(JsonNode root) {
    JsonNode scripts = root.path("scripts");
    if (!scripts.isObject()) {
      return List.of();
    }
    List<String> out = new ArrayList<>();
    scripts.fieldNames().forEachRemaining(name -> {
      if (isRuntimeScript(name, scripts.get(name))) {
        out.add(name);
      }
    });
    return out;
  }

  private static boolean isRuntimeScript(String name, JsonNode scriptNode) {
    if (!isRuntimeScriptName(name)) {
      return false;
    }
    String body = scriptBody(scriptNode).toLowerCase(Locale.ROOT);
    if (body.contains("phpstan") || body.contains("psalm") || body.contains("phpunit")
        || body.contains("pest ") || body.contains("php-cs-fixer") || body.contains("rector")
        || body.contains("deptrac") || body.contains("infection")) {
      return false;
    }
    return true;
  }

  private static String scriptBody(JsonNode scriptNode) {
    if (scriptNode == null || scriptNode.isNull()) {
      return "";
    }
    if (scriptNode.isTextual()) {
      return scriptNode.asText("");
    }
    if (scriptNode.isArray()) {
      StringBuilder sb = new StringBuilder();
      for (JsonNode entry : scriptNode) {
        sb.append(entry.asText("")).append(" ");
      }
      return sb.toString();
    }
    return scriptNode.toString();
  }
}
