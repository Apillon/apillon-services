import { x25519 } from '@noble/curves/ed25519';
import {
  AppEnvironment,
  DeployInstanceDto,
  env,
  ResizeInstanceDto,
} from '@apillon/lib';
import { PhalaDockerClient } from '../clients/phala-tee.client';
import {
  IBackendDeployStrategy,
  ICreateVMResponse,
  IVMAttestationResponse,
  IVMStats,
} from '../types';
import { Backend } from '../models/backend.model';
import { DeployCodeException } from '../../../lib/exceptions';
import { DeployErrorCode } from '../../../config/types';

export class PhalaDockerDeployStrategy implements IBackendDeployStrategy {
  private client: PhalaDockerClient;

  constructor(client: PhalaDockerClient) {
    this.client = client;
  }

  async deployDockerCompose(
    body: DeployInstanceDto,
  ): Promise<ICreateVMResponse> {
    const secrets = body.secrets;
    const virtualMachine = body.virtualMachine;
    const pod = await this.client.getAvailablePods();
    if (pod.nodes.length === 0) {
      throw new DeployCodeException({
        status: 500,
        code: DeployErrorCode.DEPLOY_POD_NOT_FOUND,
        errorMessage: 'No available pods found.',
      });
    }
    const podId = pod.nodes[0].teepod_id;
    const isProduction = env.APP_ENV === AppEnvironment.PROD;
    const imageName = pod.nodes[0].images.find(
      (image: any) => image.is_dev === !isProduction,
    )?.name;
    if (!imageName) {
      throw new DeployCodeException({
        status: 500,
        code: DeployErrorCode.DEPLOY_POD_NOT_FOUND,
        errorMessage: 'No development image with is_dev set to true was found.',
      });
    }

    const vmConfig = {
      name: `my-tee-for-poa`,
      //image: 'dstack-dev-0.3.4',
      image: imageName,
      teepod_id: podId,
      compose_manifest: {
        name: `my-tee-for-poa`,
        features: ['kms', 'tproxy-net'],
        docker_compose_file: body.dockerCompose,
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
    try {
      const withPubKey = await this.client.getPublicKey(vmConfig);
      const encryptedEnv = await this.encryptEnvVariables(
        secrets,
        withPubKey.app_env_encrypt_pubkey,
      );
      return await this.client.createCVM({
        ...vmConfig,
        encrypted_env: encryptedEnv,
        app_env_encrypt_pubkey: withPubKey.app_env_encrypt_pubkey,
        app_id_salt: withPubKey.app_id_salt,
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.status === 422
          ? `Failed to deploy CVM (422): ${JSON.stringify(error.response._data, null, 2)}`
          : `Failed to deploy CVM: ${error}`;
      throw new DeployCodeException({
        status: 500,
        code: DeployErrorCode.DEPLOY_DEPLOY_FAILED,
        errorMessage,
      });
    }
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
  private async encryptEnvVariables(
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
