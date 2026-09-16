package dev.safra.orchestrator.core.runtime.docker;

import dev.safra.orchestrator.model.docker.DockerOperationResult;
import dev.safra.orchestrator.model.docker.DockerResourceKind;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

public class DockerResourceActions {
  private static final Duration LIFECYCLE_TIMEOUT = Duration.ofSeconds(60);
  private static final Duration REMOVE_TIMEOUT = Duration.ofSeconds(90);
  private static final Duration PRUNE_TIMEOUT = Duration.ofMinutes(5);

  private final DockerCli cli;

  public DockerResourceActions(DockerCli cli) {
    this.cli = cli;
  }

  public DockerOperationResult startContainer(String id) {
    return lifecycle("start", id, "Container iniciado");
  }

  public DockerOperationResult stopContainer(String id) {
    return lifecycle("stop", id, "Container parado");
  }

  public DockerOperationResult restartContainer(String id) {
    return lifecycle("restart", id, "Container reiniciado");
  }

  public List<DockerOperationResult> remove(List<ResourceTarget> targets, boolean force) {
    List<DockerOperationResult> results = new ArrayList<>();
    for (ResourceTarget target : orderForRemoval(targets))
      results.add(removeOne(target, force));
    return results;
  }

  static List<ResourceTarget> orderForRemoval(List<ResourceTarget> targets) {
    List<ResourceTarget> ordered = new ArrayList<>(targets);
    ordered.sort(Comparator.comparingInt(target -> target.kind().ordinal()));
    return ordered;
  }

  public List<DockerOperationResult> prune(List<String> scopes, boolean removeUnusedImages) {
    List<DockerOperationResult> results = new ArrayList<>();
    for (String scope : scopes) {
      String normalized = scope == null ? "" : scope.trim().toUpperCase(Locale.ROOT);
      switch (normalized) {
        case "CONTAINERS" -> results.add(runPrune("CONTAINERS", "Containers parados removidos",
            List.of("container", "prune", "--force")));
        case "IMAGES" -> results.add(runPrune("IMAGES", "Imagens removidas", removeUnusedImages
            ? List.of("image", "prune", "--all", "--force")
            : List.of("image", "prune", "--force")));
        case "VOLUMES" -> results.add(runPrune("VOLUMES", "Volumes não utilizados removidos",
            List.of("volume", "prune", "--all", "--force")));
        case "BUILD_CACHE" -> results.add(runPrune("BUILD_CACHE", "Cache de build removido",
            List.of("builder", "prune", "--all", "--force")));
        case "NETWORKS" -> results.add(runPrune("NETWORKS", "Redes não utilizadas removidas",
            List.of("network", "prune", "--force")));
        default -> results.add(DockerOperationResult.failed("PRUNE", normalized, "Escopo de limpeza inválido."));
      }
    }
    return results;
  }

  private DockerOperationResult removeOne(ResourceTarget target, boolean force) {
    List<String> args = switch (target.kind()) {
      case CONTAINER -> force
          ? List.of("rm", "--force", "--volumes", target.id())
          : List.of("rm", target.id());
      case IMAGE -> force
          ? List.of("image", "rm", "--force", target.id())
          : List.of("image", "rm", target.id());
      case VOLUME -> force
          ? List.of("volume", "rm", "--force", target.id())
          : List.of("volume", "rm", target.id());
    };
    DockerCli.Result result = cli.docker(args, REMOVE_TIMEOUT);
    String kind = target.kind().name();
    if (result.succeeded())
      return DockerOperationResult.ok(kind, target.id(), removedMessage(target.kind()));
    return DockerOperationResult.failed(kind, target.id(), result.errorText());
  }

  private DockerOperationResult lifecycle(String action, String id, String successMessage) {
    if (id == null || id.isBlank())
      throw new IllegalArgumentException("params.id é obrigatório");
    DockerCli.Result result = cli.docker(List.of(action, id), LIFECYCLE_TIMEOUT);
    if (result.succeeded())
      return DockerOperationResult.ok(DockerResourceKind.CONTAINER.name(), id, successMessage);
    return DockerOperationResult.failed(DockerResourceKind.CONTAINER.name(), id, result.errorText());
  }

  private DockerOperationResult runPrune(String scope, String successMessage, List<String> args) {
    DockerCli.Result result = cli.docker(args, PRUNE_TIMEOUT);
    if (!result.succeeded() && isUnsupportedFlag(result) && args.contains("--all")) {
      List<String> fallback = new ArrayList<>(args);
      fallback.remove("--all");
      result = cli.docker(fallback, PRUNE_TIMEOUT);
    }
    if (!result.succeeded())
      return DockerOperationResult.failed("PRUNE", scope, result.errorText());
    return DockerOperationResult.ok("PRUNE", scope, successMessage + reclaimed(result.stdout()));
  }

  private boolean isUnsupportedFlag(DockerCli.Result result) {
    String text = (result.stdout() + " " + result.stderr()).toLowerCase(Locale.ROOT);
    return text.contains("unknown flag") || text.contains("unknown shorthand flag");
  }

  private String reclaimed(String output) {
    for (String line : output.split("\\R")) {
      String value = line.strip();
      if (value.startsWith("Total reclaimed space:"))
        return " (" + value.substring("Total reclaimed space:".length()).strip() + " liberados)";
    }
    return "";
  }

  private String removedMessage(DockerResourceKind kind) {
    return switch (kind) {
      case CONTAINER -> "Container removido";
      case IMAGE -> "Imagem removida";
      case VOLUME -> "Volume removido";
    };
  }

  public record ResourceTarget(DockerResourceKind kind, String id) {
  }
}
