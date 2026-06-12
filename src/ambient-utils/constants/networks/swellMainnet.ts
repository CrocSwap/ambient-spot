import { bigIntToFloat } from '@crocswap-libs/sdk';
import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { Chain } from '@reown/appkit/networks';
import { Provider } from 'ethers';
import { findTokenByAddress } from '../../dataLayer/functions/findTokenByAddress';
import { TokenIF } from '../../types';
import { NetworkIF } from '../../types/NetworkIF';
import { GCGO_SWELL_URLS } from '../gcgo';
import { TopPool } from './TopPool';
import { GcgoProvider } from '../../../utils/gcgoProvider';

const RPC_URLS = {
    PUBLIC: 'https://swell-mainnet.alt.technology',
    SECONDARY_PUBLIC: 'https://rpc.ankr.com/swell',
    RESTRICTED: import.meta.env.VITE_SWELL_RPC_URL,
};
const PRIMARY_RPC_URL = RPC_URLS.RESTRICTED || RPC_URLS.PUBLIC;
const FALLBACK_RPC_URL =
    PRIMARY_RPC_URL === RPC_URLS.PUBLIC
        ? RPC_URLS.SECONDARY_PUBLIC
        : RPC_URLS.PUBLIC;

const chainIdHex = '0x783';
const chainSpecFromSDK = lookupChain(chainIdHex);

const chainSpecForAppKit: Chain = {
    id: Number(chainIdHex),
    rpcUrls: {
        default: {
            http: [RPC_URLS.PUBLIC],
        },
    },
    name: 'Swellchain',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorers: {
        default: {
            name: 'Swell Explorer',
            url: 'https://swellchainscan.io/',
            apiUrl: 'https://api.swellchainscan.io/',
        },
    },
    contracts: {
        multicall3: {
            address: '0xcA11bde05977b3631167028862bE2a173976CA11',
        },
    },
};

const defaultTokenEntries = [
    ['ETH', '0x0000000000000000000000000000000000000000'],
    ['USDe', '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34'],
    ['ENA', '0x58538e6A46E07434d7E7375Bc268D3cb839C0133'],
    ['SWELL', '0x2826D136F5630adA89C1678b64A61620Aab77Aea'],
    ['rSWELL', '0x939f1cC163fDc38a77571019eb4Ad1794873bf8c'],
    ['weETH', '0xA6cB988942610f6731e664379D15fFcfBf282b44'],
    ['rswETH', '0x18d33689AE5d02649a859A1CF16c9f0563975258'],
    ['SUSDe', '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2'],
    ['wstETH', '0x7c98E0779EB5924b3ba8cE3B17648539ed5b0Ecc'],
    ['pzETH', '0x9cb41CD74D01ae4b4f640EC40f7A60cA1bCF83E7'],
    ['ezETH', '0x2416092f143378750bb29b79eD961ab195CcEea5'],
    ['rsETH', '0xc3eACf0612346366Db554C991D7858716db09f58'],
    ['swETH', '0x09341022ea237a4DB1644DE7CCf8FA0e489D85B7'],
    ['uBTC', '0xFA3198ecF05303a6d96E57a45E6c815055D255b1'],
    ['swBTC', '0x1cf7b5f266A0F39d6f9408B90340E3E71dF8BF7B'],
    ['stBTC', '0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3'],
    ['KING', '0xc2606aade4bdd978a4fa5a6edb3b66657acee6f8'],
    ['USDT0', '0x102d758f688a4c1c5a80b116bd945d4455460282'],
    ['USDK', '0x0000bAa0b1678229863c0A941C1056b83a1955F5'],
] as const;

type SwellTokens = Record<(typeof defaultTokenEntries)[number][0], TokenIF>;

export const SWELL_TOKENS: SwellTokens = Object.fromEntries(
    defaultTokenEntries.map(([key, address]) => [
        key,
        findTokenByAddress(address, chainIdHex),
    ]),
) as SwellTokens;

const curentTopPoolsList: [keyof SwellTokens, keyof SwellTokens][] = [
    ['ETH', 'USDe'],
    ['ENA', 'USDe'],
    ['rSWELL', 'SWELL'],
    ['ETH', 'SWELL'],
];

const topPools = curentTopPoolsList.map(
    ([tokenA, tokenB]) =>
        new TopPool(
            SWELL_TOKENS[tokenA],
            SWELL_TOKENS[tokenB],
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

export const swellMainnet: NetworkIF = {
    chainId: chainIdHex,
    chainSpec: chainSpecFromSDK,
    gcgo: new GcgoProvider(GCGO_SWELL_URLS, Number(chainIdHex)),
    GCGO_URLS: GCGO_SWELL_URLS,
    evmRpcUrls: [PRIMARY_RPC_URL, FALLBACK_RPC_URL],
    chainSpecForAppKit,
    defaultPair: [SWELL_TOKENS.ETH, SWELL_TOKENS.USDe],
    poolIndex: chainSpecFromSDK.poolIndex,
    gridSize: chainSpecFromSDK.gridSize,
    isTestnet: chainSpecFromSDK.isTestNet,
    fastLaneProtectionEnabled: false,
    blockExplorer: (
        chainSpecForAppKit.blockExplorers?.default.url || ''
    ).replace(/\/?$/, '/'),
    displayName: 'Swell',
    tokenPriceQueryAssetPlatform: 'swell',
    vaultsEnabled: true,
    tempestApiNetworkName: 'swell',
    topPools,
    // priorityPool: [SWELL_TOKENS['KING'], SWELL_TOKENS['ETH']],
    getGasPriceInGwei,
};
