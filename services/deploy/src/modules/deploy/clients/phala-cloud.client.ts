import {
  ICreateVMRequest,
  ICreateVMResponse,
  ICvmComposeDetails,
  IUpdateVMRequest,
  IVMAttestationResponse,
  IVMStats,
  VMDetailsResponse,
} from '../types';
import axios, { AxiosInstance } from 'axios';
import { IVMResourceRequest } from './types';
import { x25519 } from '@noble/curves/ed25519';

/**
 * PhalaDockerClient is a client that interacts with the Phala CVM (Confidential
 * Virtual Machine) API to manage virtual machines and handle encryption of
 * environment variables. It facilitates communication with the API using
 * preconfigured credentials and endpoints.
 */
export class PhalaCloudClient {
  private api: AxiosInstance;

  constructor(baseURL: string, apiKey: string) {
    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });
  }

  /**
   * Fetches the list of available pods from the server.
   *
   * @return A promise that resolves with the response containing the available pods information.
   */
  async getAvailablePods(): Promise<ITeePods> {
    const response = await this.api.get('/teepods/available');
    return response.data;
  }

  /**
   * Get the public key required for secret encryption.
   */
  async getPublicKey(body: Record<string, any>): Promise<any> {
    const response = await this.api.post(
      '/cvms/pubkey/from_cvm_configuration',
      body,
    );
    return response.data;
  }

  /**
   * Create a virtual machine using the provided configuration.
   */
  async createCVM(vmConfig: ICreateVMRequest): Promise<ICreateVMResponse> {
    const response = await this.api.post(
      '/cvms/from_cvm_configuration',
      vmConfig,
    );
    return response.data;
  }

  /**
   * Update a virtual machine configuration.
   *
   * @param identifier - The unique identifier of the CVM to update
   * @param vmConfig - The new configuration for the virtual machine
   * @returns A promise that resolves with the response containing the updated configuration
   */
  async updateCVM(
    identifier: string,
    vmConfig: IUpdateVMRequest,
  ): Promise<ICreateVMResponse> {
    const response = await this.api.put(
      `/cvms/app_${identifier}/compose`,
      vmConfig,
    );
    return response.data;
  }

  /**
   * Get virtual machine configuration.
   *
   * @param identifier - The unique identifier of the CVM to get configuration for
   * @returns A promise that resolves with the response containing the CVM configuration
   */
  async getCVMCompose(identifier: string): Promise<ICvmComposeDetails> {
    const response = await this.api.get(`/cvms/app_${identifier}/compose`);
    return response.data;
  }

  /**
   * Get detailed information about a virtual machine by its ID.
   */
  async getCVMDetails(identifier: string): Promise<VMDetailsResponse> {
    const response = await this.api.get(`/cvms/app_${identifier}`);
    return response.data;
  }

  /**
   * Start a stopped virtual machine.
   */
  async startCVM(identifier: string): Promise<ICreateVMResponse> {
    const response = await this.api.post(`/cvms/app_${identifier}/start`);
    return response.data;
  }

  /**
   * Shut down an active virtual machine.
   */
  async shutdownCVM(identifier: string): Promise<ICreateVMResponse> {
    const response = await this.api.post(`/cvms/app_${identifier}/shutdown`);
    return response.data;
  }

  /**
   * Stop a running virtual machine.
   */
  async stopCVM(identifier: string): Promise<ICreateVMResponse> {
    const response = await this.api.post(`/cvms/app_${identifier}/stop`);
    return response.data;
  }

  /**
   * Restart a running virtual machine.
   */
  async restartCVM(identifier: string): Promise<ICreateVMResponse> {
    const response = await this.api.post(`/cvms/app_${identifier}/restart`);
    return response.data;
  }

  /**
   * Destroy a virtual machine.
   */
  async destroyCVM(identifier: string): Promise<void> {
    const response = await this.api.delete(`/cvms/app_${identifier}`);
    return response.data;
  }

  /**
   * Get metrics or statistics of a virtual machine by its ID.
   */
  async getCVMStats(identifier: string): Promise<IVMStats> {
    const response = await this.api.get(`/cvms/app_${identifier}/stats`);
    return response.data;
  }

  /**
   * Fetches the CVM attestation associated with the provided identifier.
   *
   * @param identifier - The unique identifier for the CVM application whose attestation is being requested.
   * @return A promise that resolves to the CVM attestation response.
   */
  async getCVMAttestation(identifier: string): Promise<IVMAttestationResponse> {
    const response = await this.api.get(`/cvms/app_${identifier}/attestation`);
    return response.data;
  }

  /**
   * Adjusts the computing resources of an existing CVM (Cloud Virtual Machine) identified by the given identifier.
   *
   * @param identifier - The unique identifier of the CVM to be resized.
   * @param config - Configuration object specifying the desired resource adjustments for the CVM.
   * @return Resolves to a confirmation message or identifier after successfully modifying the CVM resources.
   */
  async resizeCVM(
    identifier: string,
    config: IVMResourceRequest,
  ): Promise<string> {
    const response = await this.api.patch(
      `/cvms/app_${identifier}/resources`,
      config,
    );
    return response.data;
  }

  // async getInstanceBilling(identifier: string) {
  //   const response =  await this.request(
  //   return response.data
  //     `/billing/billing_items/app_${identifier}/resources`,
  //     {
  //       method: 'GET',
  //     },
  //   );
  // }

  /**
   * Encrypts an array of environment variable objects with the given public key using the x25519 algorithm and AES-GCM encryption.
   * Used to encrypt environment variables before sending them to Phala cloud API.
   *
   * @param envs - An array of objects representing the environment variables to be encrypted.
   * @param publicKeyHex - The hexadecimal representation of the recipient's public key used for encryption.
   * @return A promise that resolves to the encrypted hexadecimal string of the input environment variables.
   */
  static async encryptEnvVariables(
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

interface IImage {
  name: string;
  is_dev: boolean;
  version: number[];
}

interface INode {
  name: string;
  teepod_id: number;
  support_onchain_kms: boolean;
  images: IImage[];
}

interface ITeePods {
  name: string;
  nodes: INode[];
}
