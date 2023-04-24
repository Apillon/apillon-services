import { EvmChain, env } from '@apillon/lib';

export interface EvmRpcEndpoint {
  rpcUrl: string;
  name: string;
}

export const EvmRpcEndpoints: Map<EvmChain, EvmRpcEndpoint> = new Map([
  [
    EvmChain.MOONBEAM,
    { rpcUrl: env.NFTS_MOONBEAM_MAINNET_RPC, name: 'moonbeam' },
  ],
  [
    EvmChain.MOONBASE,
    { rpcUrl: env.NFTS_MOONBEAM_TESTNET_RPC, name: 'moonbase-alphanet' },
  ],
  [
    EvmChain.ASTAR_SHIBUYA,
    { rpcUrl: env.NFTS_ASTAR_TESTNET_RPC, name: 'Astar Shibuya' },
  ],
  [EvmChain.ASTAR, { rpcUrl: env.NFTS_ASTAR_MAINNET_RPC, name: 'Astar' }],
]);
