# Scripts do Orchestrator

Todos os scripts de build, dev e verificação ficam aqui — a raiz do repositório mantém apenas módulos e documentação principal.

## Estrutura

```text
scripts/
├── unix/           macOS, Linux, Git Bash
│   ├── start.sh    dev completo (Maven + Vite + Tauri)
│   ├── build.sh    release bundle
│   ├── verify.sh   compile check (+ --smoke opcional)
│   └── ensure-build-deps.sh
├── windows/
│   ├── start.cmd   atalho → start.ps1
│   ├── start.ps1
│   ├── build.cmd   atalho → build.ps1 (+ MSVC)
│   ├── build.ps1
│   ├── verify.ps1
│   └── ensure-build-deps.ps1
├── install/        instalador via GitHub Releases
│   ├── install.sh
│   └── install.ps1
└── release/        assinatura e checksums de release
    ├── patch-tauri-windows-signing.mjs
    ├── generate-checksums.sh
    └── sign-linux-deb.sh
```

Dev boot interno (chamado por `start.*`): `orchestrator-desktop/scripts/run-dev.mjs`.

## Comandos rápidos

| Ação | macOS/Linux | Windows |
| --- | --- | --- |
| Dev | `./scripts/unix/start.sh` | `.\scripts\windows\start.cmd` |
| Build | `./scripts/unix/build.sh` | `.\scripts\windows\build.cmd` |
| Verify | `./scripts/unix/verify.sh` | `.\scripts\windows\verify.ps1` |
| Install release | `bash scripts/install/install.sh` | `.\scripts\install\install.ps1` |

## Documentação

- [`docs/DEVELOPING.md`](../docs/guides/DEVELOPING.md) — guia do contribuidor
- [`docs/BUILD.md`](../docs/guides/BUILD.md) — build manual e env vars
- [`docs/integration/INTEGRATION.md`](../docs/integration/INTEGRATION.md) — fluxo Java ↔ desktop
- [`docs/guides/TRUST_AND_SIGNING.md`](../docs/guides/TRUST_AND_SIGNING.md) — instalação confiável Windows/Linux
