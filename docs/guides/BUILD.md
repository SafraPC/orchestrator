# Build do Orchestrator

Guia de desenvolvimento geral: [`DEVELOPING.md`](./DEVELOPING.md). Integração: [`../integration/INTEGRATION.md`](../integration/INTEGRATION.md).

## Pré-requisitos

- **Java 17+** (JDK)
- **Maven 3.6+**
- **Node.js 18+** e **npm**
- **Rust** (`rustup` ou `brew install rust`)

## Build completo

macOS/Linux:

```bash
./scripts/unix/build.sh
```

Windows:

```powershell
.\scripts\windows\build.ps1
```

Ou duplo clique / terminal: `scripts\windows\build.cmd` (configura MSVC quando disponível).

Etapas:
1. Compila `orchestrator-core` (JAR standalone via Maven)
2. Copia JAR para o bundle Tauri
3. Builda frontend (Vite)
4. Gera executável nativo (Tauri)

## Build manual

### 1. Core Java

```bash
cd orchestrator-core
mvn clean package -DskipTests
```

JAR: `orchestrator-core/target/orchestrator-core-standalone.jar`

### 2. Copiar JAR

```bash
cp orchestrator-core/target/orchestrator-core-standalone.jar \
   orchestrator-desktop/src-tauri/orchestrator-core-standalone.jar
```

### 3. Frontend + Desktop

```bash
cd orchestrator-desktop
npm install
npm run build
npm run tauri:build
```

## Saída

```
orchestrator-desktop/src-tauri/target/release/bundle/
├── macos/    → .app
└── dmg/      → .dmg
```

## Verificação rápida

```bash
./scripts/unix/verify.sh
```

Windows: `.\scripts\windows\verify.ps1`. Com smoke test IPC: `./scripts/unix/verify.sh --smoke`.

## Variáveis de ambiente

| Variável | Onde | Uso |
|----------|------|-----|
| `ORCHESTRATOR_CORE_JAR` | `run-dev.mjs`, `core_bridge.rs` | Caminho do JAR em dev/Tauri |
| `ORCHESTRATOR_SKIP_MVN_CLEAN` | `run-dev.mjs`, `scripts/unix/start.sh` | `1` = `mvn package` sem `clean` |
| `ORCHESTRATOR_VERBOSE_LOGS` | `run-dev.mjs`, `scripts/unix/start.sh` | `0` desliga logs verbosos do dev boot |
| `ORCHESTRATOR_CORE_TRACE` | `core_bridge.rs`, `java_runtime.rs` | `1` = stderr detalhado do processo Java |
| `ORCHESTRATOR_DEV_STOP_AFTER_VITE` | `run-dev.mjs` | `1` = sobe Vite e encerra (sem Tauri) |
| `ORCHESTRATOR_CLEAN_TAURI_TARGET` | `scripts/windows/build.ps1` | `1` = limpa `src-tauri/target` antes do build |
| `ORCHESTRATOR_DEPS_ROOT` | `ensure-build-deps.sh` | Raiz das deps locais (Unix) |
| `ORCHESTRATOR_NODE_HOME` | `ensure-build-deps.sh` | Node portátil instalado pelo bootstrap |

## Troubleshooting

- **JAR não encontrado**: execute `mvn clean package -DskipTests` no core
- **Java não encontrado**: verifique `java -version` e PATH
- **Rust não encontrado**: `brew install rust` ou `rustup`
- **Build lento**: primeiro build Rust compila todas as deps; subsequentes são rápidos
