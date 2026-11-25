package dev.safra.orchestrator.core.runtime.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.model.ServiceDefinition;
import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.model.ServiceView;
import dev.safra.orchestrator.model.Workspace;
import dev.safra.orchestrator.process.StopResult;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.BiConsumer;
import java.util.function.BiFunction;
import java.util.function.Supplier;

final class ServiceBatchOps {
  private final ServiceManager manager;
  private final ObjectMapper om;
  private final Map<String, ServiceDescriptor> services;
  private final Supplier<Workspace> workspaceSupplier;
  private final BiConsumer<String, JsonNode> emitEvent;

  ServiceBatchOps(ServiceManager manager, ObjectMapper om, Map<String, ServiceDescriptor> services,
      Supplier<Workspace> workspaceSupplier, BiConsumer<String, JsonNode> emitEvent) {
    this.manager = manager;
    this.om = om;
    this.services = services;
    this.workspaceSupplier = workspaceSupplier;
    this.emitEvent = emitEvent;
  }

  JsonNode startAll() {
    return om.valueToTree(applyEach(new ArrayList<>(services.values()), this::startView, this::viewOnError));
  }

  JsonNode stopAll() {
    List<StopResult> out = applyEach(new ArrayList<>(services.values()), this::stopResult, this::stopOnError);
    emitServicesChanged();
    return om.valueToTree(out);
  }

  JsonNode startByContainer(String containerId) {
    return om.valueToTree(applyEach(inContainer(containerId), this::startView, this::viewOnError));
  }

  JsonNode stopByContainer(String containerId) {
    List<StopResult> out = applyEach(inContainer(containerId), this::stopResult, this::stopOnError);
    emitServicesChanged();
    return om.valueToTree(out);
  }

  JsonNode restartByContainer(String containerId) {
    List<ServiceView> out = applyEach(inContainer(containerId), this::restartView, this::viewOnError);
    emitServicesChanged();
    return om.valueToTree(out);
  }

  JsonNode getByContainer(String containerId) {
    List<ServiceView> views = inContainer(containerId).stream().map(manager::toView).toList();
    return om.valueToTree(ServiceViewMapper.sortByOrder(views, workspaceSupplier.get().getServiceOrder()));
  }

  private List<ServiceDescriptor> inContainer(String containerId) {
    return services.values().stream().filter(sd -> hasContainer(sd, containerId)).toList();
  }

  private boolean hasContainer(ServiceDescriptor sd, String containerId) {
    ServiceDefinition def = sd.getDefinition();
    return def.getContainerIds() != null && def.getContainerIds().contains(containerId);
  }

  private <T> List<T> applyEach(Iterable<ServiceDescriptor> descriptors, ServiceAction<T> action,
      BiFunction<ServiceDescriptor, Exception, T> onError) {
    List<T> out = new ArrayList<>();
    for (ServiceDescriptor sd : descriptors) {
      try {
        out.add(action.apply(sd));
      } catch (Exception e) {
        out.add(onError.apply(sd, e));
      }
    }
    return out;
  }

  private ServiceView startView(ServiceDescriptor sd) throws Exception {
    return om.treeToValue(manager.start(sd.getDefinition().getName()), ServiceView.class);
  }

  private ServiceView restartView(ServiceDescriptor sd) throws Exception {
    return om.treeToValue(manager.restart(sd.getDefinition().getName()), ServiceView.class);
  }

  private StopResult stopResult(ServiceDescriptor sd) throws Exception {
    return om.treeToValue(manager.stop(sd.getDefinition().getName()), StopResult.class);
  }

  private ServiceView viewOnError(ServiceDescriptor sd, Exception ignored) {
    return manager.toView(sd);
  }

  private StopResult stopOnError(ServiceDescriptor sd, Exception e) {
    return StopResult.failed(
        sd.getRuntime().getPid() != null ? sd.getRuntime().getPid() : 0,
        "Erro ao parar: " + e.getMessage());
  }

  private void emitServicesChanged() {
    List<ServiceView> views = ServiceViewMapper.sortByOrder(
        services.values().stream().map(manager::toView).toList(),
        workspaceSupplier.get().getServiceOrder());
    emitEvent.accept("services", om.valueToTree(views));
  }

  @FunctionalInterface
  private interface ServiceAction<T> {
    T apply(ServiceDescriptor sd) throws Exception;
  }
}
