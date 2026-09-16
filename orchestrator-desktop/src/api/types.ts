export type ServiceStatus = "RUNNING" | "STOPPED" | "ERROR";

export type ProjectType =
  | "SPRING_BOOT"
  | "NEXT"
  | "NEST"
  | "REACT"
  | "VUE"
  | "ANGULAR"
  | "ASTRO"
  | "SVELTE"
  | "REMIX"
  | "EXPRESS"
  | "FASTIFY"
  | "HONO"
  | "STATIC_HTML"
  | "STANDALONE_JS"
  | "LARAVEL"
  | "SYMFONY"
  | "PHP_COMPOSER"
  | "STANDALONE_PHP"
  | "UNKNOWN";

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
  phpHome?: string;
  phpVersion?: string;
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

export type PhpInfo = {
  version: string;
  fullVersion: string;
  path: string;
  source: string;
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

export type DockerEngineProvider = "COLIMA" | "DOCKER_DESKTOP" | "SYSTEMD" | "UNKNOWN";

export type DockerEngineStatusDto = {
  cliAvailable: boolean;
  cliPath?: string | null;
  engineRunning: boolean;
  starting: boolean;
  clientVersion?: string | null;
  serverVersion?: string | null;
  context?: string | null;
  provider: DockerEngineProvider;
  colimaAvailable: boolean;
  colimaRunning: boolean;
  colimaProfile?: string | null;
  startCommand?: string | null;
  startCommandConfigured: boolean;
  startCommandRequired: boolean;
  message?: string | null;
};

export type DockerResourceKind = "CONTAINER" | "IMAGE" | "VOLUME";

export type DockerContainerDto = {
  id: string;
  name: string;
  image: string;
  command: string;
  state: string;
  status: string;
  ports: string;
  createdAt: string;
  runningFor: string;
  size: string;
  project?: string | null;
  service?: string | null;
  localVolumes: number;
};

export type DockerImageDto = {
  id: string;
  repository: string;
  tag: string;
  size: string;
  createdAt: string;
  createdSince: string;
  dangling: boolean;
  inUse: boolean;
};

export type DockerVolumeDto = {
  name: string;
  driver: string;
  mountpoint: string;
  scope: string;
  anonymous: boolean;
  inUse: boolean;
};

export type DockerDiskUsageDto = {
  type: string;
  totalCount: string;
  active: string;
  size: string;
  reclaimable: string;
};

export type DockerInventoryDto = {
  available: boolean;
  message?: string | null;
  containers: DockerContainerDto[];
  images: DockerImageDto[];
  volumes: DockerVolumeDto[];
  diskUsage: DockerDiskUsageDto[];
};

export type DockerOperationResultDto = {
  kind: string;
  id: string;
  ok: boolean;
  message: string;
};

export type DockerPruneScope = "CONTAINERS" | "IMAGES" | "VOLUMES" | "BUILD_CACHE" | "NETWORKS";

export type DockerResourceTarget = {
  kind: DockerResourceKind;
  id: string;
};

export type PortOrigin = "cursor" | "vscode" | "ide" | "terminal" | "docker" | "runtime" | "system";

export type ListeningPortDto = {
  port: number;
  pid: number;
  processName: string;
  command: string;
  address: string;
  origin: PortOrigin;
  devRelated: boolean;
  devPort: boolean;
};
