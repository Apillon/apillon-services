import { AppEnvironment, env, splitArray } from '@apillon/lib';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { EvmContractEventsWorker } from './evm-contract-events-worker';
import { ethers } from 'ethers';

/**
 * Claim smart contract indexer - extends basic worker for querying events in contract.
 * processEvents function parses received events, extracts data from it and sends the data (dataHash) to AUTH MS sqs
 */
export class ClaimContractEventsWorker extends EvmContractEventsWorker {
  eventFilter = 'Claim';

  public async processEvents(events: ethers.Event[]) {
    console.info('Events recieved in ClaimContractEventsWorker', events);
    // Parse data from events and send webhook to Authentication MS worker
    const dataHashes: string[] = events.map((x) => x.data);

    const chunks = splitArray(dataHashes, 20);

    for (const chunk of chunks) {
      if (
        env.APP_ENV != AppEnvironment.LOCAL_DEV &&
        env.APP_ENV != AppEnvironment.TEST
      ) {
        await sendToWorkerQueue(
          env.REFERRAL_AWS_WORKER_SQS_URL,
          'ClaimContractEventWorker',
          [{ data: chunk }],
          null,
        );
      }
    }
  }
}
