import { AppEnvironment, env, splitArray } from '@apillon/lib';
import { sendToWorkerQueue } from '@apillon/workers-lib';
import { EvmContractEventsWorker } from './evm-contract-events-worker';

/**
 * Worker parses received events, extracts data from it and sends the data (dataHash) to AUTH MS sqs
 */
export class OasisContractEventsWorker extends EvmContractEventsWorker {
  eventFilter = 'GaslessTransaction';

  public async processEvents(events: any) {
    console.info('Events recieved in OasisContractEventsWorker', events);
    //Parse data from events and send webhook to Authentication MS worker
    const dataHashes: string[] = events.map((x) => x.data);

    const chunks = splitArray(dataHashes, 20);

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
