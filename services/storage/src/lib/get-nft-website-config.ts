import { NftWebsiteType } from '@apillon/lib';
import { StorageCodeException } from './exceptions';
import { StorageErrorCode } from '../config/types';

export const getNftWebsiteConfig = (
  type: NftWebsiteType,
  contractAddress: string,
  chainId: number,
): {
  variables: {
    key: string;
    value: string;
  }[];
  installCommand?: string;
  buildCommand?: string;
  buildDirectory: string;
  url: string;
} => {
  const hexChainId = chainId.toString(16);
  switch (type) {
    case NftWebsiteType.JS:
      return {
        installCommand: './generate-config.sh',
        buildDirectory: '.',
        url: 'git@github.com:Apillon/nft-template.git',
        variables: [
          {
            key: 'CONTRACT_ADDRESS',
            value: contractAddress,
          },
          {
            key: 'CHAIN_ID',
            value: hexChainId,
          },
        ],
      };
    case NftWebsiteType.REACT:
      return {
        installCommand: 'npm install',
        buildCommand: 'npm run build',
        buildDirectory: './dist',
        url: 'git@github.com:Apillon/nft-template-react.git',
        variables: [
          {
            key: 'VITE_CONTRACT_ADDRESS',
            value: contractAddress,
          },
          {
            key: 'VITE_CHAIN_ID',
            value: hexChainId,
          },
        ],
      };
    case NftWebsiteType.VUE:
      return {
        installCommand: 'npm install',
        buildCommand: 'npm run generate',
        buildDirectory: './dist',
        url: 'git@github.com:Apillon/nft-template-vue.git',
        variables: [
          {
            key: 'CONTRACT_ADDRESS',
            value: contractAddress,
          },
          {
            key: 'CHAIN_ID',
            value: hexChainId,
          },
        ],
      };
    default:
      throw new StorageCodeException({
        status: 400,
        code: StorageErrorCode.INVALID_NFT_WEBSITE_TYPE,
      });
  }
};
