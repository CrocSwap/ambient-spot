import { bigIntToFloat } from '@crocswap-libs/sdk';
import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { Provider } from 'ethers';
import { NetworkIF } from '../../types/NetworkIF';
import {
    swellENA,
    swellETH,
    swellEZETH,
    swellRSWETH,
    swellSWELL,
    swellUSDE,
    swellWEETH,
} from '../defaultTokens';
import { GCGO_SWELL_URL } from '../gcgo';
import { TopPool } from './TopPool';

const PUBLIC_RPC_URL = 'https://swell-mainnet.alt.technology';
const SECONDARY_PUBLIC_RPC_URL = 'https://rpc.ankr.com/swell';

const RESTRICTED_RPC_URL =
    import.meta.env.VITE_SWELL_RPC_URL !== undefined
        ? import.meta.env.VITE_SWELL_RPC_URL
        : undefined;

const PRIMARY_RPC_URL = RESTRICTED_RPC_URL
    ? RESTRICTED_RPC_URL
    : PUBLIC_RPC_URL;

const FALLBACK_RPC_URL =
    PRIMARY_RPC_URL === PUBLIC_RPC_URL
        ? SECONDARY_PUBLIC_RPC_URL
        : PUBLIC_RPC_URL;

const chainIdHex = '0x783';
const chainSpecFromSDK = lookupChain(chainIdHex);

const chainSpecForWalletConnector = {
    chainId: Number(chainIdHex),
    name: 'Swellchain',
    currency: 'ETH',
    rpcUrl: PUBLIC_RPC_URL,
    explorerUrl: 'https://explorer.swellnetwork.io/',
};

export const swellMainnet: NetworkIF = {
    chainId: chainIdHex,
    chainSpec: chainSpecFromSDK,
    GCGO_URL: GCGO_SWELL_URL,
    evmRpcUrl: PRIMARY_RPC_URL,
    fallbackRpcUrl: FALLBACK_RPC_URL,
    chainSpecForWalletConnector: chainSpecForWalletConnector,
    defaultPair: [swellETH, swellUSDE],
    defaultPairFuta: [swellETH, swellUSDE],
    poolIndex: chainSpecFromSDK.poolIndex,
    gridSize: chainSpecFromSDK.gridSize,
    blockExplorer: chainSpecForWalletConnector.explorerUrl,
    displayName: 'Swell',
    tokenPriceQueryAssetPlatform: 'swell',
    vaultsEnabled: true,
    tempestApiNetworkName: 'swell',
    topPools: [
        new TopPool(swellETH, swellUSDE, chainSpecFromSDK.poolIndex),
        new TopPool(swellENA, swellUSDE, chainSpecFromSDK.poolIndex),
        new TopPool(swellWEETH, swellRSWETH, chainSpecFromSDK.poolIndex),
        new TopPool(swellETH, swellSWELL, chainSpecFromSDK.poolIndex),
        new TopPool(swellEZETH, swellETH, chainSpecFromSDK.poolIndex),
    ],
    getGasPriceInGwei: async (provider?: Provider) => {
        if (!provider) return 0;
        return (
            bigIntToFloat((await provider.getFeeData()).gasPrice || BigInt(0)) *
            1e-9
        );
    },
};
