# Integração Java ↔ Desktop

Visão completa de como o **React**, o **Tauri (Rust)** e o **core Java** se comunicam — do clique na UI até a execução local de um serviço.

Documento complementar: [`reference/IPC.md`](../reference/IPC.md) (tabela de métodos).

---

## Visão geral

O desktop **não embute** o Java no processo Rust. O core roda como **processo filho** (`java -jar orchestrator-core-standalone.jar`), com troca de mensagens via **stdin/stdout** (uma linha JSON por mensagem).

```mermaid
flowchart TB
  subgraph UI["orchestrator-desktop / React"]
    COMP["Componentes (App, ServiceTable, LogsPanel)"]
    API["api/client.ts"]
    HOOKS["useCoreEvents, useWorkspaceData"]
  end

  subgraph TAURI["orchestrator-desktop / Tauri Rust"]
    CMD["main.rs → core_request"]
    BRIDGE["core_bridge.rs (CoreBridge)"]
    JAVA_RT["java_runtime.rs (spawn JDK)"]
  end

  subgraph CORE["orchestrator-core / Java 17"]
    MAIN["Main.java (stdin loop)"]
    RT["CoreRuntime.handle()"]
    MGR["ServiceManager, WorkspaceManager, LogManager…"]
    PROC["ProcessManager → serviços do usuário"]
  end

  COMP --> API
  COMP --> HOOKS
  API -->|"invoke('core_request')"| CMD
  CMD --> BRIDGE
  BRIDGE -->|"JSON + \\n"| MAIN
  MAIN --> RT --> MGR
  MGR --> PROC
  MAIN -->|"JSON response"| BRIDGE
  BRIDGE -->|"emit('core_event')"| HOOKS
  BRIDGE --> CMD --> API --> COMP
  JAVA_RT -.->|spawn| MAIN
```

---

## Três camadas de transporte

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| **UI** | React + TypeScript | Estado, telas, `api.*` e listeners `core_event` |
| **Shell** | Tauri 2 + Rust | Comandos nativos, spawn do JVM, ponte IPC, eventos para o WebView |
| **Core** | Java (JAR) | Regras de negócio, persistência, start/stop de processos, logs |

---

## Dois canais de comunicação

### 1. Requisição síncrona (request → response)

Usado para quase todas as ações da UI (listar, iniciar, parar, importar, etc.).

```mermaid
sequenceDiagram
  participant UI as React (api.client)
  participant RS as Rust (core_request)
  participant CB as CoreBridge
  participant JVM as Java Main
  participant CR as CoreRuntime

  UI->>RS: invoke("core_request", { method, params })
  RS->>CB: ensure_started_and_send_request
  Note over CB: session mutex — uma requisição por vez
  CB->>CB: spawn JVM se inativo
  CB->>JVM: stdin: {"id":"…","method":"…","params":{}}
  JVM->>CR: handle(method, params)
  CR-->>JVM: JsonNode result
  JVM->>CB: stdout: {"id":"…","ok":true,"result":…}
  CB->>RS: Value (resposta completa)
  RS->>UI: result (só o campo result)
```

**Formato na fio stdin/stdout:**

```json
{"id":"uuid","method":"startService","params":{"name":"api-gateway"}}
{"id":"uuid","ok":true,"result":{…},"error":null}
```

**Erros:** Java devolve `ok: false` com `error.code` (`BAD_REQUEST`, `INTERNAL_ERROR`). Rust transforma em `Err("[CODE] mensagem")` para o React.

### 2. Eventos assíncronos (push)

O core escreve linhas **sem** aguardar pedido da UI — principalmente **logs** e **atualizações de estado**.

```json
{"event":"log","payload":{"subId":"…","service":"api","line":"…"}}
{"event":"service","payload":{…ServiceView…}}
{"event":"services","payload":[…]}
{"event":"workspace","payload":{…Workspace…}}
```

```mermaid
sequenceDiagram
  participant CR as CoreRuntime / LogManager
  participant JVM as Java stdout
  participant CB as CoreBridge reader thread
  participant TAURI as Tauri emit
  participant UI as React (useCoreEvents / LogsPanel)

  CR->>JVM: IpcEvent (linha JSON)
  JVM->>CB: read_until('\\n')
  CB->>TAURI: emit("core_event", envelope)
  TAURI->>UI: listen("core_event")
  alt event = log
    UI->>UI: LogsPanel append linha
  else event = service / services
    UI->>UI: useCoreEvents atualiza lista
  else event = workspace
    UI->>UI: refresh debounced (400ms)
  end
```

---

## Ciclo de vida do processo Java

| Momento | O que acontece |
| --- | --- |
| Abrir o app | Core **não** sobe no `setup` do Tauri |
| Primeira chamada `api.*` | `CoreBridge` faz `spawn_core` → `java -jar … --stateDir …` |
| Reader thread | Lê stdout linha a linha; roteia por `id` (response) ou `event` (push) |
| Timeout 45s | Rust mata o JVM e limpa requests pendentes |
| Troca de Java nas Configurações | `set_java_runtime_path` → `bridge.cleanup()` → próximo request respawna |
| Fechar o app | `RunEvent::Exit` → `bridge.shutdown()` |

