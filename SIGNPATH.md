# SignPath — configuração do Orchestrator

Assinatura **gratuita** de instaladores Windows para projetos open source elegíveis.

## 1. Candidatura

1. Acesse [signpath.io/product/open-source](https://signpath.io/product/open-source)
2. Informe o repositório: `https://github.com/SafraPC/orchestrator`
3. Licença: MIT
4. Aguarde aprovação (tipicamente alguns dias)

## 2. Dashboard SignPath

Após aprovação, crie:

| Campo | Valor sugerido |
| --- | --- |
| Project slug | `orchestrator` |
| Signing policy slug | `release-signing` |
| Trusted build | GitHub → `SafraPC/orchestrator` |
| Workflow | `.github/workflows/build-cross-platform-artifacts.yml` |
| Branch/tag | `refs/tags/v*` |

Configure o **artifact configuration** para aceitar:

- `*.msi` (Windows Installer)
- `*.exe` (NSIS setup)

Use o arquivo `.signpath/policies/orchestrator/release-signing.yml` como base de política no repositório.

## 3. Secrets e variáveis no GitHub

| Nome | Tipo | Origem |
| --- | --- | --- |
| `SIGNPATH_API_TOKEN` | Secret | SignPath → API tokens |
| `SIGNPATH_ORGANIZATION_ID` | Variable | UUID da organização SignPath |
| `SIGNPATH_PROJECT_SLUG` | Variable | ex. `orchestrator` |
| `SIGNPATH_SIGNING_POLICY_SLUG` | Variable | ex. `release-signing` |

## 4. Comportamento no CI

Quando `SIGNPATH_API_TOKEN` está definido e o push é uma tag `v*`:

1. O job Windows gera instaladores **sem assinatura**
2. Envia artefatos ao SignPath via `signpath/github-action-submit-signing-request@v2`
3. Publica na release os arquivos **assinados**

Sem o token, o workflow continua publicando binários não assinados (comportamento atual).

## 5. Teste

```bash
git tag v1.0.4-rc.1
git push origin v1.0.4-rc.1
```

Na VM Windows: baixar o `.msi` ou `.exe` da release → instalar → SmartScreen não deve bloquear após assinatura válida.

## Referências

- [SignPath + GitHub](https://docs.signpath.io/trusted-build-systems/github)
- [Guia completo](docs/guides/TRUST_AND_SIGNING.md)
