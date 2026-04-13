import { bigIntToFloat } from '@crocswap-libs/sdk';
import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { Chain } from '@reown/appkit/networks';
import { Provider } from 'ethers';
import { findTokenByAddress } from '../../dataLayer/functions/findTokenByAddress';
import { TokenIF } from '../../types';
import { NetworkIF } from '../../types/NetworkIF';
import { GCGO_PLUME_URLS } from '../gcgo';
import { TopPool } from './TopPool';
import { GcgoProvider } from '../../../utils/gcgoProvider';

const RPC_URLS = {
    PUBLIC: 'https://rpc.plumenetwork.xyz',
    SECONDARY_PUBLIC: 'https://rpc.plumenetwork.xyz',
    RESTRICTED: import.meta.env.VITE_PLUME_RPC_URL,
    WEBSOCKET: 'wss://rpc.plumenetwork.xyz',
};

const PRIMARY_RPC_URL = RPC_URLS.RESTRICTED || RPC_URLS.PUBLIC;
const FALLBACK_RPC_URL =
    PRIMARY_RPC_URL === RPC_URLS.PUBLIC ? RPC_URLS.PUBLIC : RPC_URLS.RESTRICTED;

const chainIdHex = '0x18231';
const chainSpecFromSDK = lookupChain(chainIdHex);

const chainSpecForAppKit: Chain = {
    id: Number(chainIdHex),
    rpcUrls: {
        default: {
            http: [RPC_URLS.PUBLIC],
            webSocket: [RPC_URLS.WEBSOCKET],
        },
    },
    name: 'Plume (Legacy)',
    nativeCurrency: {
        name: 'Plume Ether',
        symbol: 'ETH',
        decimals: 18,
    },
    blockExplorers: {
        default: {
            name: 'Blockscout',
            url: 'https://explorer.plumenetwork.xyz/',
            apiUrl: 'https://explorer.plumenetwork.xyz/api/',
        },
    },
};

const defaultTokenEntries = [
    ['ETH', '0x0000000000000000000000000000000000000000'],
    ['pETH', '0xD630fb6A07c9c723cf709d2DaA9B63325d0E0B73'],
    ['pUSD', '0xdddD73F5Df1F0DC31373357beAC77545dC5A6f3F'],
    ['USDC', '0x3938A812c54304fEffD266C7E2E70B48F9475aD6'],
    ['USDT', '0xA849026cDA282eeeBC3C39Afcbe87a69424F16B4'],
    ['NRWA', '0x81537d879ACc8a290a1846635a0cAA908f8ca3a6'],
    ['NTBILL', '0xE72Fe64840F4EF80E3Ec73a1c749491b5c938CB9'],
    ['NYIELD', '0x892DFf5257B39f7afB7803dd7C81E8ECDB6af3E8'],
    ['nELIXIR', '0x9fbC367B9Bb966a2A537989817A088AFCaFFDC4c'],
] as const;

type PlumeTokens = Record<(typeof defaultTokenEntries)[number][0], TokenIF>;

export const PLUME_LEGACY_TOKENS: PlumeTokens = Object.fromEntries(
    defaultTokenEntries.map(([key, address]) => [
        key,
        findTokenByAddress(address, chainIdHex),
    ]),
) as PlumeTokens;

const curentTopPoolsList: [keyof PlumeTokens, keyof PlumeTokens][] = [
    ['ETH', 'USDC'],
    ['pETH', 'pUSD'],
    ['pETH', 'ETH'],
];

const topPools = curentTopPoolsList.map(
    ([tokenA, tokenB]) =>
        new TopPool(
            PLUME_LEGACY_TOKENS[tokenA],
            PLUME_LEGACY_TOKENS[tokenB],
            chainSpecFromSDK.poolIndex,
        ),
);

const getGasPriceInGwei = async (provider?: Provider) => {
    if (!provider) return 0;
    return (
        bigIntToFloat((await provider.getFeeData()).gasPrice || BigInt(0)) *
        1e-9
    );
};

export const plumeLegacy: NetworkIF = {
    chainId: chainIdHex,
    chainSpec: chainSpecFromSDK,
    gcgo: new GcgoProvider(GCGO_PLUME_URLS, Number(chainIdHex)),
    GCGO_URLS: GCGO_PLUME_URLS,
    evmRpcUrls: [PRIMARY_RPC_URL, FALLBACK_RPC_URL],
    chainSpecForAppKit,
    defaultPair: [PLUME_LEGACY_TOKENS.pETH, PLUME_LEGACY_TOKENS.pUSD],
    poolIndex: chainSpecFromSDK.poolIndex,
    gridSize: chainSpecFromSDK.gridSize,
    isTestnet: chainSpecFromSDK.isTestNet,
    fastLaneProtectionEnabled: false,
    blockExplorer: (
        chainSpecForAppKit.blockExplorers?.default.url || ''
    ).replace(/\/?$/, '/'),
    displayName: 'Plume (Legacy)',
    tokenPriceQueryAssetPlatform: 'plume',
    vaultsEnabled: false,
    tempestApiNetworkName: '',
    topPools,
    getGasPriceInGwei,
    indexerTimeout: 2000,
};
