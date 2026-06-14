package dev.safra.orchestrator.model;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import lombok.Data;

@Data
public class Workspace {
  private List<String> roots = new ArrayList<>();
  private List<String> excludeDirs = new ArrayList<>();
  private List<ServiceDefinition> services = new ArrayList<>();
  private Map<String, Container> containers = new HashMap<>();
  private Set<String> removedServices = new HashSet<>();
  private List<String> serviceOrder = new ArrayList<>();
  private List<String> containerOrder = new ArrayList<>();
}
