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

    if (
      env.APP_ENV != AppEnvironment.LOCAL_DEV &&
      env.APP_ENV != AppEnvironment.TEST
    ) {
      return;
    }

    // Parse data from events and send webhook to Authentication MS worker
    const txTopics: any = await Promise.all(
      events.map(async (event) => {
        const receipt = await event.getTransactionReceipt();
        const log = receipt.logs[0];
        let publicAddress = log.topics.at(-1);

        // Check if it's a full 32-byte hex string
        if (publicAddress.length === 66) {
          publicAddress = `0x${publicAddress.slice(-40)}`; // Extract the last 40 characters for the EVM address
        }

        return {
          dataHash: event.args[0],
          contractAddress: event.args[1],
          publicAddress,
        };
      }),
    );

    if (txTopics.length === 0) {
      return;
    }

    const chunks = splitArray(txTopics, 20);

    for (const chunk of chunks) {
      await sendToWorkerQueue(
        env.AUTH_AWS_WORKER_SQS_URL,
        'OasisContractEventWorker',
        [{ data: chunk }],
        null,
        null,
      );
    }
  }
}
