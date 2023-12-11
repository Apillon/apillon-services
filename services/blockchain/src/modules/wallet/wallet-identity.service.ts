import { Lmas, LogType, ServiceName, WalletIdentityDto } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { SubsocialApi } from '@subsocial/api';

export class WalletIdentityService {
  /**
   * Retreive and return on-chain polkadot identity data from different sources
   * @param {{ query: WalletIdentityDto }} event
   * @param {ServiceContext} _context
   */
  static async getWalletIdentityData(
    event: { query: WalletIdentityDto },
    _context: ServiceContext,
  ) {
    const walletAddress = event.query.address;

    const subsocial = await WalletIdentityService.getSubsocialData(
      walletAddress,
    );
    const polkadot = await WalletIdentityService.getPolkadotIdentityData(
      walletAddress,
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
   */
  private static async getSubsocialData(walletAddress: string) {
    try {
      const api = await SubsocialApi.create({
        substrateNodeUrl: 'wss://para.f3joule.space',
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
   * @param {string} walletAddress
   */
  private static async getPolkadotIdentityData(walletAddress: string) {
    try {
      const provider = new WsProvider('wss://rpc.polkadot.io');
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
