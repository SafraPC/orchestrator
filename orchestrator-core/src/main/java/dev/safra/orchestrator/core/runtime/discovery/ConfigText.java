package dev.safra.orchestrator.core.runtime.discovery;

public final class ConfigText {
  private ConfigText() {
  }

  public static String stripQuotes(String value) {
    if (value == null) {
      return null;
    }

    if (value.length() >= 2
        && ((value.startsWith("\"") && value.endsWith("\""))
            || (value.startsWith("'") && value.endsWith("'")))) {
      return value.substring(1, value.length() - 1);
    }

    return value;
  }
}
