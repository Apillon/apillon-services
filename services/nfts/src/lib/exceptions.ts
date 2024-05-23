import { Model } from '@rawmodel/core';
import {
  CodeException,
  ErrorOptions,
  ServiceName,
  ModelValidationException,
} from '@apillon/lib';
import { NftsErrorCode } from '../config/types';
import { ServiceContext } from '@apillon/service-lib';

export class NftsCodeException extends CodeException {
  constructor(options: ErrorOptions) {
    super({
      sourceModule: ServiceName.NFTS,
      errorCodes: NftsErrorCode,
      errorMessage: options.errorMessage || NftsErrorCode[options.code],
      ...options,
    });
  }
}

export class NftsValidationException extends ModelValidationException {
  constructor(model: Model) {
    super(model, NftsErrorCode);
  }
}

export class NftsNotFoundException extends NftsCodeException {
  constructor(
    code: NftsErrorCode = NftsErrorCode.NFT_COLLECTION_DOES_NOT_EXIST,
  ) {
    super({ code, status: 404 });
  }
}

export class NftsContractException extends NftsCodeException {
  constructor(code: NftsErrorCode, context: ServiceContext, details: Error) {
    const codeToErrorMap: Record<
      number,
      Pick<ErrorOptions, 'errorMessage' | 'sourceFunction'>
    > = {
      [NftsErrorCode.DEPLOY_NFT_CONTRACT_ERROR]: {
        sourceFunction: 'deployNftContract()',
        errorMessage: 'Error deploying Nft contract',
      },
      [NftsErrorCode.TRANSFER_NFT_CONTRACT_ERROR]: {
        sourceFunction: 'transferNftOwnership()',
        errorMessage: 'Error transfering Nft contract',
      },
      [NftsErrorCode.SET_NFT_BASE_URI_ERROR]: {
        sourceFunction: 'setNftCollectionBaseUri()',
        errorMessage: 'Error setting NFT collection base uri',
      },
      [NftsErrorCode.MINT_NFT_ERROR]: {
        sourceFunction: 'mintNftTo()',
        errorMessage: 'Error minting NFT',
      },
      [NftsErrorCode.NEST_MINT_NFT_ERROR]: {
        sourceFunction: 'nestMintNftTo()',
        errorMessage: 'Error nest minting NFT',
      },
      [NftsErrorCode.BURN_NFT_ERROR]: {
        sourceFunction: 'burnNftToken()',
        errorMessage: 'Error burning NFT',
      },
      [NftsErrorCode.CREATE_BUCKET_FOR_NFT_METADATA_ERROR]: {
        sourceFunction: 'deployNftContract()',
        errorMessage: 'Error creating bucket',
      },
    };

    super({
      status: 500,
      sourceModule: ServiceName.NFTS,
      errorCodes: NftsErrorCode,
      code,
      context,
      details,
      ...codeToErrorMap[code],
    });
  }
}
