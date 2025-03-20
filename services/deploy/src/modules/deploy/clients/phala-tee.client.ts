import {
  ICreateVMRequest,
  ICreateVMResponse,
  IVMAttestationResponse,
  IVMStats,
  VMDetailsResponse,
} from '../types';
import { IVMResourceRequest } from '@apillon/lib';
import axios, { AxiosInstance } from 'axios';

/**
 * PhalaDockerClient is a client that interacts with the Phala CVM (Confidential
 * Virtual Machine) API to manage virtual machines and handle encryption of
 * environment variables. It facilitates communication with the API using
 * preconfigured credentials and endpoints.
 */
export class PhalaDockerClient {
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
  async getAvailablePods(): Promise<any> {
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
}
