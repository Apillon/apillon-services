import { SubmittableExtrinsic } from '@polkadot/api-base/types';
import { blake2AsHex } from '@polkadot/util-crypto';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { iTimePoint } from '@apillon/lib';
import { AssetManagementCodeException } from '../../../lib/exceptions';
import { AssetManagementErrorCode } from '../../../config/types';

class MultisigTransactionClient {
  private api: ApiPromise;

  constructor(api: ApiPromise) {
    this.api = api;
  }

  async getOpenMultisigOperation(payerAddress: string, txCallHash: string) {
    const multisigTx = await this.api.query.multisig.multisigs(
      payerAddress,
      txCallHash,
    );
    if (!multisigTx.isSome) {
      return null;
    }

    const multisigTxData = multisigTx.unwrap();
    return {
      timePoint: {
        height: multisigTxData.when.height.toNumber(),
        index: multisigTxData.when.index.toNumber(),
      } as iTimePoint,
      deposit: multisigTxData.deposit.toString(),
      depositor: multisigTxData.depositor.toString(),
      approvals: multisigTxData.approvals.toJSON() as string[],
    };
  }

  getTransactionFromHex(rawTransaction: string) {
    return this.api.tx(rawTransaction);
  }

  async disconnect() {
    return await this.api.disconnect();
  }

  asMulti(
    threshold: number,
    signers: string[],
    timePoint: iTimePoint,
    txCallHash: string,
  ) {
    return this.api.tx.multisig.asMulti(
      threshold,
      signers,
      timePoint,
      txCallHash,
      { refTime: 70_000_000_000, proofSize: 1_000_000 },
    );
  }

  cancelAsMulti(
    threshold: number,
    signers: string[],
    timePoint: iTimePoint,
    txCallHash: string,
  ) {
    return this.api.tx.multisig.cancelAsMulti(
      threshold,
      signers,
      timePoint,
      txCallHash,
    );
  }
}

export class MultisigTransactionService {
  private static instance: MultisigTransactionService;
  private transaction: SubmittableExtrinsic<'promise'>;
  private client: MultisigTransactionClient;
  private readonly signers: string[];
  private readonly threshold: number;
  private readonly payer: string;

  private constructor(
    client: MultisigTransactionClient,
    signerAccount: string,
    allSigners: string[],
    threshold: number,
    rawTransaction: string,
    payer: string,
  ) {
    this.client = client;
    this.transaction = client.getTransactionFromHex(rawTransaction);
    this.threshold = threshold;
    this.signers = allSigners.filter(
      (signer: string) => signer !== signerAccount,
    );
    this.payer = payer;
  }

  static async getInstance(
    rpcEndpoint: string,
    signerAccount: string,
    allSigners: string[],
    threshold: number,
    rawTransaction: string,
    payer: string,
  ) {
    if (!MultisigTransactionService.instance) {
      const api = await ApiPromise.create({
        provider: new WsProvider(rpcEndpoint),
        throwOnConnect: true,
      });
      const client = new MultisigTransactionClient(api);
      MultisigTransactionService.instance = new MultisigTransactionService(
        client,
        signerAccount,
        allSigners,
        threshold,
        rawTransaction,
        payer,
      );
    }
    return MultisigTransactionService.instance;
  }

  async destroy() {
    if (MultisigTransactionService.instance) {
      await this.client.disconnect();
      MultisigTransactionService.instance = null;
    }
  }

  async prepareMultisigTx() {
    const txCallHex = this.transaction.method.toHex();
    const txCallHash = this.getCallHash(txCallHex);
    const multisigTxData = await this.getOpenSubstrateMultisigOperation(
      this.payer,
      txCallHash,
    );
    // ensure we are the first signer
    if (multisigTxData && multisigTxData.approvals.length > 0) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.MULTISIG_OPERATION_ALREADY_OPEN,
        status: 500,
        errorMessage: `Multisig operation already open for wallet ${this.payer}`,
      });
    }

    return this.client.asMulti(this.threshold, this.signers, null, txCallHex);
  }

  async getCancelOperationTx() {
    const txCallHex = this.transaction.method.toHex();
    const txCallHash = this.getCallHash(txCallHex);
    const multisigTxData = await this.getOpenSubstrateMultisigOperation(
      this.payer,
      txCallHash,
    );
    if (!multisigTxData) {
      throw new AssetManagementCodeException({
        code: AssetManagementErrorCode.MULTISIG_OPERATION_NOT_OPEN,
        status: 500,
        errorMessage: `Multisig operation not open for ${this.payer}`,
      });
    }

    return this.client.cancelAsMulti(
      this.threshold,
      this.signers,
      multisigTxData.timePoint,
      txCallHash,
    );
  }

  //#region private
  private async getOpenSubstrateMultisigOperation(
    payer: string,
    txCallHash: string,
  ) {
    const multisigTxData = await this.client.getOpenMultisigOperation(
      payer,
      txCallHash,
    );

    if (!multisigTxData) {
      return null;
    }

    return multisigTxData;
  }

  private getCallHash(txCallHex: string) {
    return blake2AsHex(txCallHex);
  }

  //#endregion
}
