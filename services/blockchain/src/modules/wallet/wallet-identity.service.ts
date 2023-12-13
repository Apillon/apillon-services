import {
  ChainType,
  Lmas,
  LogType,
  ServiceName,
  SubstrateChain,
  WalletIdentityDto,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubsocialApi } from '@subsocial/api';
import { Endpoint } from '../../common/models/endpoint';

export class WalletIdentityService {
  /**
   * Retreive and return on-chain polkadot identity data from different sources
   * @param {{ query: WalletIdentityDto }} event
   * @param {ServiceContext} context
   */
  static async getWalletIdentityData(
    event: { query: WalletIdentityDto },
    context: ServiceContext,
  ) {
    const walletAddress = event.query.address;

    const subsocial = await WalletIdentityService.getSubsocialData(
      walletAddress,
      context,
    );

    const polkadot = await WalletIdentityService.getPolkadotIdentityData(
      walletAddress,
      context,
    );

    return {
      subsocial,
      polkadot,
      // litentry: null, // TODO
    };
  }

  /**
   * Query subsocial's API to retreive profile data for a wallet address
   * @param {string} walletAddress
   * @param {ServiceContext} context
   */
  private static async getSubsocialData(
    walletAddress: string,
    context: ServiceContext,
  ) {
    try {
      const subsocialEndpoint = await new Endpoint({}, context).populateByChain(
        SubstrateChain.SUBSOCIAL,
        ChainType.SUBSTRATE,
      );
      const api = await SubsocialApi.create({
        substrateNodeUrl: subsocialEndpoint.url,
        ipfsNodeUrl: 'https://ipfs.subsocial.network',
      });
      return (await api.findProfileSpace(walletAddress)) || null;
    } catch (err) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `Error fetching subsocial data for ${walletAddress}`,
        location: 'WalletIdentityService/getSubsocialData',
        service: ServiceName.BLOCKCHAIN,
        data: {
          walletAddress,
          error: err,
        },
      });
      return null;
    }
  }

  /**
   * Query polkadot's on-chain identity data for a wallet address
   * @param {ServiceContext} context
   * @param {string} walletAddress
   */
  private static async getPolkadotIdentityData(
    walletAddress: string,
    context: ServiceContext,
  ) {
    try {
      const polkadotEndpoint = await new Endpoint({}, context).populateByChain(
        SubstrateChain.POLKADOT,
        ChainType.SUBSTRATE,
      );
      const provider = new WsProvider(polkadotEndpoint.url);
      const api = await ApiPromise.create({ provider });
      const identity = (
        await api.query.identity.identityOf(walletAddress)
      ).toHuman();

      return identity?.['info'] || identity || null;
    } catch (err) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: `Error fetching polkadot identity data for ${walletAddress}`,
        location: 'WalletIdentityService/getPolkadotIdentityData',
        service: ServiceName.BLOCKCHAIN,
        data: {
          walletAddress,
          error: err,
        },
      });
      return null;
    }
  }
}
