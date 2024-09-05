import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { AcurastJob } from '../acurast/models/acurast-job.model';
import { LogType, safeJsonParse, writeLog } from '@apillon/lib';
import { EnvVarEncrypted } from '../acurast/acurast-encryption.service';

export class AcurastClient {
  private api: ApiPromise;
  private readonly rpcEndpoint: string;

  constructor(rpcEndpoint: string) {
    this.rpcEndpoint = rpcEndpoint;
  }

  /**
   * Function to initialize RPC provider. BCS is called to get endpoint, which is then used to initialize Provider
   * NOTE: This function should be called before each function in this class
   */
  async initializeProvider() {
    if (this.api) {
      return this.api;
    }
    this.api = await ApiPromise.create({
      provider: new WsProvider(this.rpcEndpoint),
      throwOnConnect: true,
    });

    console.info(`Acurast client initialization: ${this.rpcEndpoint}`);
  }

  async createDeployJobTransaction(
    job: AcurastJob,
  ): Promise<SubmittableExtrinsic<'promise'>> {
    await this.initializeProvider();

    // 4 minutes from now, cannot be at the same moment due to protocol limitations
    const startTime = Date.now() + 3 * 60_000;
    const endTime = job.endTime.getTime();

    const interval = endTime - startTime;
    return this.api.tx.acurast.register({
      script: `ipfs://${job.scriptCid}`,
      schedule: {
        startTime,
        endTime,
        interval,
        duration: interval - 1,
      },
      requiredModules: ['DataEncryption'],
      extra: {
        requirements: {
          slots: job.slots,
          reward: 10_000_000_000, // 0.01 cACU
        },
      },
    });
  }

  async createSetEnvironmentTransaction(
    job: AcurastJob,
    variables: EnvVarEncrypted[],
  ): Promise<SubmittableExtrinsic<'promise'>> {
    await this.initializeProvider();
    const codec = this.variablesToCodec(job.publicKey, variables);
    return this.api.tx.acurast.setEnvironment(job.jobId, job.account, codec);
  }

  async createDeregisterJobTransaction(
    localJobId: number,
  ): Promise<SubmittableExtrinsic<'promise'>> {
    await this.initializeProvider();
    return this.api.tx.acurast.deregister({ localJobId });
  }

  /**
   * Get a job's on-chain state
   * @param {string} deployerAddress - Deployer wallet address
   * @param {number} jobId - on-chain ID of the job
   */
  async getJobStatus(deployerAddress: string, jobId: number) {
    await this.initializeProvider();

    const jobStatus = await this.api.query.acurastMarketplace.storedJobStatus(
      { Acurast: deployerAddress },
      jobId,
    );

    writeLog(
      LogType.INFO,
      `[Acurast] storedJobStatus response for jobId ${jobId}: ${jobStatus.toString()}`,
    );

    return safeJsonParse(jobStatus.toString());
  }

  /**
   * Get a job's assigned processor address
   * @param {string} deployerAddress - Deployer wallet address
   * @param {number} jobId - on-chain ID of the job
   */
  async getAssignedProcessors(
    deployerAddress: string,
    jobId: number,
  ): Promise<string> {
    await this.initializeProvider();

    const { 0: processors } =
      await this.api.query.acurastMarketplace.assignedProcessors.entries([
        { Acurast: deployerAddress },
        jobId,
      ]);

    writeLog(
      LogType.INFO,
      `[Acurast] getAssignedProcessors response for jobId ${jobId}: ${processors.toString()}`,
    );

    return processors?.[0].args[1].toString();
  }

  /**
   * Get a job's matches
   * @param {string} deployerAddress - Deployer wallet address
   * @param {string} jobAccount - Acurast wallet address of the processor
   * @param {number} jobId - on-chain ID of the job
   */
  async getJobPublicKey(
    deployerAddress: string,
    jobAccount: string,
    jobId: number,
  ): Promise<string> {
    await this.initializeProvider();

    const storedMatches = await this.api.query.acurastMarketplace.storedMatches(
      jobAccount,
      [{ Acurast: deployerAddress }, jobId],
    );

    writeLog(
      LogType.INFO,
      `[Acurast] storedMatches response for jobId ${jobId}: ${storedMatches.toString()}`,
    );

    return JSON.parse(storedMatches.toString())?.pubKeys[0]?.secp256r1;
  }

  async destroy() {
    if (this.api.isConnected) {
      await this.api.disconnect();
      this.api = null;
    }
  }

  private variablesToCodec(publicKey: string, variables: EnvVarEncrypted[]) {
    return this.api.createType('AcurastCommonEnvironment', {
      publicKey: this.api.createType('Bytes', publicKey),
      variables: this.api.createType(
        'Vec<(Bytes, Bytes)>',
        variables.map((variable) => {
          const key = `0x${Buffer.from(variable.key).toString('hex')}`;
          const value = `0x${variable.encryptedValue.iv}${variable.encryptedValue.ciphertext}${variable.encryptedValue.authTag}`;
          return [key, value];
        }),
      ),
    });
  }
}
