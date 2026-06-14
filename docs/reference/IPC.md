Documento complementar: [`../integration/INTEGRATION.md`](../integration/INTEGRATION.md) (fluxo React → Rust → Java com diagramas).

Transporte: uma linha JSON por requisição/resposta no stdin/stdout do JAR Java.

## Formato

```json
{"id":"uuid","method":"methodName","params":{}}
{"id":"uuid","ok":true,"result":{},"error":null}
{"event":"eventName","payload":{}}
```

Eventos assíncronos (logs) usam o terceiro formato e chegam à UI como `core_event` via Tauri.

## Métodos

| Método | `api/client.ts` | Descrição |
| --- | --- | --- |
| `ping` | — | Health check (`pong`) |
| `getWorkspace` | `getWorkspace` | Workspace persistido |
| `setExcludeDirs` | — | Pastas ignoradas no scan |
| `importRootAndScan` | `importRootAndScan` | Importa root e escaneia |
| `importRootsAndScan` | `importRootsAndScan` | Vários roots de uma vez |
| `removeRoot` | — | Remove root do workspace |
| `scanRoots` | `scanRoots` | Re-escaneia roots existentes |
| `listServices` | `listServices` | Lista serviços com runtime |
| `listServiceBranches` | `listServiceBranches` | Branch Git por serviço |
| `startService` | `start` | Inicia serviço |
| `stopService` | `stop` | Para serviço |
| `restartService` | `restart` | Reinicia serviço |
| `startAll` | `startAll` | Inicia todos |
| `stopAll` | `stopAll` | Para todos |
| `removeService` | `removeService` | Remove serviço do workspace |
| `reorderServices` | `reorderServices` | Ordem manual na tabela |
| `reorderContainers` | `reorderContainers` | Ordem das abas de container |
| `subscribeLogs` | `subscribeLogs` | Assina stream de log |
| `unsubscribeLogs` | `unsubscribeLogs` | Cancela assinatura |
| `createContainer` | `createContainer` | Novo container lógico |
| `updateContainer` | — | Renomeia/descreve container |
| `deleteContainer` | `deleteContainer` | Remove container (serviços permanecem) |
| `listContainers` | `listContainers` | Lista containers |
| `addServiceToContainer` | `addServiceToContainer` | Vincula serviço |
| `removeServiceFromContainer` | `removeServiceFromContainer` | Desvincula serviço |
| `getServicesByContainer` | — | Serviços de um container |
| `startContainer` | `startContainer` | Inicia todos do container |
| `stopContainer` | `stopContainer` | Para todos do container |
| `openServiceFolder` | `openServiceFolder` | Abre pasta no SO |
| `openServiceTerminal` | `openServiceTerminal` | Abre terminal na pasta |
| `openServiceInEditor` | `openServiceInEditor` | Abre no editor padrão |
| `listJdks` | `listJdks` | JDKs detectados na máquina |
| `getActiveJavaInfo` | `getActiveJavaInfo` | Java usado pelo core |
| `setServiceScript` | `setServiceScript` | Script npm do serviço JS |
| `setServicePort` | `setServicePort` | Porta customizada |
| `resetServicePort` | `resetServicePort` | Volta porta detectada |
| `setServiceJavaVersion` | `setServiceJavaVersion` | JDK por serviço Spring |
| `setServiceMvnWrapper` | `setServiceMvnWrapper` | Usar `mvnw` do projeto |
| `rebuildServices` | `rebuildServices` | Re-sincroniza definições |
| `checkPortFree` | `checkPortFree` | Verifica se porta está livre |
| `killPort` | `killPort` | Mata processo na porta |

Comandos Tauri fora do core Java (em `main.rs`): `select_folder`, `select_java_folder`, `select_java_file`, `get_runtime_settings`, `set_java_runtime_path`.

## Como adicionar um método

1. `CoreRuntime.java` — `case` no `handle`
2. `api/client.ts` — método em `api`
3. `api/types.ts` — DTOs se necessário
4. Componente ou hook que consome
5. Atualizar esta tabela e, se mudar o fluxo, [`integration/INTEGRATION.md`](../integration/INTEGRATION.md)

Dispatch central: `orchestrator-core/src/main/java/dev/safra/orchestrator/core/runtime/CoreRuntime.java`.
