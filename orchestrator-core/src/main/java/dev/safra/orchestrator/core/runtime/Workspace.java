package dev.safra.orchestrator.core.runtime;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.Data;
import dev.safra.orchestrator.model.Container;

@Data
public class Workspace {
  private List<String> roots = new ArrayList<>();
  private List<String> excludeDirs = new ArrayList<>();
  private List<dev.safra.orchestrator.model.ServiceDefinition> services = new ArrayList<>();
  private Map<String, Container> containers = new HashMap<>();
}

