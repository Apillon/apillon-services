import { x25519 } from '@noble/curves/ed25519';
import {
  AppEnvironment,
  DeployInstanceDto,
  DeploySecretDto,
  env,
  ResizeInstanceDto,
  VirtualMachineDto,
} from '@apillon/lib';
import { PhalaCloudClient } from '../clients/phala-cloud.client';
import {
  IBackendDeployStrategy,
  ICreateVMResponse,
  IDeployDockerResult,
  IVMAttestationResponse,
  IVMStats,
} from '../types';
import { Backend } from '../models/backend.model';
import { DeployCodeException } from '../../../lib/exceptions';
import { DeployErrorCode } from '../../../config/types';
import axios from 'axios';
import { getBackendStatus } from '../helpers/phala-statuses';

export class PhalaDockerDeployStrategy implements IBackendDeployStrategy {
  private client: PhalaCloudClient;

  constructor(client: PhalaCloudClient) {
    this.client = client;
  }

  async deployDockerCompose(
    body: DeployInstanceDto,
  ): Promise<IDeployDockerResult> {
    const secrets = body.secrets;
    const virtualMachine = body.virtualMachine;
    try {
      const pod = await this.client.getAvailablePods();
      if (pod.nodes.length <= 0) {
        throw new DeployCodeException({
          status: 500,
          code: DeployErrorCode.DEPLOY_POD_NOT_FOUND,
          errorMessage: 'No available pods found.',
        });
      }
      const podId = pod.nodes[0].teepod_id;
      const isProduction = env.APP_ENV === AppEnvironment.PROD;
      const latestImage = pod.nodes[0].images
        .filter((image: any) => image.is_dev === !isProduction)
        .reduce((latest: any, current: any) => {
          const currentVersion = parsePhalaImageVersion(current.version);
          const latestVersion = latest
            ? parsePhalaImageVersion(latest.version)
            : 0;
          return currentVersion > latestVersion ? current : latest;
        }, null);
      const imageName = latestImage?.name;
      if (!imageName) {
        throw new DeployCodeException({
          status: 500,
          code: DeployErrorCode.DEPLOY_POD_NOT_FOUND,
          errorMessage: 'No suitable image was found.',
        });
      }
      const vmConfig = this.getVmConfig(
        body.name,
        imageName,
        podId,
        body.dockerCompose,
        virtualMachine,
      );
      const withPubKey = await this.client.getPublicKey(vmConfig);
      const encryptedEnv = await PhalaDockerDeployStrategy.encryptEnvVariables(
        secrets,
        withPubKey.app_env_encrypt_pubkey,
      );
      const result = await this.client.createCVM({
        ...vmConfig,
        encrypted_env: encryptedEnv,
        app_env_encrypt_pubkey: withPubKey.app_env_encrypt_pubkey,
        app_id_salt: withPubKey.app_id_salt,
      });
      if (!result) {
        throw new DeployCodeException({
          status: 500,
          code: DeployErrorCode.DEPLOY_DEPLOY_FAILED,
          errorMessage: 'No data returned from deploy',
        });
      }
      // TODO: vcpu as DTO?
      // TODO: add dto ICreateVMResponse?
      const appId = result.app_id;
      const externalStatus = result.status;
      const data = {
        appId: appId,
        id: result.id,
        name: result.name,
        status: externalStatus,
        teepodId: result.teepod_id,
        teepod: {
          id: result.teepod?.id,
          name: result.teepod?.name,
        },
        userId: result.user_id,
        vmUuid: result.vm_uuid,
        instanceId: result.instance_id,
        appUrl: result.app_url,
        baseImage: result.base_image,
        vcpu: result.vcpu,
        memory: result.memory,
        diskSize: result.disk_size,
        manifestVersion: result.manifest_version,
        version: result.version,
        runner: result.runner,
        dockerComposeFile: result.docker_compose_file,
        features: result.features,
        createdAt: result.created_at,
        encryptedEnvPubkey: result.encrypted_env_pubkey,
        dashboardUrl: `https://cloud.phala.network/dashboard/cvms/app_${appId}`,
      };
      return {
        backendStatus: getBackendStatus(externalStatus),
        instanceId: appId,
        // TODO: this URL changes
        url: `https://${appId}-80.dstack-prod5.phala.network`,
        data,
      };
    } catch (error: unknown) {
      if (error instanceof DeployCodeException) {
        console.error(`Failed to deploy CVM: ${error.message}`);
        throw error;
      }

      if (error instanceof axios.AxiosError) {
        console.error(
          `Failed to deploy CVM due to AxiosError: ${error.message}`,
        );
        const response = error.response;
        const errorDetails =
          response?.status === 422
            ? `Failed to deploy CVM (422): ${JSON.stringify(response.data, null, 2)}`
            : `${response?.status}: ${JSON.stringify(
                {
                  status: response?.status,
                  headers: response?.headers,
                  data: response?.data,
                },
                null,
                2,
              )}`;
        throw new DeployCodeException({
          status: 500,
          code: DeployErrorCode.DEPLOY_DEPLOY_FAILED,
          errorMessage: errorDetails,
        });
      }
      const errorMessage = `Unhandled error when deploying CVM: ${String(error)}`;
      console.error(errorMessage);
      throw new DeployCodeException({
        status: 500,
        code: DeployErrorCode.DEPLOY_DEPLOY_FAILED,
        errorMessage,
      });
    }
  }

