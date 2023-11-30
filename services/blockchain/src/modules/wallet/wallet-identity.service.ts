import { Lmas, LogType, ServiceName, WalletIdentityDto } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { signatureVerify } from '@polkadot/util-crypto';
import { SubsocialApi } from '@subsocial/api';
import '@polkadot/api-augment';
import '@polkadot/types-augment';
import { BlockchainCodeException } from '../../lib/exceptions';
import { BlockchainErrorCode } from '../../config/types';

export class WalletIdentityService {
  static async getWalletIdentityData(
    event: { body: WalletIdentityDto },
    _context: ServiceContext,
  ) {
    const { message, signature, walletAddress } = event.body;
    try {
      const { isValid } = signatureVerify(message, signature, walletAddress);

      if (!isValid) {
        throw new Error('Invalid wallet signature');
      }
    } catch (err) {
      throw new BlockchainCodeException({
        code: BlockchainErrorCode.INVALID_SIGNATURE,
        status: 400,
        errorMessage: `Error validating wallet signature: ${err.message}`,
      });
    }

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
