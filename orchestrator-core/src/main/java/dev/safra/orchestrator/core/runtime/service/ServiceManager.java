package dev.safra.orchestrator.core.runtime.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.core.runtime.logs.LogManager;
import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.model.ServiceRuntime;
import dev.safra.orchestrator.model.ServiceStatus;
import dev.safra.orchestrator.model.ServiceView;
import dev.safra.orchestrator.model.Workspace;
import dev.safra.orchestrator.process.ProcessManager;
import dev.safra.orchestrator.process.StopResult;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.function.Supplier;

public class ServiceManager {
  private final ObjectMapper om;
  private final ProcessManager processManager;
  private final LogManager logManager;
  private final BiConsumer<String, JsonNode> emitEvent;
  private final Map<String, ServiceDescriptor> services;
  private final Runnable persistRuntime;
  private final Runnable persistWorkspace;
  private final Supplier<Workspace> workspaceSupplier;
  private final ServiceBatchOps batchOps;

  public ServiceManager(ObjectMapper om, ProcessManager processManager, LogManager logManager,
      BiConsumer<String, JsonNode> emitEvent, Map<String, ServiceDescriptor> services,
      Runnable persistRuntime, Runnable persistWorkspace, Supplier<Workspace> workspaceSupplier) {
    this.om = om;
    this.processManager = processManager;
    this.logManager = logManager;
    this.emitEvent = emitEvent;
    this.services = services;
    this.persistRuntime = persistRuntime;
    this.persistWorkspace = persistWorkspace;
    this.workspaceSupplier = workspaceSupplier;
    this.batchOps = new ServiceBatchOps(this, om, services, workspaceSupplier, emitEvent);
  }

  public JsonNode list() {
    return om.valueToTree(sortedViews(services.values().stream().map(this::toView).toList()));
  }

  public JsonNode start(String name) {
    ServiceDescriptor sd = requireService(name);
    ServiceRuntime rt = sd.getRuntime();
    ServiceLaunchPrep.prepare(sd.getDefinition(), persistWorkspace);

    Long stalePid = null;

    if (rt.getPid() != null) {
      if (processManager.isAlive(rt.getPid())) {
        return om.valueToTree(toView(sd));
      }
      stalePid = rt.getPid();
      rt.setPid(null);
      rt.setStatus(ServiceStatus.STOPPED);
    }

    logManager.emitLogStatus(name, "Iniciando serviço " + name + "...");

    try {
      long pid = processManager.start(sd.getDefinition(), stalePid, exitedPid ->
          ServiceHealthCheck.onProcessExit(
              name, exitedPid, sd, logManager, persistRuntime, services, emitEvent, om));
      rt.setPid(pid);
      rt.setStatus(ServiceStatus.RUNNING);
      rt.setLastStartAt(Instant.now());
      rt.setLastError(null);

      logManager.emitLogStatus(name, "Processo iniciado com PID: " + pid);
      persistRuntime.run();
      emitServiceChanged(name);

      return om.valueToTree(toView(sd));
    } catch (Exception e) {
      rt.setStatus(ServiceStatus.ERROR);
      rt.setLastError(e.getMessage());
      rt.setPid(null);
      logManager.emitLogStatus(name, "Erro ao iniciar: " + e.getMessage());
      persistRuntime.run();
      emitServiceChanged(name);
      throw new IllegalStateException("Falha ao iniciar serviço: " + name + " - " + e.getMessage(), e);
    }
  }

  public JsonNode stop(String name) {
    ServiceDescriptor sd = requireService(name);
    ServiceRuntime rt = sd.getRuntime();
    Long pid = rt.getPid();

    StopResult r = pid == null ? StopResult.noPid() : processManager.stop(pid);

    if (r.isOk()) {
      rt.setPid(null);
      rt.setStatus(ServiceStatus.STOPPED);
      rt.setLastStopAt(Instant.now());
    } else {
      rt.setStatus(ServiceStatus.ERROR);
      rt.setLastError(r.getMessage());
    }

    persistRuntime.run();
    emitServiceChanged(name);
    return om.valueToTree(r);
  }

