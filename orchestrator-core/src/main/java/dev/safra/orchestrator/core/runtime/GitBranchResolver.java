package dev.safra.orchestrator.core.runtime;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import dev.safra.orchestrator.model.ServiceDescriptor;

public class GitBranchResolver {
  public Map<String, String> list(Map<String, ServiceDescriptor> services) {
    Map<String, String> branches = new LinkedHashMap<>();
    for (ServiceDescriptor descriptor : services.values()) {
      branches.put(descriptor.getDefinition().getName(), resolve(descriptor.getDefinition().getPath()));
    }
    return branches;
  }

  private String resolve(String rawPath) {
    try {
      Path path = Path.of(rawPath).toAbsolutePath().normalize();
      if (!Files.exists(path.resolve(".git"))) {
        return null;
      }
      Process process = new ProcessBuilder("git", "-C", path.toString(), "branch", "--show-current")
          .redirectErrorStream(true)
          .start();
      if (!process.waitFor(2, TimeUnit.SECONDS)) {
        process.destroyForcibly();
        return null;
      }
      if (process.exitValue() != 0) {
        return null;
      }
      String branch = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8).trim();
      return branch.isBlank() ? null : branch;
    } catch (Exception ignored) {
      return null;
    }
  }
}
