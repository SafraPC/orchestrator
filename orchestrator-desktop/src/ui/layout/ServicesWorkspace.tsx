import type { Dispatch, SetStateAction } from "react";
import type { ContainerDto, JdkInfo, PhpInfo, ProjectType, ServiceDto } from "../../api/types";
import { ContainersPanel } from "../containers/containers/ContainersPanel";
import { ContainerTabs } from "../containers/container/ContainerTabs";
import { Dropdown, type DropdownOption } from "../dropdown/Dropdown";
import { Icon } from "../icons/Icons";
import { LogsPanel } from "../logs/logs/LogsPanel";
import { ResizeHandle } from "../resize-handle/ResizeHandle";
import { ServiceTable } from "../service-table/ServiceTable";
import type { ToastType } from "../toast/Toast";
import { Tooltip } from "../tooltip/Tooltip";
import { ImportSection } from "./ImportSection";
import { StatusBar } from "./StatusBar";
import type { AppUpdateState } from "../workspace/hooks/useAppUpdater";

export function ServicesWorkspace(props: {
  hidden: boolean;
  containersCollapsed: boolean;
  onToggleContainers: () => void;
  sideW: number;
  onSideW: (value: number) => void;
  svcW: number;
  onSvcW: (value: number) => void;
  services: ServiceDto[];
  containers: ContainerDto[];
  selectedContainer: string | null;
  onSelectContainer: (id: string | null) => Promise<void>;
  onRefresh: () => Promise<void>;
  onRefreshPorts: () => Promise<void>;
  onContainersReorder: Dispatch<SetStateAction<ContainerDto[]>>;
  onToast: (type: ToastType, message: string) => void;
  filterText: string;
  onFilterText: (value: string) => void;
  techFilter: ProjectType | "";
  onTechFilter: (value: ProjectType | "") => void;
  availableTechs: ProjectType[];
  techDropdownOptions: DropdownOption<ProjectType | "">[];
  filteredServices: ServiceDto[];
  selected: string | null;
  onSelect: (name: string) => void;
  selectedServices: string[];
  onSelectedServicesChange: (names: string[]) => void;
  onServicesUpdate: (services: ServiceDto[]) => void;
  jdks: JdkInfo[];
  phps: PhpInfo[];
  loading: boolean;
  selectedService: ServiceDto | null;
  selectedLogServices: ServiceDto[];
  containerServices: ServiceDto[];
  fontSize: number;
  lineWrap: boolean;
  update: AppUpdateState;
}) {
  return (
    <main
      className="flex-1 min-h-0"
      style={{ display: props.hidden ? "none" : "flex" }}
    >
      <aside
        className="flex min-h-0 shrink-0 flex-col self-stretch overflow-hidden border-r border-white/[0.04]"
        style={{
          width: props.containersCollapsed ? 40 : props.sideW,
          transition: props.containersCollapsed ? "width 0.2s" : undefined,
        }}
      >
        <div className="flex shrink-0 items-center justify-between px-3 py-2.5 border-b border-white/[0.04]">
          <span
            className={`text-2xs font-semibold uppercase tracking-widest text-slate-600 transition-opacity ${
              props.containersCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            }`}
          >
            Containers
          </span>
          <Tooltip text={props.containersCollapsed ? "Expandir" : "Recolher"}>
            <button className="btn-ghost rounded p-1" onClick={props.onToggleContainers}>
              <Icon.Chevron
                className={`h-3 w-3 text-slate-600 transition-transform duration-200 ${
                  props.containersCollapsed ? "rotate-180" : ""
                }`}
              />
            </button>
          </Tooltip>
        </div>
        <div
          className={`min-h-0 transition-opacity duration-200 ${
            props.containersCollapsed
              ? "opacity-0 pointer-events-none h-0 overflow-hidden"
              : "flex min-h-0 flex-1 flex-col overflow-hidden opacity-100"
          }`}
        >
          <ContainersPanel
            services={props.services}
            containers={props.containers}
            selectedContainer={props.selectedContainer}
            onSelectContainer={props.onSelectContainer}
            onRefresh={props.onRefresh}
            onContainersChanged={props.onRefresh}
            onContainersReorder={props.onContainersReorder}
            onToast={props.onToast}
          />
        </div>
      </aside>
      {!props.containersCollapsed && (
        <ResizeHandle value={props.sideW} onChange={props.onSideW} min={180} max={420} />
      )}

      <section className="flex flex-col shrink-0 border-r border-white/[0.04]" style={{ width: props.svcW }}>
        <div className="px-3 py-2.5 border-b border-white/[0.04] space-y-2">
          <ContainerTabs
            containers={props.containers}
            selectedContainer={props.selectedContainer}
            onSelect={props.onSelectContainer}
            onContainersChanged={props.onRefresh}
            onToast={props.onToast}
          />
          <ImportSection
            onImported={props.onRefresh}
            onRefreshPorts={props.onRefreshPorts}
            containerId={props.selectedContainer}
            addToast={props.onToast}
          />
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <Icon.Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-600 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar..."
                value={props.filterText}
                onChange={(e) => props.onFilterText(e.target.value)}
                className="input pl-7 text-2xs"
              />
            </div>
            {props.availableTechs.length > 1 && (
              <Dropdown
                value={props.techFilter}
                onChange={props.onTechFilter}
                options={props.techDropdownOptions}
                placeholder="Filtrar"
                align="right"
              />
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <ServiceTable
            services={props.filteredServices}
            allServices={props.services}
            selected={props.selected}
            onSelect={props.onSelect}
            selectedServices={props.selectedServices}
            onSelectedServicesChange={props.onSelectedServicesChange}
            onAction={props.onRefresh}
            onServicesUpdate={props.onServicesUpdate}
            selectedContainer={props.selectedContainer}
            containers={props.containers}
            jdks={props.jdks}
            phps={props.phps}
            onToast={props.onToast}
            loading={props.loading}
          />
        </div>
        <StatusBar
          services={props.services}
          selectedContainer={props.selectedContainer}
          filteredCount={props.filteredServices.length}
          update={props.update}
        />
      </section>
      <ResizeHandle value={props.svcW} onChange={props.onSvcW} min={220} max={450} />

      <section className="flex flex-1 min-w-0 flex-col relative">
        <LogsPanel
          service={props.selectedService}
          selectedServices={props.selectedLogServices}
          selectedContainer={props.selectedContainer}
          containerServices={props.containerServices}
          fontSize={props.fontSize}
          lineWrap={props.lineWrap}
          onToast={props.onToast}
        />
      </section>
    </main>
  );
}
