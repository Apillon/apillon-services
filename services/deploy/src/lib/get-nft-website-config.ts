import { NftWebsiteType } from '@apillon/lib';
import { DeployCodeException } from './exceptions';
import { DeployErrorCode } from '../config/types';

export const getNftWebsiteConfig = (
  type: NftWebsiteType,
  contractAddress: string,
  chainId: number,
  logoUrl?: string,
  bannerUrl?: string,
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
        installCommand: 'npm install',
        buildCommand: 'npm run build',
        buildDirectory: './dist',
        url: 'https://github.com/Apillon/nft-template.git',
        variables: [
          {
            key: 'VITE_CONTRACT_ADDRESS',
            value: contractAddress,
          },
          {
            key: 'VITE_CHAIN_ID',
            value: hexChainId,
          },
          {
            key: 'VITE_IMG_LOGO',
            value: logoUrl,
          },
          {
            key: 'VITE_IMG_BANNER',
            value: bannerUrl,
          },
        ].filter((v) => v.value !== undefined && v.value !== null),
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

          {
            key: 'VITE_IMG_LOGO',
            value: logoUrl,
          },
          {
            key: 'VITE_IMG_BANNER',
            value: bannerUrl,
          },
        ].filter((v) => v.value !== undefined && v.value !== null),
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

          {
            key: 'IMG_LOGO',
            value: logoUrl,
          },
          {
            key: 'IMG_BANNER',
            value: bannerUrl,
          },
        ].filter((v) => v.value !== undefined && v.value !== null),
      };
    default:
      throw new DeployCodeException({
        status: 400,
        code: DeployErrorCode.INVALID_NFT_WEBSITE_TYPE,
      });
  }
};
