package dev.safra.orchestrator.core.runtime.workspace;

import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.Workspace;
import java.util.ArrayList;
import java.util.List;

final class WorkspaceOrder {
  private WorkspaceOrder() {
  }

  static void syncServices(Workspace workspace) {
    if (workspace.getServiceOrder() == null) {
      workspace.setServiceOrder(new ArrayList<>());
    }
    List<String> order = workspace.getServiceOrder();
    List<String> existing = workspace.getServices().stream().map(ServiceDefinition::getName).toList();
    order.retainAll(existing);
    existing.stream().filter(n -> !order.contains(n)).forEach(order::add);
  }

  static void syncContainers(Workspace workspace) {
    if (workspace.getContainerOrder() == null) {
      workspace.setContainerOrder(new ArrayList<>());
    }
    List<String> order = workspace.getContainerOrder();
    List<String> existing = new ArrayList<>(workspace.getContainers().keySet());
    order.retainAll(existing);
    existing.stream().filter(id -> !order.contains(id)).forEach(order::add);
  }
}
