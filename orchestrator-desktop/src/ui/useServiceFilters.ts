import { useMemo, useState } from "react";
import type { DropdownOption } from "./Dropdown";
import type { ProjectType, ServiceDto } from "../api/types";
import { buildTechFilterOptions } from "./techMeta";

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
      ...buildTechFilterOptions(availableTechs),
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
