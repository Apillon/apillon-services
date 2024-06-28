import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { AcurastJob } from '../acurast/models/acurast-job.model';
import { LogType, safeJsonParse, writeLog } from '@apillon/lib';

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

    console.log(`Acurast client initialization: ${this.rpcEndpoint}`);
  }

  async createDeployJobTransaction(
    job: AcurastJob,
  ): Promise<SubmittableExtrinsic<'promise'>> {
    await this.initializeProvider();
    // Uncomment below for local testing
    // const addMinutes = (date: Date, seconds: number) => {
    //   const t = new Date(date);
    //   t.setMinutes(t.getMinutes() + seconds);
    //   return t;
    // };
    // const startTime = this.addMinutes(new Date(), 10).getTime();
    // const endTime = this.addMinutes(startTime, 60).getTime();
    const startTime = job.startTime.getTime();
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
    variables: [string, string][],
  ): Promise<SubmittableExtrinsic<'promise'>> {
    await this.initializeProvider();
    return this.api.tx.acurast.setEnvironment(job.jobId, job.account, {
      publicKey: job.publicKey,
      variables,
    });
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
}
