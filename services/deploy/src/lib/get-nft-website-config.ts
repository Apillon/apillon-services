import { NftWebsiteType } from '@apillon/lib';
import { DeployCodeException } from './exceptions';
import { DeployErrorCode } from '../config/types';

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
  const hexChainId = `0x${chainId.toString(16).padStart(3, '0')}`;
  switch (type) {
    case NftWebsiteType.PLAIN_JS:
      return {
        installCommand: './generate-config.sh',
        buildCommand: './build.sh',
        buildDirectory: './dist',
        url: 'https://github.com/Apillon/nft-template.git',
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
        url: 'https://github.com/Apillon/nft-template-react.git',
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
        url: 'https://github.com/Apillon/nft-template-vue.git',
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
      throw new DeployCodeException({
        status: 400,
        code: DeployErrorCode.INVALID_NFT_WEBSITE_TYPE,
      });
  }
};