**JAR em dev:** `ORCHESTRATOR_CORE_JAR` ou `orchestrator-core/target/orchestrator-core-standalone.jar`.  
**JAR em release:** bundle em `resource_dir/orchestrator-core-standalone.jar`.

**Logs de diagnóstico:** `desktop-logs/core.stderr.log` (stderr do JVM). Trace: `ORCHESTRATOR_CORE_TRACE=1`.

---

## Exemplo: iniciar um serviço

```mermaid
sequenceDiagram
  participant U as Usuário
  participant ST as ServiceTable
  participant API as api.start(name)
  participant CR as CoreRuntime
  participant SM as ServiceManager
  participant PM as ProcessManager
  participant OS as SO (mvn/npm)

  U->>ST: Ctrl+S / botão Start
  ST->>API: startService
  API->>CR: IPC startService
  CR->>SM: start(name)
  SM->>PM: start(ServiceDefinition)
  PM->>OS: ProcessBuilder
  OS-->>PM: pid
  SM->>SM: persist runtime.json
  SM->>CR: emit event "service"
  CR-->>API: ServiceView (response)
  Note over ST: useCoreEvents também recebe event "service"
  ST->>ST: refresh / merge estado
```

O **mesmo** `startService` devolve o `ServiceView` na resposta HTTP-like **e** pode emitir `event: service` para outras abas já abertas.

---

## Exemplo: assinar logs

```mermaid
sequenceDiagram
  participant LP as LogsPanel
  participant API as subscribeLogs(name)
  participant LM as LogManager
  participant LS as LogSubscription
  participant FS as arquivo .log do serviço

  LP->>API: subscribeLogs + tail
  API->>LM: subscribe(name, logFile, tail)
  LM->>LS: thread de tail
  LS->>FS: poll / read incremental
  loop novas linhas
    LS->>LM: linha lida
    LM->>LM: emit event "log"
    Note over LP: core_event → append na UI
  end
  LP->>API: unsubscribeLogs(subId)
```

Logs **não** voltam no `result` do `subscribeLogs` — só o `subId`. O stream é 100% por eventos `log`.

---

## Mapa de arquivos por etapa

| Etapa | Arquivo |
| --- | --- |
| Botão na UI | `orchestrator-desktop/src/ui/ServiceTable.tsx`, `App.tsx` |
| Cliente tipado | `orchestrator-desktop/src/api/client.ts` |
| Fila serial (Windows) | `enqueueCoreRequest` em `client.ts` |
| Comando Tauri | `orchestrator-desktop/src-tauri/src/main.rs` → `core_request` |
| Ponte IPC | `orchestrator-desktop/src-tauri/src/core_bridge.rs` |
| Spawn Java | `orchestrator-desktop/src-tauri/src/java_runtime.rs` |
| Loop stdin | `orchestrator-core/.../core/Main.java` |
| Dispatch | `orchestrator-core/.../core/runtime/CoreRuntime.java` |
| Start/stop | `ServiceManager.java`, `ProcessManager.java` |
| Eventos UI | `useCoreEvents.ts`, `LogsPanel.tsx`, `MonitorPanel.tsx` |
| Contrato métodos | `docs/reference/IPC.md` |

---

## Timeouts e concorrência

| Local | Valor | Efeito |
| --- | --- | --- |
| `core_bridge.rs` recv | 45s | Mata JVM se core não responder |
| `api/client.ts` | 45s | Rejeita Promise no React |
| `App` bootstrap | 90s | Toast se primeira carga falhar |
| Fila `client.ts` | serial | Um IPC por vez (evita corrida no Windows) |
| `session` mutex Rust | exclusivo | `ensure_started` + send + cleanup não intercalam |

**Retry:** uma tentativa extra em `CORE_SHUTDOWN` ou erro de transporte (`core_bridge.rs`).

---

## Comandos Tauri fora do core Java

Estes **não** passam pelo JAR — são tratados só no Rust:

| Comando | Uso |
| --- | --- |
| `select_folder` | Importar roots |
| `select_java_folder` / `select_java_file` | Configurações → JDK |
| `get_runtime_settings` / `set_java_runtime_path` | Persistir Java do core |

---

## Persistência (contexto da integração)

O core recebe `--stateDir` do Rust e grava:

| Arquivo | Conteúdo |
| --- | --- |
| `workspace.json` | Serviços, containers, roots |
| `runtime.json` | PID e status por serviço |

A UI lê estado via IPC (`listServices`, `getWorkspace`), não acessa esses arquivos diretamente.

---

## Como estender o fluxo

1. Novo caso de uso → `CoreRuntime.handle` + manager adequado  
2. Expor na UI → `api/client.ts` + `api/types.ts`  
3. Se precisar push → `emitEvent.accept("…", payload)` no Java  
4. Se precisar reagir na UI → `listen("core_event")` ou `useCoreEvents`  
5. Atualizar [`reference/IPC.md`](../reference/IPC.md)
