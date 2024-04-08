import { ContractVersion } from '@apillon/nfts/src/modules/nfts/models/contractVersion.model';
import { ServiceStage, Stage } from '../interfaces/stage.interface';
import { ChainType, Context, NFTCollectionType } from '@apillon/lib';
import { evmGenericNftAbi, evmNestableNftAbi } from './contracts/abi';
import {
  evmGenericNftBytecode,
  evmNestableNftBytecode,
} from './contracts/bytecode';

export async function insertEvmNftContractVersion(context: Context) {
  await new ContractVersion({}, context)
    .populate({
      collectionType: NFTCollectionType.GENERIC,
      chainType: ChainType.EVM,
      version: 1,
      abi: evmGenericNftAbi,
      bytecode: evmGenericNftBytecode,
    })
    .insert();

  await new ContractVersion({}, context)
    .populate({
      collectionType: NFTCollectionType.NESTABLE,
      chainType: ChainType.EVM,
      version: 1,
      abi: evmNestableNftAbi,
      bytecode: evmNestableNftBytecode,
    })
    .insert();
}
