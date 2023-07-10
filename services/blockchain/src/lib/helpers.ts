import { EvmChain } from '@apillon/lib';
import { WorkerName } from '../workers/worker-executor';

export function evmChainToJob(chain: EvmChain, worker: WorkerName): number {
  switch (chain) {
    case EvmChain.MOONBEAM: {
      return worker == WorkerName.TRANSMIT_EVM_TRANSACTION ? 6 : 7;
    }
    case EvmChain.MOONBASE: {
      return worker == WorkerName.TRANSMIT_EVM_TRANSACTION ? 3 : 4;
    }
    case EvmChain.ASTAR: {
      return worker == WorkerName.TRANSMIT_EVM_TRANSACTION ? 8 : 9;
    }
    default: {
      throw new Error('Unsupported');
    }
  }
}
