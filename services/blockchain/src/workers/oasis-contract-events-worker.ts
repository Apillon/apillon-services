import { AppEnvironment, env, splitArray } from '@apillon/lib';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { EvmContractEventsWorker } from './evm-contract-events-worker';
import { ethers } from 'ethers';

/**
 * Oasis smart contract indexer - extends basic worker for querying events in contract.
 * processEvents function parses received events, extracts data from it and sends the data (dataHash) to AUTH MS sqs
 */
export class OasisContractEventsWorker extends EvmContractEventsWorker {
  eventFilter = 'GaslessTransaction';

  public async processEvents(events: ethers.Event[]) {
    console.info('Events recieved in OasisContractEventsWorker', events);
    //Parse data from events and send webhook to Authentication MS worker
    const txTopics: any = events.map((x) => ({
      dataHash: x.args[0],
      hashedUsername: x.args[1],
      publicAddress: x.args[2],
    }));

    const chunks = splitArray(txTopics, 20);

    for (const chunk of chunks) {
      if (
        env.APP_ENV != AppEnvironment.LOCAL_DEV &&
        env.APP_ENV != AppEnvironment.TEST
      ) {
        await sendToWorkerQueue(
          env.AUTH_AWS_WORKER_SQS_URL,
          'OasisContractEventWorker',
          [
            {
              data: chunk,
            },
          ],
          null,
          null,
        );
      }
    }
  }
}
