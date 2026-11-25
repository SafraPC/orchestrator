package dev.safra.orchestrator.core.runtime.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.Workspace;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class WorkspaceOrderTest {

  @Test
  void initializesNullOrderFromExistingServices() {
    Workspace workspace = new Workspace();
    workspace.setServiceOrder(null);
    workspace.setServices(List.of(named("a"), named("b")));

    WorkspaceOrder.syncServices(workspace);

    assertNotNull(workspace.getServiceOrder());
    assertEquals(List.of("a", "b"), workspace.getServiceOrder());
  }

  @Test
  void dropsStaleKeepsRelativeOrderAndAppendsMissing() {
    Workspace workspace = new Workspace();
    workspace.setServiceOrder(new ArrayList<>(List.of("gone", "b", "a", "also-gone")));
    workspace.setServices(List.of(named("a"), named("b"), named("c")));

    WorkspaceOrder.syncServices(workspace);

    assertEquals(List.of("b", "a", "c"), workspace.getServiceOrder());
  }

  private static ServiceDefinition named(String name) {
    ServiceDefinition def = new ServiceDefinition();
    def.setName(name);
    return def;
  }
}
