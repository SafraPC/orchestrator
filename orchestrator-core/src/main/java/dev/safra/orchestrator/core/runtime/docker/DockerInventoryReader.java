package dev.safra.orchestrator.core.runtime.docker;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.safra.orchestrator.model.docker.DockerContainerSummary;
import dev.safra.orchestrator.model.docker.DockerDiskUsage;
import dev.safra.orchestrator.model.docker.DockerImageSummary;
import dev.safra.orchestrator.model.docker.DockerInventory;
import dev.safra.orchestrator.model.docker.DockerVolumeSummary;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.function.Consumer;

public class DockerInventoryReader {
  private static final Duration TIMEOUT = Duration.ofSeconds(25);
  private static final String NONE = "<none>";
  private static final String COMPOSE_PROJECT = "com.docker.compose.project";
  private static final String COMPOSE_SERVICE = "com.docker.compose.service";

  private final ObjectMapper om;
  private final DockerCli cli;

  public DockerInventoryReader(ObjectMapper om, DockerCli cli) {
    this.om = om;
    this.cli = cli;
  }

  public DockerInventory read() {
    List<DockerContainerSummary> containers = readContainers();
    Set<String> usedImages = new HashSet<>();
    Set<String> usedVolumes = new HashSet<>();
    collectUsage(usedImages, usedVolumes);
    return new DockerInventory(true, null, containers, readImages(usedImages), readVolumes(usedVolumes),
        readDiskUsage());
  }

  private List<DockerContainerSummary> readContainers() {
    List<DockerContainerSummary> out = new ArrayList<>();
    forEachJsonLine(List.of("ps", "--all", "--no-trunc", "--format", "{{json .}}"), node -> {
      String labels = node.path("Labels").asText("");
      out.add(new DockerContainerSummary(
          shortId(node.path("ID").asText("")),
          firstName(node.path("Names").asText("")),
          node.path("Image").asText(""),
          unquote(node.path("Command").asText("")),
          node.path("State").asText(""),
          node.path("Status").asText(""),
          node.path("Ports").asText(""),
          node.path("CreatedAt").asText(""),
          node.path("RunningFor").asText(""),
          node.path("Size").asText(""),
          label(labels, COMPOSE_PROJECT),
          label(labels, COMPOSE_SERVICE),
          parseInt(node.path("LocalVolumes").asText(""))));
    });
    return out;
  }

  private List<DockerImageSummary> readImages(Set<String> usedImages) {
    List<DockerImageSummary> out = new ArrayList<>();
    forEachJsonLine(List.of("images", "--all", "--format", "{{json .}}"), node -> {
      String repository = node.path("Repository").asText("");
      String tag = node.path("Tag").asText("");
      String id = shortId(node.path("ID").asText(""));
      boolean dangling = NONE.equals(repository) || NONE.equals(tag);
      out.add(new DockerImageSummary(id, repository, tag, node.path("Size").asText(""),
          node.path("CreatedAt").asText(""), node.path("CreatedSince").asText(""), dangling,
          usedImages.contains(id)));
    });
    return out;
  }

  private List<DockerVolumeSummary> readVolumes(Set<String> usedVolumes) {
    List<DockerVolumeSummary> out = new ArrayList<>();
    forEachJsonLine(List.of("volume", "ls", "--format", "{{json .}}"), node -> {
      String name = node.path("Name").asText("");
      boolean anonymous = node.path("Labels").asText("").contains("com.docker.volume.anonymous");
      out.add(new DockerVolumeSummary(name, node.path("Driver").asText(""), node.path("Mountpoint").asText(""),
          node.path("Scope").asText(""), anonymous, usedVolumes.contains(name)));
    });
    return out;
  }

  private List<DockerDiskUsage> readDiskUsage() {
    List<DockerDiskUsage> out = new ArrayList<>();
    forEachJsonLine(List.of("system", "df", "--format", "{{json .}}"), node -> out.add(new DockerDiskUsage(
        node.path("Type").asText(""),
        node.path("TotalCount").asText(""),
        node.path("Active").asText(""),
        node.path("Size").asText(""),
        node.path("Reclaimable").asText(""))));
    return out;
  }

  private void collectUsage(Set<String> usedImages, Set<String> usedVolumes) {
    collectUsedVolumes(usedVolumes);
    collectUsedImages(usedImages);
  }

  private void collectUsedVolumes(Set<String> usedVolumes) {
    DockerCli.Result result = cli.docker(
        List.of("volume", "ls", "--filter", "dangling=false", "--format", "{{.Name}}"), TIMEOUT);
    if (!result.succeeded())
      return;
    for (String line : result.stdout().split("\\R")) {
      String value = line.strip();
      if (!value.isBlank())
        usedVolumes.add(value);
    }
  }

  private void collectUsedImages(Set<String> usedImages) {
    DockerCli.Result ids = cli.docker(List.of("ps", "--all", "--quiet", "--no-trunc"), TIMEOUT);
    if (!ids.succeeded())
      return;
    List<String> containerIds = ids.stdout().lines()
        .map(String::strip)
        .filter(value -> !value.isBlank())
        .toList();
    if (containerIds.isEmpty())
      return;
    List<String> args = new ArrayList<>(List.of("inspect", "--format", "{{.Image}}"));
    args.addAll(containerIds);
    DockerCli.Result inspect = cli.docker(args, TIMEOUT);
    for (String line : inspect.stdout().split("\\R")) {
      String value = line.strip();
      if (!value.isBlank() && !value.startsWith("Error"))
        usedImages.add(shortId(value));
    }
  }

  private void forEachJsonLine(List<String> args, Consumer<JsonNode> consumer) {
    DockerCli.Result result = cli.docker(args, TIMEOUT);
    if (!result.succeeded())
      throw new IllegalStateException(result.errorText());
    for (String line : result.stdout().split("\\R")) {
      if (line.isBlank())
        continue;
      try {
        consumer.accept(om.readTree(line));
      } catch (Exception ignored) {
      }
    }
  }

  static String label(String labels, String key) {
    for (String entry : labels.split(",")) {
      int separator = entry.indexOf('=');
      if (separator > 0 && entry.substring(0, separator).equals(key))
        return entry.substring(separator + 1);
    }
    return null;
  }

  static String firstName(String names) {
    int comma = names.indexOf(',');
    return comma < 0 ? names : names.substring(0, comma);
  }

  static String shortId(String id) {
    String value = id.startsWith("sha256:") ? id.substring(7) : id;
    return value.length() > 12 ? value.substring(0, 12) : value;
  }

  private String unquote(String value) {
    if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\""))
      return value.substring(1, value.length() - 1);
    return value;
  }

  private int parseInt(String value) {
    try {
      return Integer.parseInt(value.trim());
    } catch (Exception e) {
      return 0;
    }
  }
}
