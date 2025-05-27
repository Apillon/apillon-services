import { AppEnvironment, env, splitArray } from '@apillon/lib';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { hexToU8a } from '@polkadot/util';
import { encodeAddress } from '@polkadot/util-crypto';
import { ethers } from 'ethers';
import { EvmContractEventsWorker } from './evm-contract-events-worker';

/**
 * Oasis smart contract indexer - extends basic worker for querying events in contract.
 * processEvents function parses received events, extracts data from it and sends the data (dataHash) to AUTH MS sqs
 */
export class OasisContractEventsWorker extends EvmContractEventsWorker {
  eventFilter = 'GaslessTransaction';

  public async processEvents(events: ethers.Event[]) {
    console.info('Events recieved in OasisContractEventsWorker', events);

    // Parse data from events and send webhook to Authentication MS worker
    const txTopics: any = await Promise.all(
      events.map(async (event) => {
        const receipt = await event.getTransactionReceipt();
        const log = receipt.logs[0];
        let publicAddress = log.topics.at(-1);

        // Check if it's a full 32-byte hex string (66 chars including 0x)
        if (publicAddress.length === 66) {
          // Check if it's 0-padded (starts with 0x0000...)
          if (publicAddress.startsWith('0x0000')) {
            publicAddress = `0x${publicAddress.slice(-40)}`; // Extract the last 40 characters for the EVM address
          } else {
            // Convert full public key to substrate address
            const ss58Prefix = 0; // Unified format
            publicAddress = encodeAddress(hexToU8a(publicAddress), ss58Prefix);
          }
        }

        return {
          dataHash: event.args[0],
          contractAddress: log.address, // address which emitted WalletCreated event is the contract address of the account
          publicAddress,
        };
      }),
    );

    if (txTopics.length === 0) {
      console.info('No events to process in OasisContractEventsWorker');
      return;
    }

    if (
      env.APP_ENV === AppEnvironment.LOCAL_DEV ||
      env.APP_ENV === AppEnvironment.TEST
    ) {
      return;
    }

    for (const chunk of splitArray(txTopics, 20)) {
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
