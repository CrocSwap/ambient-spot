import { bigIntToFloat } from '@crocswap-libs/sdk';
import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { Chain } from '@reown/appkit/networks';
import { Provider } from 'ethers';
import { TokenIF } from '../../types';
import { NetworkIF } from '../../types/NetworkIF';
import { GCGO_TESTNET_URLS } from '../gcgo';
import testnetTokenList from '../testnet-token-list.json';
import { TopPool } from './TopPool';
import { GcgoProvider } from '../../../utils/gcgoProvider';

const PUBLIC_RPC_URL = 'https://sepolia.base.org';
const SECONDARY_PUBLIC_RPC_URL = 'https://base-sepolia.drpc.org';

const RESTRICTED_RPC_URL =
    import.meta.env.VITE_BASE_SEPOLIA_RPC_URL !== undefined
        ? import.meta.env.VITE_BASE_SEPOLIA_RPC_URL
        : undefined;

const PRIMARY_RPC_URL = RESTRICTED_RPC_URL
    ? RESTRICTED_RPC_URL
    : PUBLIC_RPC_URL;

const FALLBACK_RPC_URL =
    PRIMARY_RPC_URL === PUBLIC_RPC_URL
        ? SECONDARY_PUBLIC_RPC_URL
        : PUBLIC_RPC_URL;

const chainIdHex = '0x14a34';
const chainSpecFromSDK = lookupChain(chainIdHex);

const chainSpecForAppKit: Chain = {
    id: Number(chainIdHex),
    rpcUrls: {
        default: {
            http: [PUBLIC_RPC_URL],
        },
    },
    name: 'Base Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    blockExplorers: {
        default: {
            name: 'Basescan',
            url: 'https://sepolia.basescan.org/',
            apiUrl: 'https://api-sepolia.basescan.org/api/',
        },
    },
    contracts: {
        multicall3: {
            address: '0xca11bde05977b3631167028862be2a173976ca11',
            blockCreated: 1059647,
        },
    },
    testnet: true,
};

const findTokenByAddress = (address: string): TokenIF =>
    testnetTokenList.tokens.find(
        (token) =>
            token.address.toLowerCase() === address.toLowerCase() &&
            token.chainId === Number(chainIdHex),
    ) as TokenIF;

const defaultTokenEntries = [
    ['ETH', '0x0000000000000000000000000000000000000000'],
    ['USDC', '0x1B98743bB9297A60FF9e75EA2630A77bf72bc17c'],
    ['USDT', '0x868cFD46ad326354AD214bEA9f08fD8EfBfac3b9'],
] as const;

// Infer the type of the keys and define the resulting type
type BaseSepoliaTokens = {
    [Key in (typeof defaultTokenEntries)[number][0]]: TokenIF;
};

// Safely construct the object with type inference
export const BASE_SEPOLIA_TOKENS: BaseSepoliaTokens = Object.fromEntries(
    defaultTokenEntries.map(([key, address]) => [
        key,
        findTokenByAddress(address),
    ]),
) as BaseSepoliaTokens;

export const baseSepolia: NetworkIF = {
    chainId: chainIdHex,
    chainSpec: chainSpecFromSDK,
    gcgo: new GcgoProvider(GCGO_TESTNET_URLS, Number(chainIdHex)),
    GCGO_URLS: GCGO_TESTNET_URLS,
    evmRpcUrls: [PRIMARY_RPC_URL, FALLBACK_RPC_URL],
    chainSpecForAppKit,
    defaultPair: [BASE_SEPOLIA_TOKENS.ETH, BASE_SEPOLIA_TOKENS.USDC],
    poolIndex: chainSpecFromSDK.poolIndex,
    gridSize: chainSpecFromSDK.gridSize,
    isTestnet: chainSpecFromSDK.isTestNet,
    blockExplorer: (
        chainSpecForAppKit.blockExplorers?.default.url || ''
    ).replace(/\/?$/, '/'),
    displayName: 'Base Testnet',
    tokenPriceQueryAssetPlatform: undefined,
    vaultsEnabled: false,
    tempestApiNetworkName: '',
    fastLaneProtectionEnabled: false,
    topPools: [
        new TopPool(
            BASE_SEPOLIA_TOKENS.ETH,
            BASE_SEPOLIA_TOKENS.USDC,
            chainSpecFromSDK.poolIndex,
        ),
        new TopPool(
            BASE_SEPOLIA_TOKENS.ETH,
            BASE_SEPOLIA_TOKENS.USDT,
            chainSpecFromSDK.poolIndex,
        ),
    ],
    getGasPriceInGwei: async (provider?: Provider) => {
        if (!provider) return 0;
        return (
            bigIntToFloat((await provider.getFeeData()).gasPrice || BigInt(0)) *
            1e-9
        );
    },
};
