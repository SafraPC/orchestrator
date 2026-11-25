package dev.safra.orchestrator.process;

import java.io.File;

final class ProcessOs {
  private ProcessOs() {
  }

  static boolean isWindows() {
    return System.getProperty("os.name").toLowerCase().contains("win");
  }

  static String prependPath(String path, String entry) {
    if (entry == null || entry.isBlank()) {
      return path;
    }
    if (path == null || path.isBlank()) {
      return entry;
    }
    return entry + File.pathSeparator + path;
  }
}
