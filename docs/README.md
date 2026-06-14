# Documentação do Orchestrator

## Comece aqui

| Documento | Para quê |
| --- | --- |
| [**Integração Java ↔ Desktop**](./integration/INTEGRATION.md) | Fluxo completo: React → Rust → Java, diagramas, eventos, ciclo de vida |
| [**Guia do contribuidor**](./guides/DEVELOPING.md) | Comandos, onde alterar código, checklist de PR |
| [**Referência IPC**](./reference/IPC.md) | Tabela de métodos, params e mapeamento `api/client.ts` |
| [**Confiança e assinatura**](./guides/TRUST_AND_SIGNING.md) | Windows SmartScreen, SignPath, GPG Linux, checksums |

## Estrutura

```text
docs/
├── README.md                 ← este índice
├── integration/
│   └── INTEGRATION.md        desenho de integração (IPC + diagramas)
├── guides/
│   ├── DEVELOPING.md
│   ├── BUILD.md
│   └── TRUST_AND_SIGNING.md
├── reference/
│   └── IPC.md
└── screenshots/
    ├── README.md             catálogo das imagens
    └── *.png                 assets do README
```

## Fora de `docs/`

| Recurso | Caminho |
| --- | --- |
| README principal | [`../README.md`](../README.md) |
| SignPath (Windows OSS) | [`../SIGNPATH.md`](../SIGNPATH.md) |
| Scripts dev/build | [`../scripts/README.md`](../scripts/README.md) |
| Mapa da UI | [`../orchestrator-desktop/src/ui/README.md`](../orchestrator-desktop/src/ui/README.md) |
