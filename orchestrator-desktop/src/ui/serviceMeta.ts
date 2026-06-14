import type { ServiceBranchMapDto, ServiceDto, ProjectType } from "../api/types";

const PHP_TYPES = new Set<ProjectType>(["LARAVEL", "SYMFONY", "PHP_COMPOSER", "STANDALONE_PHP"]);

export function isPhpProject(projectType?: ProjectType): boolean {
  return !!projectType && PHP_TYPES.has(projectType);
}

export function getServicePort(service: ServiceDto): string | null {
  const port = service.customPort ?? service.detectedPort ?? service.env?.SERVER_PORT ?? service.env?.PORT ?? null;
  return port == null ? null : String(port);
}

export function canChangeServicePort(service: ServiceDto): boolean {
  return service.portStrategy === "CLI";
}

export function usesNpmScripts(projectType?: ProjectType): boolean {
  return !!projectType
    && projectType !== "SPRING_BOOT"
    && !isPhpProject(projectType)
    && projectType !== "STATIC_HTML"
    && projectType !== "STANDALONE_JS";
}

export function usesPhpScripts(projectType?: ProjectType): boolean {
  return isPhpProject(projectType) && projectType !== "STANDALONE_PHP";
}

export function getScriptMenuLabel(projectType?: ProjectType): string {
  if (projectType === "STATIC_HTML") return "Arquivo HTML";
  if (projectType === "STANDALONE_JS") return "Arquivo JavaScript";
  if (usesPhpScripts(projectType)) return "Comando PHP";
  if (usesNpmScripts(projectType)) return "npm script";
  return "Entrada";
}

export function formatScriptLabel(scriptId: string, projectType?: ProjectType): string {
  if (scriptId === "artisan:serve") return "artisan serve";
  if (scriptId === "symfony:serve") return "symfony serve";
  if (usesPhpScripts(projectType) && scriptId !== "artisan:serve" && scriptId !== "symfony:serve") {
    return `composer run ${scriptId}`;
  }
  return scriptId;
}

export function formatBranchLabel(branch: string): string {
  const normalized = branch.trim();
  if (normalized.length <= 26) {
    return normalized;
  }
  return `${normalized.slice(0, 23)}...`;
}

export function preserveCurrentBranches(next: ServiceDto[], previous: ServiceDto[]): ServiceDto[] {
  const branches = new Map(previous.map((service) => [service.name, service.currentBranch ?? null]));
  return next.map((service) => ({ ...service, currentBranch: branches.get(service.name) ?? null }));
}

export function applyCurrentBranches(services: ServiceDto[], branches: ServiceBranchMapDto): ServiceDto[] {
  return services.map((service) => ({
    ...service,
    currentBranch: Object.prototype.hasOwnProperty.call(branches, service.name) ? branches[service.name] ?? null : service.currentBranch ?? null,
  }));
}
