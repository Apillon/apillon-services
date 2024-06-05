import { AppEnvironment, env, splitArray } from '@apillon/lib';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { EvmContractEventsWorker } from './evm-contract-events-worker';
import { ethers } from 'ethers';

/**
 * Claim smart contract indexer - extends basic worker for querying events in contract.
 * processEvents function parses received events, extracts args from it and sends the data (wallet array) to Referral MS SQS
 */
export class ClaimContractEventsWorker extends EvmContractEventsWorker {
  eventFilter = 'Claim';

  public async processEvents(events: ethers.Event[]) {
    console.info('Events recieved in ClaimContractEventsWorker', events);

    // Parse wallets from events and send webhook to Referral MS worker
    const addressChunks = splitArray(
      events.map((x) => ({
        wallet: x.args[0] as string,
        transactionHash: x.transactionHash,
      })),
      20,
    );

    for (const chunk of addressChunks) {
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
