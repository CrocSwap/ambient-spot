import { bigIntToFloat } from '@crocswap-libs/sdk';
import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { Provider } from 'ethers';
import { NetworkIF } from '../../types/NetworkIF';
import {
    plumeNativeETH,
    plumeNRWA,
    plumePETH,
    plumePUSD,
    plumeUSDC,
} from '../defaultTokens';
import { GCGO_PLUME_URL } from '../gcgo';
import { TopPool } from './TopPool';

const PUBLIC_RPC_URL = 'https://phoenix-rpc.plumenetwork.xyz';
const SECONDARY_PUBLIC_RPC_URL = 'https://phoenix-rpc.plumenetwork.xyz';

const RESTRICTED_RPC_URL =
    import.meta.env.VITE_PLUME_RPC_URL !== undefined
        ? import.meta.env.VITE_PLUME_RPC_URL
        : undefined;

const PRIMARY_RPC_URL = RESTRICTED_RPC_URL
    ? RESTRICTED_RPC_URL
    : PUBLIC_RPC_URL;

const FALLBACK_RPC_URL =
    PRIMARY_RPC_URL === PUBLIC_RPC_URL
        ? SECONDARY_PUBLIC_RPC_URL
        : PUBLIC_RPC_URL;

const chainIdHex = '0x18231';
const chainSpecFromSDK = lookupChain(chainIdHex);

const chainSpecForWalletConnector = {
    chainId: Number(chainIdHex),
    name: 'Plume Mainnet',
    currency: 'ETH',
    rpcUrl: PUBLIC_RPC_URL,
    explorerUrl: 'https://phoenix-explorer.plumenetwork.xyz/',
};

export const plumeMainnet: NetworkIF = {
    chainId: chainIdHex,
    chainSpec: chainSpecFromSDK,
    GCGO_URL: GCGO_PLUME_URL,
    evmRpcUrl: PRIMARY_RPC_URL,
    fallbackRpcUrl: FALLBACK_RPC_URL,
    chainSpecForWalletConnector: chainSpecForWalletConnector,
    defaultPair: [plumePETH, plumePUSD],
    defaultPairFuta: [plumePETH, plumePUSD],
    poolIndex: chainSpecFromSDK.poolIndex,
    gridSize: chainSpecFromSDK.gridSize,
    blockExplorer: chainSpecForWalletConnector.explorerUrl,
    displayName: 'Plume',
    tokenPriceQueryAssetPlatform: 'plume',
    vaultsEnabled: false,
    tempestApiNetworkName: '',
    topPools: [
        new TopPool(plumeNativeETH, plumeUSDC, chainSpecFromSDK.poolIndex),
        new TopPool(plumePUSD, plumeUSDC, chainSpecFromSDK.poolIndex),
        new TopPool(plumePETH, plumeUSDC, chainSpecFromSDK.poolIndex),
        new TopPool(plumePETH, plumePUSD, chainSpecFromSDK.poolIndex),
        new TopPool(plumeNRWA, plumePUSD, chainSpecFromSDK.poolIndex),
    ],
    getGasPriceInGwei: async (provider?: Provider) => {
        if (!provider) return 0;
        return (
            bigIntToFloat((await provider.getFeeData()).gasPrice || BigInt(0)) *
            1e-9
        );
    },
};
