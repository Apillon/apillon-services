import { ofetch } from 'ofetch';
import {
  ICreateVMRequest,
  ICreateVMResponse,
  IVMAttestationResponse,
  IVMStats,
  VMDetailsResponse,
} from '../types';
import { IVMResourceRequest } from '@apillon/lib';

/**
 * PhalaDockerClient is a client that interacts with the Phala CVM (Confidential
 * Virtual Machine) API to manage virtual machines and handle encryption of
 * environment variables. It facilitates communication with the API using
 * preconfigured credentials and endpoints.
 */
export class PhalaDockerClient {
  private readonly request: ReturnType<typeof ofetch.create>;

  constructor(
    private baseURL: string,
    private apiKey: string,
  ) {
    this.request = ofetch.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
    });
  }

  /**
   * Fetches the list of available pods from the server.
   *
   * @return A promise that resolves with the response containing the available pods information.
   */
  async getAvailablePods(): Promise<any> {
    return this.request('/teepods/available', {
      method: 'GET',
    });
  }

  /**
   * Get the public key required for secret encryption.
   */
  async getPublicKey(body: Record<string, any>): Promise<any> {
    return this.request('/cvms/pubkey/from_cvm_configuration', {
      method: 'POST',
      body,
    });
  }

  /**
   * Create a virtual machine using the provided configuration.
   */
  async createCVM(vmConfig: ICreateVMRequest): Promise<ICreateVMResponse> {
    return this.request('/cvms/from_cvm_configuration', {
      method: 'POST',
      body: vmConfig,
    });
  }

  /**
   * Get detailed information about a virtual machine by its ID.
   */
  async getCVMDetails(identifier: string): Promise<VMDetailsResponse> {
    return this.request(`/cvms/app_${identifier}`, {
      method: 'GET',
    });
  }

  /**
   * Start a stopped virtual machine.
   */
  async startCVM(identifier: string): Promise<ICreateVMResponse> {
    return this.request(`/cvms/app_${identifier}/start`, {
      method: 'POST',
    });
  }

  /**
   * Shut down an active virtual machine.
   */
  async shutdownCVM(identifier: string): Promise<ICreateVMResponse> {
    return this.request(`/cvms/app_${identifier}/shutdown`, {
      method: 'POST',
    });
  }

  /**
   * Stop a running virtual machine.
   */
  async stopCVM(identifier: string): Promise<ICreateVMResponse> {
    return this.request(`/cvms/app_${identifier}/stop`, {
      method: 'POST',
    });
  }

  /**
   * Restart a running virtual machine.
   */
  async restartCVM(identifier: string): Promise<ICreateVMResponse> {
    return this.request(`/cvms/app_${identifier}/restart`, {
      method: 'POST',
    });
  }

  /**
   * Destroy a virtual machine.
   */
  async destroyCVM(identifier: string): Promise<void> {
    await this.request(`/cvms/app_${identifier}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get metrics or statistics of a virtual machine by its ID.
   */
  async getCVMStats(identifier: string): Promise<IVMStats> {
    return this.request(`/cvms/app_${identifier}/stats`, {
      method: 'GET',
    });
  }

  /**
   * Fetches the CVM attestation associated with the provided identifier.
   *
   * @param identifier - The unique identifier for the CVM application whose attestation is being requested.
   * @return A promise that resolves to the CVM attestation response.
   */
  async getCVMAttestation(identifier: string): Promise<IVMAttestationResponse> {
    return this.request(`/cvms/app_${identifier}/attestation`, {
      method: 'GET',
    });
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
    return await this.request(`/cvms/app_${identifier}/resources`, {
      method: 'PATCH',
      body: config,
    });
  }

  // async getInstanceBilling(identifier: string) {
  //   return await this.request(
  //     `/billing/billing_items/app_${identifier}/resources`,
  //     {
  //       method: 'GET',
  //     },
  //   );
  // }
}
