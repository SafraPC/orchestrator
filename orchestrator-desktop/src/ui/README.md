# UI — mapa de componentes

`App.tsx` concentra estado global, atalhos de teclado e orquestração entre painéis.

## Layout principal

| Componente | Arquivo | Função |
| --- | --- | --- |
| App | `App.tsx` | Layout, seleção, ações globais, modais |
| Toolbar | `Toolbar.tsx` | Ações rápidas, kill port, filtros |
| ImportSection | `ImportSection.tsx` | Importar pastas/roots |
| ContainerTabs | `ContainerTabs.tsx` | Abas por container |
| ContainersPanel | `ContainersPanel.tsx` | CRUD e start/stop de container |
| ServiceTable | `ServiceTable.tsx` | Lista de serviços |
| ServiceRow | `ServiceRow.tsx` | Linha individual na tabela |
| ContextMenu | `ContextMenu.tsx` | Menu de contexto do serviço |
| LogsPanel | `LogsPanel.tsx` | Logs de um serviço |
| MonitorPanel | `MonitorPanel.tsx` | Logs agregados do container |
| StatusBar | `StatusBar.tsx` | Contadores running/stopped/error |
| SettingsPanel | `SettingsPanel.tsx` | Preferências de UI e sistema |
| SettingsSystemTab | `SettingsSystemTab.tsx` | Java runtime, cache rebuild |
| KillPortModal | `KillPortModal.tsx` | Liberar porta ocupada |
| ServicePortModal | `ServicePortModal.tsx` | Editar porta do serviço |

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

## Utilitários

- `serviceMeta.ts` — labels/cores por tipo de projeto (Spring, Next, etc.)

## API

Todas as chamadas ao core passam por `../api/client.ts`. Tipos em `../api/types.ts`.
