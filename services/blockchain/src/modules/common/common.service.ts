import { ChainType } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { Endpoint } from '../../common/models/endpoint';
import { BlockchainErrorCode, Chain } from '../../config/types';
import { BlockchainCodeException } from '../../lib/exceptions';

export class CommonService {
  static async getChainEndpoint(
    _event: {
      chain: Chain;
      chainType: ChainType;
    },
    context: ServiceContext,
  ): Promise<{ url: string }> {
    const endpoint = await new Endpoint({}, context).populateByChain(
      _event.chain,
      _event.chainType,
    );

    if (!endpoint.exists()) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_CHAIN,
        status: 400,
      });
    }

    return { url: endpoint.url };
  }
}
