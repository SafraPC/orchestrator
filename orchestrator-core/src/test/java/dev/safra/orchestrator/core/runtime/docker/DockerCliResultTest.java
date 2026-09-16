package dev.safra.orchestrator.core.runtime.docker;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class DockerCliResultTest {

  @Test
  void treatsDaemonErrorOnExitCodeZeroAsFailure() {
    DockerCli.Result result = new DockerCli.Result(0,
        "Error response from daemon: No such image: ghost:latest", "");
    assertTrue(result.ok());
    assertTrue(result.reportedError());
    assertFalse(result.succeeded(), "docker rm --force sai com 0 mesmo quando o recurso não existe");
  }

  @Test
  void treatsCleanOutputAsSuccess() {
    DockerCli.Result result = new DockerCli.Result(0, "Total reclaimed space: 1.2GB", "");
    assertTrue(result.succeeded());
    assertFalse(result.reportedError());
  }

  @Test
  void failsWhenExitCodeIsNonZero() {
    DockerCli.Result result = new DockerCli.Result(1, "", "unknown flag: --all");
    assertFalse(result.succeeded());
    assertEquals("unknown flag: --all", result.errorText());
  }

  @Test
  void errorTextPrefersDaemonMessageOverNoise() {
    DockerCli.Result result = new DockerCli.Result(1,
        "algum aviso irrelevante\nError response from daemon: conflict: unable to delete",
        "");
    assertEquals("Error response from daemon: conflict: unable to delete", result.errorText());
  }

  @Test
  void errorTextFallsBackToFirstLineAndNeverReturnsBlank() {
    assertEquals("falha genérica", new DockerCli.Result(1, "", "falha genérica").errorText());
    assertEquals("Falha ao executar comando Docker.", new DockerCli.Result(1, "  ", "").errorText());
  }
}
