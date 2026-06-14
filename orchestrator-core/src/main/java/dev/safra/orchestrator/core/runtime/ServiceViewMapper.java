package dev.safra.orchestrator.core.runtime;

import java.util.Comparator;
import java.util.List;

import dev.safra.orchestrator.model.ServiceDescriptor;
import dev.safra.orchestrator.model.ServiceView;

public final class ServiceViewMapper {
  private ServiceViewMapper() {}

  public static ServiceView fromDescriptor(ServiceDescriptor sd) {
    var definition = sd.getDefinition();
    var runtime = sd.getRuntime();
    return new ServiceView(
        definition.getName(), definition.getPath(), definition.getCommand(), definition.getLogFile(),
        definition.getEnv(), definition.getDetectedPort(), definition.getCustomPort(), definition.getPortStrategy(),
        definition.getJavaHome(), definition.getJavaVersion(), definition.getContainerIds(),
        definition.getProjectType(), definition.getAvailableScripts(), definition.getSelectedScript(),
        MavenWrapperDetector.usesWrapper(definition), MavenWrapperDetector.hasWrapper(definition),
        runtime.getPid(), runtime.getStatus(), runtime.getLastStartAt(), runtime.getLastStopAt(), runtime.getLastError());
  }

  public static List<ServiceView> sortByOrder(List<ServiceView> views, List<String> order) {
    if (order == null || order.isEmpty())
      return views;
    return views.stream()
        .sorted(Comparator.comparingInt(view -> {
          int idx = order.indexOf(view.name());
          return idx >= 0 ? idx : Integer.MAX_VALUE;
        }))
        .toList();
  }
}
