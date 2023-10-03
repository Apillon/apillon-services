import { EvmChain, SubstrateChain } from '@apillon/lib';
import { WorkerName } from '../workers/worker-executor';

export enum WorkerType {
  TRANSMIT = 1,
  PROCESS = 2,
}

export function evmChainToWorkerName(
  chain: EvmChain,
  type: WorkerType,
): string {
  switch (chain) {
    case EvmChain.MOONBEAM: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_MOONBEAM_TRANSACTION
        : WorkerName.MOONBEAM_TRANSACTIONS;
    }
    case EvmChain.MOONBASE: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_MOONBASE_TRANSACTION
        : WorkerName.MOONBASE_TRANSACTIONS;
    }
    case EvmChain.ASTAR: {
      return type == WorkerType.TRANSMIT
        ? WorkerName.TRANSMIT_ASTAR_TRANSACTION
        : WorkerName.ASTAR_TRANSACTIONS;
    }
    default: {
      throw new Error('Unsupported');
    }
  }
}

export function substrateChainToWorkerName(chain: SubstrateChain): string {
  switch (chain) {
    case SubstrateChain.CRUST: {
      return WorkerName.TRANSMIT_CRUST_TRANSACTION;
    }
    case SubstrateChain.KILT: {
      return WorkerName.TRANSMIT_KILT_TRANSACTION;
    }
    default: {
      throw new Error('Unsupported');
    }
  }
}
