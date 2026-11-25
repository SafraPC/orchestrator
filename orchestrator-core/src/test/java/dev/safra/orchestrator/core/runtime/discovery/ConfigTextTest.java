package dev.safra.orchestrator.core.runtime.discovery;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class ConfigTextTest {

  @Test
  void stripQuotesRemovesMatchingWrappers() {
    assertEquals("8080", ConfigText.stripQuotes("\"8080\""));
    assertEquals("8080", ConfigText.stripQuotes("'8080'"));
    assertEquals("8080", ConfigText.stripQuotes("8080"));
  }

  @Test
  void stripQuotesLeavesNullEmptyAndSingleQuote() {
    assertNull(ConfigText.stripQuotes(null));
    assertEquals("", ConfigText.stripQuotes(""));
    assertEquals("\"", ConfigText.stripQuotes("\""));
  }
}
