package dev.safra.orchestrator.model;

import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class ServicesConfig {
  private List<ServiceDefinition> services = new ArrayList<>();
}

