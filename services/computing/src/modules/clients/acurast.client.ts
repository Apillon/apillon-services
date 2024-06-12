import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { AcurastJob } from '../acurast/models/acurast-job.model';

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

  addMinutes(date: string | number | Date, seconds: number) {
    const t = new Date(date);
    t.setMinutes(t.getMinutes() + seconds);
    return t;
  }

  async createDeployJobTransaction(
    job: AcurastJob,
  ): Promise<SubmittableExtrinsic<'promise'>> {
    await this.initializeProvider();
    const startTime = this.addMinutes(new Date(), 10).getTime();
    const endTime = this.addMinutes(startTime, 60).getTime();

    // let { startTime, endTime } = job;
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

  async destroy() {
    if (this.api.isConnected) {
      await this.api.disconnect();
      this.api = null;
    }
  }
}
