export type ServiceStatus = "RUNNING" | "STOPPED" | "ERROR";

export type ProjectType = "SPRING_BOOT" | "NEXT" | "NEST" | "REACT" | "VUE" | "UNKNOWN";

export type ServiceDto = {
  name: string;
  path: string;
  command: string[];
  logFile: string;
  env?: Record<string, string>;
  detectedPort?: number | null;
  customPort?: number | null;
  portStrategy?: string | null;
  currentBranch?: string | null;
  javaHome?: string;
  javaVersion?: string;
  containerIds?: string[];
  projectType?: ProjectType;
  availableScripts?: string[];
  selectedScript?: string | null;
  useMvnWrapper?: boolean | null;
  hasMvnWrapper?: boolean | null;
  pid?: number | null;
  status: ServiceStatus;
  lastStartAt?: string | null;
  lastStopAt?: string | null;
  lastError?: string | null;
};

export type StopResultDto = {
  ok: boolean;
  message: string;
  pid: number;
};

export type WorkspaceDto = {
  roots: string[];
  excludeDirs: string[];
  containers?: Record<string, ContainerDto>;
};

export type ContainerDto = {
  id: string;
  name: string;
  description?: string;
};

export type JdkInfo = {
  majorVersion: string;
  fullVersion: string;
  path: string;
  vendor: string;
};

export type RuntimeSettingsDto = {
  javaPath?: string | null;
};

export type ActiveJavaInfoDto = {
  javaHome: string;
  javaVersion: string;
  vendor: string;
  runtimeName: string;
};

export type ServiceBranchMapDto = Record<string, string | null>;
