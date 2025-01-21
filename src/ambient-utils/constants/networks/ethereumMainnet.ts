import { bigIntToFloat } from '@crocswap-libs/sdk';
import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { Provider } from 'ethers';
import { NetworkIF } from '../../types/NetworkIF';
import {
    mainnetETH,
    mainnetRSWETH,
    mainnetSWELL,
    mainnetUSDC,
    mainnetUSDT,
    mainnetWBTC,
} from '../defaultTokens';
import { GCGO_ETHEREUM_URL } from '../gcgo';
import { TopPool } from './TopPool';

const PUBLIC_RPC_URL = 'https://ethereum-rpc.publicnode.com';
const SECONDARY_PUBLIC_RPC_URL = 'https://eth.llamarpc.com';

const RESTRICTED_RPC_URL =
    import.meta.env.VITE_MAINNET_RPC_URL !== undefined
        ? import.meta.env.VITE_MAINNET_RPC_URL
        : undefined;

const PRIMARY_RPC_URL = RESTRICTED_RPC_URL
    ? RESTRICTED_RPC_URL
    : PUBLIC_RPC_URL;

const FALLBACK_RPC_URL =
    PRIMARY_RPC_URL === PUBLIC_RPC_URL
        ? SECONDARY_PUBLIC_RPC_URL
        : PUBLIC_RPC_URL;

const chainIdHex = '0x1';
const chainSpecFromSDK = lookupChain(chainIdHex);

const chainSpecForWalletConnector = {
    chainId: Number(chainIdHex),
    name: 'Ethereum',
    currency: 'ETH',
    rpcUrl: PUBLIC_RPC_URL,
    explorerUrl: 'https://etherscan.io/',
};

export const ethereumMainnet: NetworkIF = {
    chainId: chainIdHex,
    chainSpec: chainSpecFromSDK,
    GCGO_URL: GCGO_ETHEREUM_URL,
    evmRpcUrl: PRIMARY_RPC_URL,
    fallbackRpcUrl: FALLBACK_RPC_URL,
    chainSpecForWalletConnector: chainSpecForWalletConnector,
    defaultPair: [mainnetETH, mainnetUSDC],
    poolIndex: chainSpecFromSDK.poolIndex,
    gridSize: chainSpecFromSDK.gridSize,
    blockExplorer: chainSpecForWalletConnector.explorerUrl,
    displayName: 'Ethereum',
    tokenPriceQueryAssetPlatform: 'ethereum',
    vaultsEnabled: true,
    tempestApiNetworkName: 'ethereum',
    topPools: [
        new TopPool(mainnetETH, mainnetUSDC, chainSpecFromSDK.poolIndex),
        new TopPool(mainnetUSDT, mainnetUSDC, chainSpecFromSDK.poolIndex),
        new TopPool(mainnetETH, mainnetUSDT, chainSpecFromSDK.poolIndex),
        new TopPool(mainnetRSWETH, mainnetSWELL, chainSpecFromSDK.poolIndex),
        new TopPool(mainnetETH, mainnetWBTC, chainSpecFromSDK.poolIndex),
    ],
    getGasPriceInGwei: async (provider?: Provider) => {
        if (!provider) return 0;
        return (
            bigIntToFloat((await provider.getFeeData()).gasPrice || BigInt(0)) *
            1e-9
        );
    },
};