  public JsonNode restart(String name) {
    ServiceDescriptor sd = requireService(name);
    Long pid = sd.getRuntime().getPid();
    stop(name);

    if (pid != null && processManager.isAlive(pid)) {
      processManager.stop(pid);
      sd.getRuntime().setPid(null);
      sd.getRuntime().setStatus(ServiceStatus.STOPPED);
      persistRuntime.run();
    }

    return start(name);
  }

  public JsonNode startAll() {
    return batchOps.startAll();
  }

  public JsonNode stopAll() {
    return batchOps.stopAll();
  }

  public void stopLeftoverProcesses() {
    for (ServiceDescriptor sd : services.values()) {
      Long pid = sd.getRuntime().getPid();

      if (pid == null) {
        continue;
      }

      processManager.stop(pid);
      ServiceRuntime rt = sd.getRuntime();
      rt.setPid(null);
      rt.setStatus(ServiceStatus.STOPPED);
    }

    persistRuntime.run();
  }

  public JsonNode remove(String name) {
    detachService(name);
    Workspace ws = workspaceSupplier.get();
    ws.getServices().removeIf(d -> d.getName().equals(name));
    ws.getRemovedServices().add(name);
    persistWorkspace.run();
    persistRuntime.run();
    emitServicesChanged();
    return list();
  }

  public JsonNode removeMany(List<String> names) {
    if (names == null || names.isEmpty()) {
      throw new IllegalArgumentException("params.names é obrigatório");
    }
    Set<String> toRemove = new HashSet<>(names);
    for (String name : toRemove) {
      detachService(name);
    }
    Workspace ws = workspaceSupplier.get();
    ws.getServices().removeIf(d -> toRemove.contains(d.getName()));
    ws.getRemovedServices().addAll(toRemove);
    persistWorkspace.run();
    persistRuntime.run();
    emitServicesChanged();
    return list();
  }

  public JsonNode startByContainer(String containerId) {
    return batchOps.startByContainer(containerId);
  }

  public JsonNode stopByContainer(String containerId) {
    return batchOps.stopByContainer(containerId);
  }

  public JsonNode restartByContainer(String containerId) {
    return batchOps.restartByContainer(containerId);
  }

  public JsonNode getByContainer(String containerId) {
    return batchOps.getByContainer(containerId);
  }

  public ServiceDescriptor requireService(String name) {
    ServiceDescriptor sd = services.get(name);
    if (sd == null) {
      throw new IllegalArgumentException("Serviço não encontrado: " + name);
    }
    return sd;
  }

  public void refreshStatuses() {
    for (ServiceDescriptor sd : services.values()) {
      ServiceRuntime rt = sd.getRuntime();
      if (rt.getPid() != null) {
        if (!processManager.isAlive(rt.getPid()) && rt.getStatus() == ServiceStatus.RUNNING) {
          rt.setStatus(ServiceStatus.STOPPED);
          rt.setPid(null);
          rt.setLastStopAt(Instant.now());
          emitServiceChanged(sd.getDefinition().getName());
        }
      } else if (rt.getStatus() == ServiceStatus.RUNNING) {
        rt.setStatus(ServiceStatus.STOPPED);
        emitServiceChanged(sd.getDefinition().getName());
      }
    }
  }

  public ServiceView toView(ServiceDescriptor sd) {
    return ServiceViewMapper.fromDescriptor(sd);
  }

  private void detachService(String name) {
    ServiceDescriptor sd = services.remove(name);
    if (sd == null) {
      return;
    }
    Long pid = sd.getRuntime().getPid();
    if (pid != null) {
      processManager.stop(pid);
    }
    if (sd.getDefinition().getContainerIds() != null) {
      sd.getDefinition().getContainerIds().clear();
    }
    logManager.removeSubscriptionsFor(name);
  }

  private void emitServiceChanged(String name) {
    ServiceDescriptor sd = services.get(name);
    if (sd != null) {
      emitEvent.accept("service", om.valueToTree(toView(sd)));
    }
  }

  private void emitServicesChanged() {
    List<ServiceView> views = sortedViews(services.values().stream().map(this::toView).toList());
    emitEvent.accept("services", om.valueToTree(views));
  }

  private List<ServiceView> sortedViews(List<ServiceView> views) {
    return ServiceViewMapper.sortByOrder(views, workspaceSupplier.get().getServiceOrder());
  }
}
