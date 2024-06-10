import {
  ChainType,
  EvmChain,
  SubscriptionPackage,
} from '../../../../config/types';
import { Context } from '../../../context';
import { Scs } from '../../config/scs';
import { Chain } from '../../blockchain/utils';

/**
 * Only projects with specific plan can crate Ethereum and Sepolia NFTs
 *
 * @param context
 * @param chainType
 * @param chain
 * @param project_uuid
 */
export async function isAllowedToCreateNftCollection(
  context: Context,
  chainType: ChainType,
  chain: Chain,
  project_uuid: string,
) {
  if (chainType !== ChainType.EVM) {
    return true;
  }
  if (![EvmChain.ETHEREUM, EvmChain.SEPOLIA].includes(chain as EvmChain)) {
    return true;
  }

  const { data } = await new Scs(context).getProjectActiveSubscription(
    project_uuid,
  );

  return data.package_id && data.package_id === SubscriptionPackage.BUTTERFLY;
}
