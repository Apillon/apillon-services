import { ContractVersion } from '@apillon/nfts/src/modules/nfts/models/contractVersion.model';
import { ChainType, Context, NFTCollectionType } from '@apillon/lib';

export async function insertNftContractVersion(
  context: Context,
  chainType: ChainType,
  collectionType: NFTCollectionType,
  abi: any,
  bytecode: string = null,
) {
  await new ContractVersion({}, context)
    .populate({
      collectionType,
      chainType,
      version: 1,
      abi,
      bytecode,
    })
    .insert();
}
