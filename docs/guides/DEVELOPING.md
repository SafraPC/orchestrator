# Desenvolvimento no Orchestrator

Guia para contribuir ou modificar o projeto sem depender de ferramentas de IA.

## O que é o quê

| Termo | Significado |
| --- | --- |
| **Core** | Motor Java (`orchestrator-core`) — scan, start/stop, containers, logs, IPC |
| **Desktop** | App Tauri + React (`orchestrator-desktop`) — UI e ponte Rust → Java |
| **Container** | Grupo lógico de serviços na UI — **não é Docker** |
| **Service** | Projeto detectado (`pom.xml` ou `package.json`) com comando de execução |

### Camadas (Java)

| Pacote | Papel DDD |
| --- | --- |
| `model/` | Domínio: `Workspace` (aggregate), entidades, `ServiceView` (read model) |
| `core.runtime/` | Aplicação: managers, configurators, scanners |
| `core.ipc/` | Contrato de entrada: records IPC, `IpcParams`, `IpcEventEmitter` |
| `process/` | Infraestrutura: OS, processos, JDK |

## Pré-requisitos

- Java 17+, Maven 3.6+, Node.js 18+, Rust stable
- macOS/Linux: `scripts/unix/start.sh` e `scripts/unix/build.sh` instalam deps locais se faltarem
- Windows: `scripts/windows/start.ps1` / `build.ps1` (use `build.cmd` se precisar do MSVC)
- Linux: pacotes nativos do Tauri — [pré-requisitos v2](https://v2.tauri.app/start/prerequisites/)

## Comandos do dia a dia

| Objetivo | Comando |
| --- | --- |
| App completo em dev | `./scripts/unix/start.sh` ou `.\scripts\windows\start.cmd` |
| Mesmo fluxo via npm | `cd orchestrator-desktop && npm run dev:full` |
| Só frontend (sem Tauri/core) | `cd orchestrator-desktop && npm run dev` |
| Build de release | `./scripts/unix/build.sh` ou `.\scripts\windows\build.ps1` |
| Verificar compilação | `./scripts/unix/verify.sh` ou `.\scripts\windows\verify.ps1` |
| Smoke test IPC (Java) | `cd orchestrator-desktop && npm run verify:core-ipc` |

**Atenção:** `npm run dev` sobe apenas o Vite. Para o desktop com core Java, use `scripts/unix/start.sh` ou `dev:full`.

Índice de scripts: [`../../scripts/README.md`](../../scripts/README.md).

## Fluxo de dados

Diagrama completo com sequências: [**Integração Java ↔ Desktop**](../integration/INTEGRATION.md).

```text
React (api/client.ts)
  → invoke("core_request")
  → Rust (core_bridge.rs)
  → stdin JSON → Java CoreRuntime.handle()
  → stdout JSON + eventos de log
  → React (useCoreEvents)
```

Tabela de métodos IPC: [`reference/IPC.md`](../reference/IPC.md).

## Onde alterar o quê

| Mudança | Arquivos principais |
| --- | --- |
| Novo método IPC | `CoreRuntime.java` → `api/client.ts` → `api/types.ts` → UI |
| Start/stop de serviço | `ServiceManager.java`, `ProcessManager.java` |
| Detecção de projetos | `ProjectScanner.java`, `JsProjectScanner.java` |
| Persistência | `WorkspaceManager.java`, `StateStore.java` |
| Java do core (app) | `java_runtime.rs`, `SettingsSystemTab.tsx` |
| Logs na UI | `LogManager.java`, `useCoreEvents.ts`, `LogsPanel.tsx` |
| Boot em dev | `orchestrator-desktop/scripts/run-dev.mjs`, `core_bridge.rs` |

Mapa da UI: [`../../orchestrator-desktop/src/ui/README.md`](../../orchestrator-desktop/src/ui/README.md).

Índices por módulo: [`../../orchestrator-core/.cursorrules`](../../orchestrator-core/.cursorrules), [`../../orchestrator-desktop/.cursorrules`](../../orchestrator-desktop/.cursorrules).

## Após editar o core Java

O JAR precisa ser recompilado e copiado para o Tauri:

```bash
cd orchestrator-core && mvn clean package -DskipTests
cp target/orchestrator-core-standalone.jar ../orchestrator-desktop/src-tauri/
```

Em dev, `run-dev.mjs` faz `mvn clean package` por padrão. Para pular o `clean`: `ORCHESTRATOR_SKIP_MVN_CLEAN=1`.

## Checklist antes de abrir PR

```bash
./scripts/unix/verify.sh
cd orchestrator-desktop && npm run verify:core-ipc   # opcional; exige JAR compilado
```

Equivalente manual:

```bash
cd orchestrator-core && mvn -q -DskipTests compile
cd orchestrator-desktop/src-tauri && cargo check
cd orchestrator-desktop && npm run build
```

## Estado em disco

| Arquivo | Conteúdo |
| --- | --- |
| `workspace.json` | roots, serviços, containers, `removedServices` |
| `runtime.json` | pid, status, timestamps por serviço |

Diretório padrão do app instalado: ver tabela em [`README.md`](../../README.md#data-location).

Em dev, o core usa `--stateDir` configurado pelo desktop.

## Variáveis de ambiente

Ver tabela completa em [`BUILD.md`](./BUILD.md#variáveis-de-ambiente).

## Build manual

Detalhes passo a passo: [`BUILD.md`](./BUILD.md).

## Screenshots do README

Catálogo em [`screenshots/README.md`](../screenshots/README.md).
