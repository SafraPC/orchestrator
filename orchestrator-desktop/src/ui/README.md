# UI — mapa de componentes

`App.tsx` concentra estado global, atalhos de teclado e orquestração entre painéis.

## Layout principal

| Componente | Arquivo | Função |
| --- | --- | --- |
| App | `App.tsx` | Layout, seleção, ações globais, modais |
| Toolbar | `Toolbar.tsx` | Ações rápidas, kill port, filtros |
| ImportSection | `ImportSection.tsx` | Importar pastas/roots |
| ContainerTabs | `ContainerTabs.tsx` | Abas por container |
| ContainersPanel | `ContainersPanel.tsx` | CRUD e start/stop/restart de container |
| ContainerContextMenu | `ContainerContextMenu.tsx` | Menu direito do container (editar) |
| ContainerEditModal | `ContainerEditModal.tsx` | Editar nome e descrição do container |
| ServiceTable | `ServiceTable.tsx` | Lista de serviços e seleção múltipla |
| ServiceBulkActions | `ServiceBulkActions.tsx` | Ações de seleção múltipla no menu de serviço |
| ServiceTableDialogs | `ServiceTableDialogs.tsx` | Modais acionados pela tabela de serviços |
| ServiceRow | `ServiceRow.tsx` | Linha individual na tabela |
| ContextMenu | `ContextMenu.tsx` | Menu de contexto do serviço |
| LogsPanel | `LogsPanel.tsx` | Logs de um serviço |
| MonitorPanel | `MonitorPanel.tsx` | Logs agregados do container ou serviços selecionados |
| StatusBar | `StatusBar.tsx` | Contadores running/stopped/error |
| SettingsPanel | `SettingsPanel.tsx` | Preferências de UI e sistema |
| SettingsSystemTab | `SettingsSystemTab.tsx` | Java runtime, cache rebuild |
| KillPortModal | `KillPortModal.tsx` | Liberar porta ocupada; permanece aberto após cada kill |
| PortUsageList | `PortUsageList.tsx` | Portas em LISTEN com processo/origem, filtros Dev/Editor-Terminal/Todas e kill por linha |
| ServicePortModal | `ServicePortModal.tsx` | Editar porta do serviço |

`Toolbar` alterna as seções de topo (`AppSection`: `services` | `docker`). A seção de serviços permanece montada e apenas oculta ao trocar de aba, para não perder as assinaturas de log.

## Seção Docker (`docker/`)

Docker real (engine, containers, imagens, volumes) — separado dos containers lógicos do workspace.

| Componente | Arquivo | Função |
| --- | --- | --- |
| DockerView | `docker/DockerView.tsx` | Orquestra abas, filtro, seleção mista e modais |
| DockerEngineBar | `docker/DockerEngineBar.tsx` | Status do engine, iniciar, limpar, comando, refresh |
| DockerEngineOffline | `docker/DockerEngineOffline.tsx` | Estado sem daemon: diagnóstico, comando de start e saída ao vivo |
| DockerTabs | `docker/DockerTabs.tsx` | Abas Containers/Imagens/Volumes com contadores e tamanho em disco |
| DockerContainersTable | `docker/DockerContainersTable.tsx` | Containers com start/stop/restart/remover |
| DockerImagesTable | `docker/DockerImagesTable.tsx` | Imagens com marcação `dangling` e uso |
| DockerVolumesTable | `docker/DockerVolumesTable.tsx` | Volumes com marcação anônimo e uso |
| DockerTableShell | `docker/DockerTableShell.tsx` | Cabeçalho, linha, checkbox e ações — base das três tabelas |
| DockerSelectionBar | `docker/DockerSelectionBar.tsx` | Barra de seleção múltipla (tipos mistos) e remoção em lote |
| DockerPruneModal | `docker/DockerPruneModal.tsx` | Limpeza por escopo com espaço recuperável |
| DockerStartCommandModal | `docker/DockerStartCommandModal.tsx` | Define/persiste o comando de start (sugestões de Colima) |

| Hook/util | Arquivo | Função |
| --- | --- | --- |
| useDockerData | `docker/useDockerData.ts` | Status + inventário, polling e eventos `dockerEngine*` |
| useDockerActions | `docker/useDockerActions.ts` | Lifecycle, remoção, prune, start do engine e toasts |
| dockerSelection | `docker/dockerSelection.ts` | Chaves `KIND:id` da seleção mista |
| dockerFormat | `docker/dockerFormat.ts` | Labels, estado/cor, portas e descrição do provider |
| dockerSort | `docker/dockerSort.ts` | Ordenação de containers por estado (default), nome, imagem ou porta |

Cada tabela declara suas colunas num objeto `COLS` usado tanto no cabeçalho quanto nas células (inclusive na largura da coluna de ações), para o alinhamento não sair do lugar.

## Primitivos reutilizáveis

| Componente | Arquivo |
| --- | --- |
| Modal | `Modal.tsx` |
| Dropdown | `Dropdown.tsx` |
| Tooltip | `Tooltip.tsx` |
| Toast | `Toast.tsx` |
| ResizeHandle | `ResizeHandle.tsx` |
| Icons | `Icons.tsx` |

## Hooks

| Hook | Arquivo | Função |
| --- | --- | --- |
| useWorkspaceData | `useWorkspaceData.ts` | Bootstrap, services/containers/jdks, refresh |
| useServiceFilters | `useServiceFilters.ts` | Filtro por texto e tecnologia |
| useCoreEvents | `useCoreEvents.ts` | Eventos `core_event` (service/services/workspace) |
| useServiceBranchPolling | `useServiceBranchPolling.ts` | Branch Git por serviço |
| useJavaRuntime | `useJavaRuntime.ts` | JDK do core nas configurações |
| useServiceShortcuts | `useServiceShortcuts.ts` | Ctrl+S/X/R no serviço selecionado |
| useDragReorder | `useDragReorder.ts` | Reordenar serviços/containers |
| useContainerEdit | `useContainerEdit.ts` | Menu direito e persistência de nome/descrição |
| useListeningPorts | `useListeningPorts.ts` | Portas em LISTEN via `listListeningPorts` |

## Utilitários

- `serviceMeta.ts` — labels/cores por tipo de projeto (Spring, Next, etc.)

## API

Todas as chamadas ao core passam por `../api/client.ts`. Tipos em `../api/types.ts`.
