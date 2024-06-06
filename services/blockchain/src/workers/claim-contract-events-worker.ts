import { LogType, ReferralMicroservice, ServiceName } from '@apillon/lib';
import { EvmContractEventsWorker } from './evm-contract-events-worker';
import { ethers } from 'ethers';
import { LogOutput } from '@apillon/workers-lib';

/**
 * Claim smart contract indexer - extends basic worker for querying events in contract.
 * processEvents function parses received events, extracts args from it and sends the data (wallet array) to Referral MS
 */
export class ClaimContractEventsWorker extends EvmContractEventsWorker {
  eventFilter = 'Claim';

  public async processEvents(events: ethers.Event[]) {
    const data = events.map((event) => ({
      wallet: event.args[0] as string,
      transactionHash: event.transactionHash,
    }));

    await this.writeEventLog(
      {
        logType: LogType.INFO,
        message: `RUN EXECUTOR (ClaimContractEventsWorker). data: ${JSON.stringify(data)}`,
        service: ServiceName.BLOCKCHAIN,
      },
      LogOutput.DEBUG,
    );

    // Send wallets and tx hashes from events to Referral MS
    await new ReferralMicroservice(this.context).setClaimsCompleted(data);
  }
}
