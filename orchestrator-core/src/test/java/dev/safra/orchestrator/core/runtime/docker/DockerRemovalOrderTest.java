package dev.safra.orchestrator.core.runtime.docker;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import dev.safra.orchestrator.core.runtime.docker.DockerResourceActions.ResourceTarget;
import dev.safra.orchestrator.model.docker.DockerResourceKind;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.Test;

class DockerRemovalOrderTest {

  @Test
  void removesContainersBeforeImagesAndVolumes() {
    List<ResourceTarget> mixed = List.of(
        new ResourceTarget(DockerResourceKind.VOLUME, "vol"),
        new ResourceTarget(DockerResourceKind.IMAGE, "img"),
        new ResourceTarget(DockerResourceKind.CONTAINER, "ctr"));

    List<DockerResourceKind> ordered = DockerResourceActions.orderForRemoval(mixed).stream()
        .map(ResourceTarget::kind)
        .toList();

    assertEquals(
        List.of(DockerResourceKind.CONTAINER, DockerResourceKind.IMAGE, DockerResourceKind.VOLUME),
        ordered,
        "imagens e volumes só podem ser removidos depois dos containers que os usam");
  }

  @Test
  void keepsRelativeOrderWithinSameKind() {
    List<ResourceTarget> targets = List.of(
        new ResourceTarget(DockerResourceKind.IMAGE, "first"),
        new ResourceTarget(DockerResourceKind.IMAGE, "second"));

    assertEquals(List.of("first", "second"),
        DockerResourceActions.orderForRemoval(targets).stream().map(ResourceTarget::id).toList());
  }

  @Test
  void parsesKindCaseInsensitivelyAndRejectsUnknown() {
    assertEquals(DockerResourceKind.CONTAINER, DockerResourceKind.parse("container"));
    assertEquals(DockerResourceKind.VOLUME, DockerResourceKind.parse(" Volume "));
    assertThrows(IllegalArgumentException.class, () -> DockerResourceKind.parse("NETWORK"));
    assertThrows(IllegalArgumentException.class, () -> DockerResourceKind.parse(null));
    assertThrows(IllegalArgumentException.class, () -> DockerResourceKind.parse("  "));
  }

  @Test
  void parsesKindRegardlessOfDefaultLocale() {
    Locale original = Locale.getDefault();
    try {
      Locale.setDefault(Locale.forLanguageTag("tr-TR"));
      assertEquals(DockerResourceKind.IMAGE, DockerResourceKind.parse("image"),
          "locale turco transforma i em İ e quebraria o valueOf sem Locale.ROOT");
    } finally {
      Locale.setDefault(original);
    }
  }
}
