# Confiança, assinatura e instalação segura

Como distribuir o Orchestrator no **Windows** e **Linux** sem pedir ao usuário que desative antivírus, SmartScreen ou políticas de segurança.

## Resumo executivo

| Plataforma | Obrigatório para “confiável”? | Recomendação para este projeto (MIT, OSS) |
| --- | --- | --- |
| **Windows** | Sim — **Authenticode** com CA confiável | **[SignPath Foundation](https://signpath.io/product/open-source)** (grátis para OSS elegível) ou certificado OV/EV / Azure Trusted Signing |
| **Linux** | Não no SO — opcional mas recomendado | **GPG** no AppImage + checksums SHA256 na release; `.deb` com metainfo AppStream |

Não existe atalho técnico no código que substitua um certificado reconhecido no Windows: binários não assinados **sempre** podem gerar SmartScreen e alertas de Defender até construir reputação ou usar EV/SignPath.

---

## Windows

### O que o usuário vê sem assinatura

- **SmartScreen**: “Windows protegeu seu PC” / aplicativo não reconhecido.
- **Defender / antivírus**: possíveis falsos positivos em `.msi`, `.exe` e no JAR empacotado (comportamento heurístico).
- **UAC**: banner genérico sem nome de editor confiável.

### O que resolve de verdade

1. **Assinar todos os artefatos** com Authenticode: `.exe` do instalador NSIS, `.msi`, e binários principais (`orchestrator-desktop.exe`, etc.).
2. **Timestamp** (ex.: `http://timestamp.digicert.com`) para validade após expiração do certificado.
3. **Mesmo publisher** em todas as releases (mesmo certificado ou mesma conta SignPath).

### Opções de certificado

| Opção | Custo | SmartScreen | CI |
| --- | --- | --- | --- |
| **[SignPath OSS](https://signpath.io/product/open-source)** | Grátis (MIT, repo público) | Reputação do publisher SignPath Foundation | GitHub Action oficial |
| **Azure Trusted Signing** | ~US$ 9,99/mês | Boa integração Microsoft | `trusted-signing-cli` + `signCommand` no Tauri |
| **OV (Organization Validation)** | ~US$ 200–400/ano | Reputação construída com o tempo | PFX em Key Vault ou secret base64 no CI |
| **EV (Extended Validation)** | ~US$ 300–600/ano | Reputação imediata no SmartScreen | Token USB ou HSM na nuvem |

### SignPath (recomendado para Orchestrator)

1. Candidatar-se: [signpath.io/product/open-source](https://signpath.io/product/open-source)
2. Após aprovação, configurar projeto `orchestrator` no dashboard SignPath.
3. Adicionar secrets no GitHub (ver [`SIGNPATH.md`](../../SIGNPATH.md)).
4. O workflow `.github/workflows/build-cross-platform-artifacts.yml` assina automaticamente quando `SIGNPATH_API_TOKEN` existir.

Requisitos típicos: licença OSI (MIT ✓), repo público, MFA nos mantenedores, sem malware.

### Certificado próprio no CI

Secrets no repositório:

| Secret | Conteúdo |
| --- | --- |
| `WINDOWS_CERTIFICATE` | PFX em Base64 (`certutil -encode`) |
| `WINDOWS_CERTIFICATE_PASSWORD` | Senha de exportação do PFX |
| `WINDOWS_CERTIFICATE_THUMBPRINT` | Thumbprint do certificado (sem espaços) |

Opcional: `WINDOWS_TIMESTAMP_URL` (default Digicert).

O workflow importa o PFX e o script `scripts/release/patch-tauri-windows-signing.mjs` injeta `certificateThumbprint` no `tauri.conf.json` antes do `tauri build`.

### Depois de assinar

- Submeter binários novos ao [Microsoft Defender Security Intelligence](https://www.microsoft.com/en-us/wdsi/filesubmission) se algum AV ainda alertar (falso positivo).
- Publicar **SHA256** na release (`CHECKSUMS.sha256`) — já gerado pelo CI em tags `v*`.
- Evitar empacotar instaladores de terceiros ou scripts ofuscados (aumenta falsos positivos).

---

## Linux

O Linux **não bloqueia** `.deb` / `.AppImage` como o SmartScreen, mas usuários avançados esperam integridade verificável.

### AppImage (GPG embutido)

Variáveis no build (CI ou local):

| Variável | Uso |
| --- | --- |
| `SIGN=1` | Ativa assinatura AppImage |
| `SIGN_KEY` | ID da chave GPG |
| `APPIMAGETOOL_SIGN_PASSPHRASE` | Senha (obrigatório no CI) |
| `APPIMAGETOOL_FORCE_SIGN=1` | Falha o build se assinatura falhar |

Validar:

```bash
./Orchestrator_1.0.3_amd64.AppImage --appimage-signature
```

Documentação Tauri: [Linux Code Signing](https://v2.tauri.app/distribute/sign/linux/).

### .deb

- Metainfo em `src-tauri/linux/dev.safra.orchestrator.metainfo.xml` (GNOME Software / KDE Discover).
- Assinatura opcional pós-build: `scripts/release/sign-linux-deb.sh` (requer `dpkg-sig` e chave GPG).
- Para repositório APT próprio: assinar o `Release` com GPG (fora do escopo do instalador direto).

### Checksums na release

Arquivo `CHECKSUMS.sha256` anexado à release GitHub — usuários podem validar:

```bash
sha256sum -c CHECKSUMS.sha256
```

---

## Configuração no repositório

| Arquivo | Função |
| --- | --- |
| `orchestrator-desktop/src-tauri/tauri.conf.json` | `publisher`, NSIS, WebView bootstrapper |
| `scripts/release/patch-tauri-windows-signing.mjs` | Injeta thumbprint no CI |
| `scripts/release/generate-checksums.sh` | SHA256 dos instaladores |
| `scripts/release/sign-linux-deb.sh` | Assina `.deb` com GPG (opcional) |
| `.signpath/` | Política e guia SignPath |
| `.github/workflows/build-cross-platform-artifacts.yml` | Build + assinatura opcional |

---

## Checklist antes de cada release `v*`

- [ ] Windows: artefatos assinados (SignPath ou `WINDOWS_*` secrets)
- [ ] Linux: `LINUX_GPG_*` secrets definidos ou checksums publicados
- [ ] `CHECKSUMS.sha256` na release
- [ ] Testar instalação limpa em VM Windows 11 e Ubuntu 24.04
- [ ] Verificar no [VirusTotal](https://www.virustotal.com) se houver alertas; submeter à Microsoft se necessário
- [ ] Instalar via `scripts/install/install.sh` e `install.ps1` a partir da release

---

## O que não fazer

- Pedir ao usuário para desativar Defender, SmartScreen ou “permitir anyway” como solução permanente.
- Distribuir apenas ZIP sem assinatura no Windows para usuários finais.
- Usar certificado autoassinado para download público (não é confiável por padrão).
- Renovar certificado OV sem planejar queda temporária de reputação SmartScreen.

---

## Referências

- [Tauri — Windows signing](https://v2.tauri.app/distribute/sign/windows/)
- [Tauri — Linux signing](https://v2.tauri.app/distribute/sign/linux/)
- [Microsoft — SmartScreen e EV](https://learn.microsoft.com/en-us/archive/blogs/ie/microsoft-smartscreen-extended-validation-ev-code-signing-certificates)
- [SignPath — GitHub](https://docs.signpath.io/trusted-build-systems/github)
- [AppImage — signatures](https://docs.appimage.org/packaging-guide/optional/signatures.html)
