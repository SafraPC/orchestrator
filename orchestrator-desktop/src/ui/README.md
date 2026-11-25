# UI — mapa de componentes

`App.tsx` concentra estado global, atalhos de teclado e orquestração entre painéis. Primitivos ficam em pastas kebab (`icons/`, `modal/`, `dropdown/`, `tooltip/`, `toast/`, `resize-handle/`). O restante está em pastas por responsabilidade.

## Layout principal

| Componente | Arquivo | Função |
| --- | --- | --- |
| App | `App.tsx` | Layout, seleção, ações globais, modais |
| Toolbar | `layout/Toolbar.tsx` | Ações rápidas, kill port, filtros de seção |
| ServicesWorkspace | `layout/ServicesWorkspace.tsx` | Três painéis da seção de serviços |
| ImportSection | `layout/ImportSection.tsx` | Importar pastas/roots |
| StatusBar | `layout/StatusBar.tsx` | Contadores running/stopped/error |
| ContainerTabs | `containers/container/ContainerTabs.tsx` | Abas por container |
| ContainersPanel | `containers/containers/ContainersPanel.tsx` | CRUD e start/stop/restart de container |
| ContainerContextMenu | `containers/container/ContainerContextMenu.tsx` | Menu direito do container (editar) |
| ContainerEditModal | `containers/container/ContainerEditModal.tsx` | Editar nome e descrição do container |
| ServiceTable | `service-table/ServiceTable.tsx` | Lista de serviços e seleção múltipla |
| ServiceBulkActions | `service-table/service-bulk-actions/ServiceBulkActions.tsx` | Ações de seleção múltipla no menu de serviço |
| ServiceTableDialogs | `service-table/service-table-dialogs/ServiceTableDialogs.tsx` | Modais acionados pela tabela de serviços |
| ServiceRow | `service-table/service-row/ServiceRow.tsx` | Linha individual na tabela |
| ContextMenu | `service-table/context-menu/ContextMenu.tsx` | Menu de contexto do serviço |
| LogsPanel | `logs/logs/LogsPanel.tsx` | Logs de um serviço / modo monitor |
| MonitorPanel | `logs/monitor/MonitorPanel.tsx` | Logs agregados do container ou serviços selecionados |
| SettingsPanel | `config/SettingsPanel.tsx` | Preferências de UI e sistema |
| SettingsSystemTab | `config/SettingsSystemTab.tsx` | Java runtime, cache rebuild |
| KillPortModal | `ports/KillPortModal.tsx` | Liberar porta ocupada; permanece aberto após cada kill |
| PortUsageList | `ports/PortUsageList.tsx` | Portas em LISTEN com processo/origem |
| ServicePortModal | `service-table/service-port-modal/ServicePortModal.tsx` | Editar porta do serviço |

`Toolbar` alterna as seções de topo (`AppSection`: `services` | `docker`). A seção de serviços permanece montada e apenas oculta ao trocar de aba, para não perder as assinaturas de log.

## Seção Docker (`docker/docker/`)

Docker real (engine, containers, imagens, volumes) — separado dos containers lógicos do workspace.

| Componente | Arquivo | Função |
| --- | --- | --- |
| DockerView | `docker/docker/DockerView.tsx` | Orquestra abas, filtro, seleção mista e modais |
| DockerEngineBar | `docker/docker/DockerEngineBar.tsx` | Status do engine, iniciar, limpar, comando, refresh |
| DockerEngineOffline | `docker/docker/DockerEngineOffline.tsx` | Estado sem daemon: diagnóstico, comando de start e saída ao vivo |
| DockerTabs | `docker/docker/DockerTabs.tsx` | Abas Containers/Imagens/Volumes com contadores e tamanho em disco |
| DockerContainersTable | `docker/docker/DockerContainersTable.tsx` | Containers com start/stop/restart/remover |
| DockerImagesTable | `docker/docker/DockerImagesTable.tsx` | Imagens com marcação `dangling` e uso |
| DockerVolumesTable | `docker/docker/DockerVolumesTable.tsx` | Volumes com marcação anônimo e uso |
| DockerTableShell | `docker/docker/DockerTableShell.tsx` | Cabeçalho, linha, checkbox e ações — base das três tabelas |
| DockerSelectionBar | `docker/docker/DockerSelectionBar.tsx` | Barra de seleção múltipla (tipos mistos) e remoção em lote |
| DockerPruneModal | `docker/docker/DockerPruneModal.tsx` | Limpeza por escopo com espaço recuperável |
| DockerStartCommandModal | `docker/docker/DockerStartCommandModal.tsx` | Define/persiste o comando de start (sugestões de Colima) |

| Hook/util | Arquivo | Função |
| --- | --- | --- |
| useDockerData | `docker/hooks/useDockerData.ts` | Status + inventário, polling e eventos `dockerEngine*` |
| useDockerActions | `docker/hooks/useDockerActions.ts` | Lifecycle, remoção, prune, start do engine e toasts |
| dockerSelection | `docker/docker/dockerSelection.ts` | Chaves `KIND:id` da seleção mista |
| dockerFormat | `docker/docker/dockerFormat.ts` | Labels, estado/cor, portas e descrição do provider |
| dockerSort | `docker/docker/dockerSort.ts` | Ordenação de containers por estado (default), nome, imagem ou porta |

Cada tabela declara suas colunas num objeto `COLS` usado tanto no cabeçalho quanto nas células (inclusive na largura da coluna de ações), para o alinhamento não sair do lugar.

## Primitivos reutilizáveis

| Componente | Arquivo |
| --- | --- |
| Modal | `modal/Modal.tsx` |
| Dropdown | `dropdown/Dropdown.tsx` |
| Tooltip | `tooltip/Tooltip.tsx` |
| Toast | `toast/Toast.tsx` |
| ResizeHandle | `resize-handle/ResizeHandle.tsx` |
| Icons | `icons/Icons.tsx` (`icons/actionIcons.tsx`, `icons/techIcons.tsx`) |
| ContextMenuItems | `components/context-menu-items/ContextMenuItems.tsx` |

## Hooks

| Hook | Arquivo | Função |
| --- | --- | --- |
| useWorkspaceData | `workspace/hooks/useWorkspaceData.ts` | Bootstrap, services/containers/jdks, refresh |
| useServiceFilters | `service-table/hooks/useServiceFilters.ts` | Filtro por texto e tecnologia |
| useCoreEvents | `workspace/hooks/useCoreEvents.ts` | Eventos `core_event` (service/services/workspace) |
| useServiceBranchPolling | `service-table/hooks/useServiceBranchPolling.ts` | Branch Git por serviço |
| useJavaRuntime | `workspace/hooks/useJavaRuntime.ts` | JDK do core nas configurações |
| useServiceShortcuts | `service-table/hooks/useServiceShortcuts.ts` | Ctrl+S/X/R no serviço selecionado |
| useDragReorder | `workspace/hooks/useDragReorder.ts` | Reordenar serviços/containers |
| useContainerEdit | `containers/hooks/useContainerEdit.ts` | Menu direito e persistência de nome/descrição |
| useListeningPorts | `ports/useListeningPorts.ts` | Portas em LISTEN via `listListeningPorts` |

## Utilitários

- `service-table/service-meta/serviceMeta.ts` — labels/cores por tipo de projeto (Spring, Next, etc.)

## API

Todas as chamadas ao core passam por `../api/client.ts`. Tipos em `../api/types.ts`.
