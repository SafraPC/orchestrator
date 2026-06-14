import { useMemo, useState } from "react";
import type { DropdownOption } from "./Dropdown";
import type { ProjectType, ServiceDto } from "../api/types";

const TECH_OPTIONS: DropdownOption<ProjectType>[] = [
  { value: "SPRING_BOOT", label: "Spring", icon: "Java", iconClassName: "text-orange-400" },
  { value: "NEXT", label: "Next", icon: "Next", iconClassName: "text-white" },
  { value: "NEST", label: "Nest", icon: "Nest", iconClassName: "text-red-400" },
  { value: "ANGULAR", label: "Angular", icon: "Code", iconClassName: "text-red-500" },
  { value: "REACT", label: "React", icon: "ReactIcon", iconClassName: "text-cyan-400" },
  { value: "VUE", label: "Vue", icon: "Vue", iconClassName: "text-emerald-400" },
  { value: "STATIC_HTML", label: "HTML", icon: "Globe", iconClassName: "text-amber-400" },
  { value: "STANDALONE_JS", label: "JS", icon: "Code", iconClassName: "text-yellow-400" },
  { value: "UNKNOWN", label: "Node", icon: "Box", iconClassName: "text-slate-400" },
];

export function useServiceFilters(services: ServiceDto[], selectedContainer: string | null) {
  const [filterText, setFilterText] = useState("");
  const [techFilter, setTechFilter] = useState<ProjectType | "">("");

  const availableTechs = useMemo(() => {
    const set = new Set<ProjectType>();
    for (const service of services) if (service.projectType) set.add(service.projectType);
    return Array.from(set).sort();
  }, [services]);

  const containerServices = useMemo(
    () => (selectedContainer ? services.filter((s) => s.containerIds?.includes(selectedContainer)) : []),
    [services, selectedContainer],
  );

  const filteredServices = useMemo(() => {
    let result = selectedContainer ? containerServices : services;
    if (techFilter) result = result.filter((s) => (s.projectType ?? "SPRING_BOOT") === techFilter);
    if (filterText) {
      const term = filterText.toLowerCase();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(term) || s.path.toLowerCase().includes(term),
      );
    }
    return result;
  }, [services, containerServices, selectedContainer, filterText, techFilter]);

  const techDropdownOptions = useMemo<DropdownOption<ProjectType | "">[]>(
    () => [
      { value: "", label: "Todos", icon: "Scan", iconClassName: "text-accent" },
      ...TECH_OPTIONS.filter((t) => availableTechs.includes(t.value)),
    ],
    [availableTechs],
  );

  return {
    filterText,
    setFilterText,
    techFilter,
    setTechFilter,
    availableTechs,
    containerServices,
    filteredServices,
    techDropdownOptions,
  };
}
