import { bigIntToFloat } from '@crocswap-libs/sdk';
import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { Chain } from '@reown/appkit/networks';
import { Provider } from 'ethers';
import { findTokenByAddress } from '../../dataLayer/functions/findTokenByAddress';
import { TokenIF } from '../../types';
import { NetworkIF } from '../../types/NetworkIF';
import { GCGO_SCROLL_URLS } from '../gcgo';
import { TopPool } from './TopPool';
import { GcgoProvider } from '../../../utils/gcgoProvider';

const RPC_URLS = {
    PUBLIC: 'https://rpc.scroll.io',
    SECONDARY_PUBLIC: 'https://scroll.drpc.org',
    RESTRICTED: import.meta.env.VITE_SCROLL_RPC_URL,
};
const PRIMARY_RPC_URL = RPC_URLS.RESTRICTED || RPC_URLS.PUBLIC;
const FALLBACK_RPC_URL =
    PRIMARY_RPC_URL === RPC_URLS.PUBLIC
        ? RPC_URLS.SECONDARY_PUBLIC
        : RPC_URLS.PUBLIC;

const chainIdHex = '0x82750';
const chainSpecFromSDK = lookupChain(chainIdHex);

const chainSpecForAppKit: Chain = {
    id: Number(chainIdHex),
    rpcUrls: {
        default: {
            http: [RPC_URLS.PUBLIC],
        },
    },
    name: 'Scroll',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorers: {
        default: {
            name: 'Scrollscan',
            url: 'https://scrollscan.com/',
            apiUrl: 'https://api.scrollscan.com/api/',
        },
    },
};

const defaultTokenEntries = [
    ['ETH', '0x0000000000000000000000000000000000000000'],
    ['USDC', '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4'],
    ['USDT', '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df'],
    ['WBTC', '0x3C1BCa5a656e69edCD0D4E36BEbb3FcDAcA60Cf1'],
    ['wrsETH', '0xa25b25548b4c98b0c7d3d27dca5d5ca743d68b7f'],
    ['DAI', '0xcA77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97'],
    ['axlUSDC', '0xEB466342C4d449BC9f53A865D5Cb90586f405215'],
    ['USDE', '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34'],
    ['SUSDe', '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'],
    ['wstETH', '0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32'],
    ['rsETH', '0x65421ba909200b81640d98b979d07487c9781b66'],
    ['rswETH', '0x89f17aB70cAFB1468D633056161573efEfeA0713'],
    ['STONE', '0x80137510979822322193FC997d400D5A6C747bf7'],
    ['uniETH', '0x15eefe5b297136b8712291b632404b66a8ef4d25'],
    ['weETH', '0x01f0a31698c4d065659b9bdc21b3610292a1c506'],
    ['pxETH', '0x9e0d7d79735e1c63333128149c7b616a0dc0bbdb'],
    ['pufETH', '0xc4d46E8402F476F269c379677C99F18E22Ea030e'],
    ['rETH', '0x53878B874283351D26d206FA512aEcE1Bef6C0dD'],
    ['SolvBTC', '0x3Ba89d490AB1C0c9CC2313385b30710e838370a4'],
    ['SCR', '0xd29687c813d741e2f938f4ac377128810e217b1b'],
    ['USDQ', '0xdb9e8f82d6d45fff803161f2a5f75543972b229a'],
] as const;

type ScrollTokens = Record<(typeof defaultTokenEntries)[number][0], TokenIF>;

export const SCROLL_TOKENS = Object.fromEntries(
    defaultTokenEntries.map(([key, address]) => [
        key,
        findTokenByAddress(address, chainIdHex),
    ]),
) as ScrollTokens;

const curentTopPoolsList: [keyof ScrollTokens, keyof ScrollTokens][] = [
    ['ETH', 'USDC'],
    ['SCR', 'ETH'],
    ['ETH', 'USDT'],
    ['wstETH', 'ETH'],
    ['ETH', 'WBTC'],
];

const topPools = curentTopPoolsList.map(
    ([tokenA, tokenB]) =>
        new TopPool(
            SCROLL_TOKENS[tokenA],
            SCROLL_TOKENS[tokenB],
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

export const scrollMainnet: NetworkIF = {
    chainId: chainIdHex,
    chainSpec: chainSpecFromSDK,
    gcgo: new GcgoProvider(GCGO_SCROLL_URLS, Number(chainIdHex)),
    GCGO_URLS: GCGO_SCROLL_URLS,
    evmRpcUrls: [PRIMARY_RPC_URL, FALLBACK_RPC_URL],
    chainSpecForAppKit,
    defaultPair: [SCROLL_TOKENS.ETH, SCROLL_TOKENS.USDC],
    poolIndex: chainSpecFromSDK.poolIndex,
    gridSize: chainSpecFromSDK.gridSize,
    isTestnet: chainSpecFromSDK.isTestNet,
    fastLaneProtectionEnabled: false,
    blockExplorer: (
        chainSpecForAppKit.blockExplorers?.default.url || ''
    ).replace(/\/?$/, '/'),
    displayName: 'Scroll',
    tokenPriceQueryAssetPlatform: 'scroll',
    vaultsEnabled: true,
    tempestApiNetworkName: 'scroll',
    topPools,
    priorityPool: [SCROLL_TOKENS['USDQ'], SCROLL_TOKENS['USDC']],
    getGasPriceInGwei,
};
