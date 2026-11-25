import { useEffect, useRef, useState } from "react";
import type { ServiceDto } from "../../../api/types";
import type { ToastType } from "../../toast/Toast";
import { MonitorTabs } from "../log/logTabs";
import { MonitorPanel } from "../monitor/MonitorPanel";
import { ServiceLogView } from "../service-log-view/ServiceLogView";

export function LogsPanel(props: {
  service: ServiceDto | null;
  selectedServices?: ServiceDto[];
  selectedContainer?: string | null;
  containerServices?: ServiceDto[];
  fontSize?: number;
  lineWrap?: boolean;
  onToast?: (t: ToastType, m: string) => void;
}) {
  const [mode, setMode] = useState<"service" | "monitor">("service");
  const selectedServices = props.selectedServices ?? [];
  const hasSelectedMonitor = selectedServices.length >= 2;
  const monitorServices = hasSelectedMonitor ? selectedServices : props.containerServices ?? [];
  const canMonitor = hasSelectedMonitor || ((props.containerServices?.length ?? 0) >= 2 && !!props.selectedContainer);
  const svcName = props.service?.name ?? null;
  const pendingMonitor = useRef(false);
  const selectedServicesKey = selectedServices.map((service) => service.name).join(",");

  useEffect(() => {
    if (hasSelectedMonitor) {
      setMode("monitor");
      pendingMonitor.current = false;
    }
  }, [hasSelectedMonitor, selectedServicesKey]);

  useEffect(() => {
    if (hasSelectedMonitor) {
      return;
    }
    if (!props.selectedContainer) {
      setMode("service");
      pendingMonitor.current = false;
      return;
    }
    pendingMonitor.current = true;
    if (canMonitor) {
      setMode("monitor");
      pendingMonitor.current = false;
    }
  }, [props.selectedContainer, hasSelectedMonitor]);

  useEffect(() => {
    if (pendingMonitor.current && canMonitor) {
      setMode("monitor");
      pendingMonitor.current = false;
    }
    if (!canMonitor && mode === "monitor") {
      setMode("service");
    }
  }, [canMonitor, mode]);

  const prevSvc = useRef(svcName);
  useEffect(() => {
    if (prevSvc.current !== svcName && svcName) {
      setMode("service");
      pendingMonitor.current = false;
    }
    prevSvc.current = svcName;
  }, [svcName]);

  if (mode === "monitor" && canMonitor) {
    return (
      <div className="flex h-full flex-col">
        <MonitorTabs mode={mode} onMode={setMode} canMonitor={canMonitor} />
        <MonitorPanel
          services={monitorServices}
          fontSize={props.fontSize}
          lineWrap={props.lineWrap}
          onToast={props.onToast}
        />
      </div>
    );
  }

  return (
    <ServiceLogView
      service={props.service}
      fontSize={props.fontSize}
      lineWrap={props.lineWrap}
      onToast={props.onToast}
      mode={mode}
      onMode={setMode}
      canMonitor={canMonitor}
    />
  );
}
