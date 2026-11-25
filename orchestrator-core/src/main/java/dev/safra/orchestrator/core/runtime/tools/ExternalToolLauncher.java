package dev.safra.orchestrator.core.runtime.tools;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

public class ExternalToolLauncher {

  public void openFolder(Path servicePath) {
    try {
      String os = System.getProperty("os.name").toLowerCase();
      ProcessBuilder pb;

      if (os.contains("win")) {
        pb = new ProcessBuilder("explorer", servicePath.toString());
      } else if (os.contains("mac")) {
        pb = new ProcessBuilder("open", servicePath.toString());
      } else {
        pb = new ProcessBuilder("xdg-open", servicePath.toString());
      }

      pb.start();
    } catch (Exception e) {
      throw new IllegalStateException("Erro ao abrir pasta: " + e.getMessage(), e);
    }
  }

  public void openTerminal(Path servicePath) {
    try {
      String os = System.getProperty("os.name").toLowerCase();
      ProcessBuilder pb;

      if (os.contains("win")) {
        pb = new ProcessBuilder("cmd", "/c", "start", "cmd", "/k", "cd", "/d", servicePath.toString());
      } else if (os.contains("mac")) {
        pb = launchMacTerminal(servicePath);
      } else {
        pb = launchLinuxTerminal(servicePath);
      }

      pb.start();
    } catch (Exception e) {
      throw new IllegalStateException("Erro ao abrir terminal: " + e.getMessage(), e);
    }
  }

  public void openEditor(Path servicePath) {
    openEditor(servicePath, null);
  }

  public void openEditor(Path servicePath, Path file) {
    try {
      String os = System.getProperty("os.name").toLowerCase();
      ProcessBuilder pb = findEditor(os, servicePath, file);
      pb.start();
    } catch (Exception e) {
      throw new IllegalStateException("Erro ao abrir editor: " + e.getMessage(), e);
    }
  }

  private ProcessBuilder launchMacTerminal(Path path) throws Exception {
    try {
      Process test = new ProcessBuilder("which", "warp").start();
      if (test.waitFor() == 0) {
        return new ProcessBuilder("warp", "terminal", "--directory", path.toString());
      }
    } catch (Exception ignored) {
    }

    String script = "tell application \"Terminal\"\n"
        + "  activate\n"
        + "  do script \"cd '" + path.toString().replace("'", "\\'") + "'\"\n"
        + "end tell";
    return new ProcessBuilder("osascript", "-e", script);
  }

  private ProcessBuilder launchLinuxTerminal(Path path) {
    String[] terminals = { "gnome-terminal", "konsole", "xterm", "terminator" };
    for (String term : terminals) {
      try {
        Process test = new ProcessBuilder("which", term).start();
        if (test.waitFor() == 0) {
          return switch (term) {
            case "gnome-terminal" -> new ProcessBuilder(term, "--working-directory", path.toString());
            case "konsole" -> new ProcessBuilder(term, "--workdir", path.toString());
            default -> new ProcessBuilder(term, "-e", "bash", "-c", "cd '" + path + "' && exec bash");
          };
        }
      } catch (Exception ignored) {
      }
    }
    throw new IllegalStateException("Nenhum terminal encontrado. Instale gnome-terminal, konsole ou xterm");
  }

  private ProcessBuilder findEditor(String os, Path project, Path file) throws Exception {
    List<String> editors = editorCommands(project);

    if (os.contains("win")) {
      return findWindowsEditor(project, file, editors);
    }

    for (String editor : editors) {
      if (commandExists("which", editor)) {
        return editorProcess(editor, project, file);
      }
    }

    if (os.contains("mac")) {
      for (String editor : editors) {
        String app = macAppName(editor);

        if (app != null && macAppExists(app)) {
          return macOpen(app, project, file);
        }
      }
    }

    throw new IllegalStateException("Nenhum editor encontrado. Instale Cursor ou VSCode e adicione ao PATH");
  }

  private ProcessBuilder findWindowsEditor(Path project, Path file, List<String> preferred) throws Exception {
    List<String> aliases = new ArrayList<>(preferred);

    if (!aliases.contains("code-insiders")) {
      aliases.add("code-insiders");
    }

    for (String alias : aliases) {
      if (commandExists("where", alias)) {
        List<String> command = new ArrayList<>(List.of("cmd", "/c", "start", "", alias, project.toString()));

        if (file != null) {
          command.add(file.toString());
        }

        return new ProcessBuilder(command);
      }
    }

    for (Path exe : windowsEditorCandidates()) {
      if (Files.exists(exe)) {
        return editorProcess(exe.toString(), project, file);
      }
    }

    throw new IllegalStateException("Nenhum editor encontrado. Instale Cursor ou VSCode");
  }

  private List<String> editorCommands(Path project) {
    boolean cursorProject = Files.isDirectory(project.resolve(".cursor"));
    boolean vscodeProject = Files.isDirectory(project.resolve(".vscode"));

    if (vscodeProject && !cursorProject) {
      return List.of("code", "cursor");
    }

    return List.of("cursor", "code");
  }

  private ProcessBuilder editorProcess(String editor, Path project, Path file) {
    List<String> command = new ArrayList<>();
    command.add(editor);
    command.add(project.toString());

    if (file != null) {
      command.add(file.toString());
    }

    return new ProcessBuilder(command);
  }

  private ProcessBuilder macOpen(String app, Path project, Path file) {
    List<String> command = new ArrayList<>(List.of("open", "-a", app, project.toString()));

    if (file != null) {
      command.add(file.toString());
    }

    return new ProcessBuilder(command);
  }

  private boolean macAppExists(String app) {
    String home = System.getProperty("user.home", "");
    return Files.isDirectory(Path.of("/Applications", app + ".app"))
        || Files.isDirectory(Path.of(home, "Applications", app + ".app"));
  }

  private String macAppName(String editor) {
    if ("cursor".equals(editor)) {
      return "Cursor";
    }

    if ("code".equals(editor)) {
      return "Visual Studio Code";
    }

    return null;
  }

  private boolean commandExists(String lookup, String command) {
    try {
      Process test = new ProcessBuilder(lookup, command).start();
      test.getInputStream().readAllBytes();
      return test.waitFor() == 0;
    } catch (Exception ignored) {
      return false;
    }
  }

  private List<Path> windowsEditorCandidates() {
    String local = System.getenv("LOCALAPPDATA");
    String user = System.getenv("USERPROFILE");
    List<Path> candidates = new ArrayList<>();

    if (local != null && !local.isBlank()) {
      candidates.add(Path.of(local, "Programs", "Cursor", "Cursor.exe"));
      candidates.add(Path.of(local, "Programs", "cursor", "Cursor.exe"));
      candidates.add(Path.of(local, "Programs", "Microsoft VS Code", "Code.exe"));
      candidates.add(Path.of(local, "Programs", "Microsoft VS Code Insiders", "Code - Insiders.exe"));
    }

    if (user != null && !user.isBlank()) {
      candidates.add(Path.of(user, "AppData", "Local", "Programs", "Cursor", "Cursor.exe"));
      candidates.add(Path.of(user, "AppData", "Local", "Programs", "Microsoft VS Code", "Code.exe"));
      candidates.add(Path.of(user, "AppData", "Local", "Programs", "Microsoft VS Code Insiders", "Code - Insiders.exe"));
    }

    return candidates;
  }
}
