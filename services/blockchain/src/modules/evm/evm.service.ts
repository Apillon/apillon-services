import { EvmChain, ChainType } from '@apillon/lib';
import { Endpoint } from '../../common/models/endpoint';
import { ServiceContext } from '../../context';
import { ethers } from 'ethers';
import { BlockchainCodeException } from '../../lib/exceptions';
import { BlockchainErrorCode } from '../../config/types';

export class EvmService {
  static async signTransaction(
    _event: {
      chain: EvmChain;
      fromAddress?: string;
      toAddress?: string;
      transaction: string;
      referenceTable?: string;
      referenceId?: string;
    },
    context: ServiceContext,
  ) {
    // connect to chain
    // TODO: Add logic if endpoint is unavailable to fetch the backup one.
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
      ChainType.EVM,
    );

    if (!endpoint.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_CHAIN,
        status: 400,
      });
    }

    // eslint-disable-next-line sonarjs/no-small-switch
    switch (_event.chain) {
      case EvmChain.MOONBEAM: {
        // moonbeam specific settings
        break;
      }
      default: {
        throw new BlockchainCodeException({
          code: BlockchainErrorCode.INVALID_CHAIN,
          status: 400,
        });
      }
    }

    const provider = new ethers.providers.JsonRpcProvider(endpoint.url);
  }
  //#region
}
