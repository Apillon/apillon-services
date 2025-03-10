import { DeployInstanceDto, ResizeInstanceDto } from '@apillon/lib';
import { Backend } from './models/backend.model';

enum VMStatus {
  CREATED = 'created',
  RUNNING = 'running',
  // STOPPED = 'stopped',
  // ERROR = 'error',
}

export interface ICreateVMRequest {
  name: string;
  image: string;
  teepod_id: number;
  compose_manifest: {
    name: string;
    features: string[];
    docker_compose_file: string;
  };
  vcpu: number;
  memory: number;
  disk_size: number;
  advanced_features: {
    tproxy: boolean;
    kms: boolean;
    public_sys_info: boolean;
    public_logs: boolean;
    docker_config: {
      username: string;
      password: string;
      registry: string | null;
    };
    listed: boolean;
  };
  encrypted_env: string;
  app_env_encrypt_pubkey: string;
  app_id_salt: string;
}

export interface ICreateVMResponse {
  id: string;
  name: string;
  status: VMStatus;
  teepod_id: number;
  teepod: {
    id: number;
    name: string;
  };
  user_id: number;
  app_id: string;
  vm_uuid: string;
  instance_id: string | null;
  app_url: string | null;
  base_image: string;
  vcpu: number;
  memory: number;
  disk_size: number;
  manifest_version: number;
  version: string;
  runner: string;
  docker_compose_file: string;
  features: string[] | null;
  created_at: string;
  encrypted_env_pubkey: string;
}

export interface VMDetailsResponse {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  configuration: Record<string, any>;
  // Add more fields as defined in the OpenAPI response
}

export interface IVMStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkTraffic: {
    inbound: number;
    outbound: number;
  };
  uptime: string;
  processes: number;
  isOnline: boolean;
  isPublic: boolean;
  error: string | null;
  sysinfo: {
    osName: string;
    osVersion: string;
    kernelVersion: string;
    cpuModel: string;
    numCpus: number;
    totalMemory: number;
    availableMemory: number;
    usedMemory: number;
    freeMemory: number;
    totalSwap: number;
    usedSwap: number;
    freeSwap: number;
    uptime: number;
    loadavgOne: number;
    loadavgFive: number;
    loadavgFifteen: number;
    disks: Array<{
      name: string;
      mountPoint: string;
      totalSize: number;
      freeSize: number;
    }>;
  };
}

export interface IVMAttestationResponse {
  is_online: boolean;
  is_public: boolean;
  error: string | null;
  app_certificates: Array<{
    subject: {
      common_name: string;
      organization: string;
      country: string;
      state: string;
      locality: string;
    };
    issuer: {
      common_name: string;
      organization: string;
      country: string;
    };
    serial_number: string;
    not_before: string; // DateTime in ISO 8601 format
    not_after: string; // DateTime in ISO 8601 format
    version: string;
    fingerprint: string;
    signature_algorithm: string;
    sans: string[];
    is_ca: boolean;
    position_in_chain: number;
    quote: string;
  }>;
  tcb_info: {
    mrtd: string;
    rootfs_hash: string;
    rtmr0: string;
    rtmr1: string;
    rtmr2: string;
    rtmr3: string;
  };
}

export interface IBackendHostingStrategy {
  deployDockerCompose(body: DeployInstanceDto): Promise<ICreateVMResponse>;

  getInstanceDetails(backend: Backend): Promise<any>;

  // getInstanceBilling(backend: Backend): Promise<any>;

  startInstance(backend: Backend): Promise<ICreateVMResponse>;

  shutdownInstance(backend: Backend): Promise<ICreateVMResponse>;

  stopInstance(backend: Backend): Promise<ICreateVMResponse>;

  restartInstance(backend: Backend): Promise<ICreateVMResponse>;

  destroyInstance(backend: Backend): Promise<void>;

  getInstanceStats(backend: Backend): Promise<IVMStats>;

  getInstanceAttestation(backend: Backend): Promise<IVMAttestationResponse>;

  resizeInstance(backend: Backend, body: ResizeInstanceDto): Promise<boolean>;
}