  private getVmConfig(
    instanceName: string,
    imageName: string,
    podId: number,
    dockerCompose: string,
    virtualMachine: VirtualMachineDto,
  ) {
    return {
      name: instanceName,
      image: imageName,
      teepod_id: podId,
      compose_manifest: {
        name: instanceName,
        features: ['kms', 'tproxy-net'],
        docker_compose_file: dockerCompose,
      },
      // specs
      vcpu: virtualMachine.cpuCount,
      memory: virtualMachine.memory,
      disk_size: virtualMachine.diskSize,
      advanced_features: {
        tproxy: true,
        kms: true,
        public_sys_info: true,
        public_logs: false,
        // docker registry
        docker_config: {
          username: '',
          password: '',
          registry: null,
        },
        listed: false,
      },
    };
  }

  async updateDockerCompose(instanceId: string, secrets: DeploySecretDto[]) {
    const cvmDetails = await this.client.getCVMCompose(instanceId);
    const encryptedEnv = await PhalaDockerDeployStrategy.encryptEnvVariables(
      secrets,
      cvmDetails.env_pubkey,
    );

    return this.client.updateCVM(instanceId, {
      compose_manifest: cvmDetails.compose_file.docker_compose_file,
      encrypted_env: encryptedEnv,
    });
  }

  async getInstanceDetails(backend: Backend) {
    return await this.client.getCVMDetails(backend.instanceId);
  }

  // async getInstanceBilling(backend: Backend) {
  //   return await this.client.getInstanceBilling(backend.instanceId);
  // }

  async startInstance(backend: Backend): Promise<ICreateVMResponse> {
    return await this.client.startCVM(backend.instanceId);
  }

  async shutdownInstance(backend: Backend): Promise<ICreateVMResponse> {
    return await this.client.shutdownCVM(backend.instanceId);
  }

  async stopInstance(backend: Backend): Promise<ICreateVMResponse> {
    return await this.client.stopCVM(backend.instanceId);
  }

  async restartInstance(backend: Backend): Promise<ICreateVMResponse> {
    return await this.client.restartCVM(backend.instanceId);
  }

  async destroyInstance(backend: Backend): Promise<void> {
    return await this.client.destroyCVM(backend.instanceId);
  }

  async getInstanceStats(backend: Backend): Promise<IVMStats> {
    return await this.client.getCVMStats(backend.instanceId);
  }

  async getInstanceAttestation(
    backend: Backend,
  ): Promise<IVMAttestationResponse> {
    return await this.client.getCVMAttestation(backend.instanceId);
  }

  async resizeInstance(
    backend: Backend,
    body: ResizeInstanceDto,
  ): Promise<boolean> {
    try {
      await this.client.resizeCVM(backend.instanceId, {
        allow_restart: body.allowRestart ? 1 : 0,
        vcpu: body.cpuCount,
        memory: body.memory,
        disk_size: body.diskSize,
      });
      return true;
    } catch (e) {
      throw new DeployCodeException({
        status: 500,
        code: DeployErrorCode.DEPLOY_RESIZE_FAILED,
        errorMessage: `Failed resizing instance: ${e?.message ?? e}`,
      });
    }
  }

  //region HELPER
  private static async encryptEnvVariables(
    envs: Record<string, any>[],
    publicKeyHex: string,
  ): Promise<string> {
    const envsJson = JSON.stringify({ env: envs });
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKey = x25519.getPublicKey(privateKey);
    const remotePubkey = hexToUint8Array(publicKeyHex);
    const shared = x25519.getSharedSecret(privateKey, remotePubkey);
    const importedShared = await crypto.subtle.importKey(
      'raw',
      shared,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt'],
    );
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      importedShared,
      new TextEncoder().encode(envsJson),
    );
    const result = new Uint8Array(
      publicKey.length + iv.length + encrypted.byteLength,
    );
    result.set(publicKey);
    result.set(iv, publicKey.length);
    result.set(new Uint8Array(encrypted), publicKey.length + iv.length);

    return uint8ArrayToHex(result);
  }

  //endregion
}

/**
 * Converts a hexadecimal string to a Uint8Array.
 *
 * @param hex - The hexadecimal string to convert. May optionally begin with "0x".
 * @return The resulting Uint8Array converted from the hexadecimal string.
 */
function hexToUint8Array(hex: string) {
  hex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

/**
 * Converts a Uint8Array into a hexadecimal string representation.
 *
 * @param buffer - The Uint8Array to convert.
 * @return The hexadecimal string representation of the input buffer.
 */
function uint8ArrayToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Parses and converts a version array into a numerical value representing the version.
 *
 * This function takes an array of numbers, where each number represents a part of a version (e.g., major, minor, patch: `[1, 5, 7]`),
 * and calculates a single numerical value by assigning decreasing weights to each segment of the version.
 *
 * @param versionArray - An array of numbers representing the individual parts of the version
 *                                  (e.g., [major, minor, patch]).
 * @returns A computed numeric value representing the version, with each part weighted appropriately.
 */
const parsePhalaImageVersion = (versionArray: number[]) =>
  versionArray.reduce((acc, num, idx) => acc + num * 10 ** (2 * (2 - idx)), 0);
