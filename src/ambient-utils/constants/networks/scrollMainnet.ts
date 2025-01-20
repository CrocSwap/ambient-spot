import { bigIntToFloat } from '@crocswap-libs/sdk';
import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { Provider } from 'ethers';
import { NetworkIF } from '../../types/NetworkIF';
import {
    scrollETH,
    scrollSCR,
    scrollUSDC,
    scrollUSDT,
    scrollWBTC,
} from '../defaultTokens';
import { GCGO_SCROLL_URL } from '../gcgo';
import { TopPool } from './TopPool';

const PUBLIC_RPC_URL = 'https://scroll-rpc.publicnode.com';
const SECONDARY_PUBLIC_RPC_URL = 'https://rpc.scroll.io';

const RESTRICTED_RPC_URL =
    import.meta.env.VITE_SCROLL_RPC_URL !== undefined
        ? import.meta.env.VITE_SCROLL_RPC_URL
        : undefined;

const PRIMARY_RPC_URL = RESTRICTED_RPC_URL
    ? RESTRICTED_RPC_URL
    : PUBLIC_RPC_URL;

const FALLBACK_RPC_URL =
    PRIMARY_RPC_URL === PUBLIC_RPC_URL
        ? SECONDARY_PUBLIC_RPC_URL
        : PUBLIC_RPC_URL;

const chainIdHex = '0x82750';
const chainSpecFromSDK = lookupChain(chainIdHex);

const chainSpecForWalletConnector = {
    chainId: Number(chainIdHex),
    name: 'Scroll',
    currency: 'ETH',
    rpcUrl: PUBLIC_RPC_URL,
    explorerUrl: 'https://scrollscan.com/',
};

export const scrollMainnet: NetworkIF = {
    chainId: chainIdHex,
    chainSpec: chainSpecFromSDK,
    GCGO_URL: GCGO_SCROLL_URL,
    evmRpcUrl: PRIMARY_RPC_URL,
    fallbackRpcUrl: FALLBACK_RPC_URL,
    chainSpecForWalletConnector: chainSpecForWalletConnector,
    defaultPair: [scrollETH, scrollUSDC],
    poolIndex: chainSpecFromSDK.poolIndex,
    gridSize: chainSpecFromSDK.gridSize,
    blockExplorer: chainSpecForWalletConnector.explorerUrl,
    displayName: 'Scroll',
    tokenPriceQueryAssetPlatform: 'scroll',
    vaultsEnabled: true,
    tempestApiNetworkName: 'scroll',
    topPools: [
        new TopPool(scrollETH, scrollUSDC, chainSpecFromSDK.poolIndex),
        new TopPool(scrollUSDT, scrollUSDC, chainSpecFromSDK.poolIndex),
        new TopPool(scrollSCR, scrollETH, chainSpecFromSDK.poolIndex),
        new TopPool(scrollETH, scrollUSDT, chainSpecFromSDK.poolIndex),
        new TopPool(scrollETH, scrollWBTC, chainSpecFromSDK.poolIndex),
    ],
    getGasPriceInGwei: async (provider?: Provider) => {
        if (!provider) return 0;
        return (
            bigIntToFloat((await provider.getFeeData()).gasPrice || BigInt(0)) *
            1e-9
        );
    },
};
