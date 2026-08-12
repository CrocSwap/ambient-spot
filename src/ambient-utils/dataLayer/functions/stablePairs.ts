// @return true if the two tokens constitute a stable pair (USD based stables only for now)
//
// NOTE: Definition of what constitutes a "stable pair" is arbitrary and just based
//       on the devs discretion. Users should not assume that true/false implies

import { getMoneynessRank } from '.';
import { ZERO_ADDRESS } from '../../constants';
import { BASE_SEPOLIA_TOKENS } from '../../constants/networks/baseSepolia';
import { BLAST_TOKENS } from '../../constants/networks/blastMainnet';
import { BLAST_SEPOLIA_TOKENS } from '../../constants/networks/blastSepolia';
import { MAINNET_TOKENS } from '../../constants/networks/ethereumMainnet';
import { SEPOLIA_TOKENS } from '../../constants/networks/ethereumSepolia';
import { MONAD_TESTNET_TOKENS } from '../../constants/networks/monadTestnet';
import { PLUME_LEGACY_TOKENS } from '../../constants/networks/plumeLegacy';
import { PLUME_TOKENS } from '../../constants/networks/plumeMainnet';
import { SCROLL_TOKENS } from '../../constants/networks/scrollMainnet';
import { SCROLL_SEPOLIA_TOKENS } from '../../constants/networks/scrollSepolia';
import { TokenIF } from '../../types';

export function isUsdcToken(addr: string): boolean {
    return USDC_TOKENS.includes(addr.toLowerCase());
}

export function isPriorityUsdEquivalent(addr: string): boolean {
    return PRIORITY_USD_EQUIVALENT_TOKENS.includes(addr.toLowerCase());
}

export function isBlastRewardToken(addr: string): boolean {
    return BLAST_REWARD_TOKENS.includes(addr.toLowerCase());
}

export function isUSDQtoken(addr: string): boolean {
    return SCROLL_TOKENS.USDQ.address.toLowerCase() === addr.toLowerCase();
}

export function isPriorityEthEquivalent(addr: string): boolean {
    return PRIORITY_ETH_EQUIVALENT_TOKENS.includes(addr.toLowerCase());
}

export function isETHorStakedEthToken(addr: string, chainId: string): boolean {
    return (
        ETH_TOKENS.some(
            ({ address, chainId: chainIdNum }) =>
                address.toLowerCase() === addr.toLowerCase() &&
                chainIdNum === parseInt(chainId),
        ) || STAKED_ETH_TOKENS.includes(addr.toLowerCase())
    );
}

export function isPairEthTokens(
    addr1: string,
    addr2: string,
    chainId: string,
): boolean {
    return (
        isETHorStakedEthToken(addr1, chainId) &&
        isETHorStakedEthToken(addr2, chainId)
    );
}

export function isWbtcOrStakedBTCToken(addr: string): boolean {
    return isWbtcToken(addr) || STAKED_BTC_TOKENS.includes(addr.toLowerCase());
}

// @return true if the token represents a USD-based stablecoin
// NOTE: Decision of whether a token counts as stable or not is arbitrary and just at the
//       discretion of the app authors
export function isUsdStableToken(addr: string): boolean {
    return STABLE_USD_TOKENS.includes(addr.toLowerCase());
}

export function isPairUsdStableTokens(addr1: string, addr2: string): boolean {
    return isUsdStableToken(addr1) && isUsdStableToken(addr2);
}

export function isPairBtcTokens(addr1: string, addr2: string): boolean {
    return isWbtcOrStakedBTCToken(addr1) && isWbtcOrStakedBTCToken(addr2);
}

export function isStablePair(
    addr1: string,
    addr2: string,
    chainId: string,
): boolean {
    return (
        isPairUsdStableTokens(addr1, addr2) ||
        isPairEthTokens(addr1, addr2, chainId) ||
        isPairBtcTokens(addr1, addr2)
    );
}

export function isWbtcToken(addr: string): boolean {
    return WBTC_TOKENS.includes(addr.toLowerCase());
}

// added so rswETH / SWELL would be denominated in SWELL by default
export function isDefaultDenomTokenExcludedFromUsdConversion(
    baseToken: TokenIF,
    quoteToken: TokenIF,
): boolean {
    const isBaseTokenMoneynessGreaterOrEqual =
        getMoneynessRank(baseToken.symbol) -
            getMoneynessRank(quoteToken.symbol) >=
        0;
    return USD_EXCLUDED_TOKENS.includes(
        isBaseTokenMoneynessGreaterOrEqual
            ? baseToken.address.toLowerCase()
            : quoteToken.address.toLowerCase(),
    );
}

// @return true if the token is a WETH or wrapped native token asset
export function isWrappedNativeToken(addr: string): boolean {
    return WRAPPED_NATIVE_TOKENS.includes(addr.toLowerCase());
}

export function remapTokenIfWrappedNative(addr: string): string {
    if (isWrappedNativeToken(addr)) {
        return ZERO_ADDRESS;
    }
    return addr;
}

export const USDC_TOKENS = [
    MAINNET_TOKENS.USDC,
    BLAST_TOKENS.USDB,
    PLUME_LEGACY_TOKENS.USDC,
    SEPOLIA_TOKENS.USDC,
    BLAST_SEPOLIA_TOKENS.USDB,
    SCROLL_SEPOLIA_TOKENS.USDC,
    SCROLL_TOKENS.USDC,
    BASE_SEPOLIA_TOKENS.USDC,
    MONAD_TESTNET_TOKENS.USDC,
].map((x) => x.address.toLowerCase());

export const PRIORITY_USD_EQUIVALENT_TOKENS = [PLUME_TOKENS.pUSD].map((x) =>
    x.address.toLowerCase(),
);

export const STABLE_USD_TOKENS = [
    MAINNET_TOKENS.DAI,
    MAINNET_TOKENS.USDT,
    BLAST_TOKENS.USDPLUS,
    SCROLL_TOKENS.USDT,
    SCROLL_TOKENS.USDQ,
    SCROLL_TOKENS.DAI,
    SCROLL_TOKENS.axlUSDC,
    SCROLL_TOKENS.USDE,
    SCROLL_TOKENS.SUSDe,
    PLUME_TOKENS.pUSD,
    PLUME_TOKENS['USDC.e'],
    PLUME_TOKENS.USDT,
    PLUME_TOKENS.nELIXIR,
    PLUME_TOKENS.nRWA,
    PLUME_TOKENS.nTBILL,
    PLUME_TOKENS.nBASIS,
    PLUME_TOKENS.nCREDIT,
    BASE_SEPOLIA_TOKENS.USDT,
    MONAD_TESTNET_TOKENS.USDT,
]
    .map((x) => x?.address.toLowerCase())
    .concat(USDC_TOKENS);

export const BLAST_REWARD_TOKENS = [BLAST_TOKENS.BLAST.address].map((x) =>
    x.toLowerCase(),
);

export const WBTC_TOKENS = [
    MAINNET_TOKENS.WBTC,
    SCROLL_TOKENS.WBTC,
    SEPOLIA_TOKENS.WBTC,
    MONAD_TESTNET_TOKENS.WBTC,
].map((x) => x.address.toLowerCase());

export const ETH_TOKENS = [
    MAINNET_TOKENS.ETH,
    SCROLL_TOKENS.ETH,
    BLAST_TOKENS.ETH,
    PLUME_LEGACY_TOKENS.ETH,
    MONAD_TESTNET_TOKENS.ETH,
    SEPOLIA_TOKENS.ETH,
    SCROLL_SEPOLIA_TOKENS.ETH,
    BLAST_SEPOLIA_TOKENS.ETH,
    BASE_SEPOLIA_TOKENS.ETH,
    MONAD_TESTNET_TOKENS.ETH,
    MONAD_TESTNET_TOKENS.WETH,
    MONAD_TESTNET_TOKENS.WWETH,
    PLUME_TOKENS.WETH,
];

export const STAKED_ETH_TOKENS = [
    MAINNET_TOKENS.swETH,
    MAINNET_TOKENS.rsETH,
    MAINNET_TOKENS.rswETH,
    MAINNET_TOKENS.STONE,
    SCROLL_TOKENS.wstETH,
    SCROLL_TOKENS.wrsETH,
    SCROLL_TOKENS.rsETH,
    SCROLL_TOKENS.rswETH,
    SCROLL_TOKENS.STONE,
    SCROLL_TOKENS.uniETH,
    SCROLL_TOKENS.weETH,
    SCROLL_TOKENS.pxETH,
    SCROLL_TOKENS.pufETH,
    SCROLL_TOKENS.rETH,
    BLAST_TOKENS.wrsETH,
    BLAST_TOKENS.ezETH,
    BLAST_TOKENS.weETH,
    PLUME_LEGACY_TOKENS.pETH,
    PLUME_TOKENS.pETH,
    MONAD_TESTNET_TOKENS.gigaETH,
].map((x) => x.address.toLowerCase());

export const PRIORITY_ETH_EQUIVALENT_TOKENS = [
    PLUME_LEGACY_TOKENS.pETH,
    MONAD_TESTNET_TOKENS.WETH,
    MONAD_TESTNET_TOKENS.ETH,
    PLUME_TOKENS.pETH,
].map((x) => x.address.toLowerCase());

export const USD_EXCLUDED_TOKENS = [MAINNET_TOKENS.SWELL.address].map((x) =>
    x.toLowerCase(),
);

export const STAKED_BTC_TOKENS = [
    SCROLL_TOKENS.SolvBTC,
    MAINNET_TOKENS.tBTC,
].map((x) => x.address.toLowerCase());

export const WRAPPED_NATIVE_TOKENS = [
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // Mainnet
    '0x5300000000000000000000000000000000000004', // Scroll (test and main)
    '0x4300000000000000000000000000000000000004', // Blast
    '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14', // Sepolia
    '0x4200000000000000000000000000000000000023', // Blast Sepolia
    '0xaA6210015fbf0855F0D9fDA3C415c1B12776Ae74', // Plume Sepolia
    '0x863d7abb9c62d8bc69ea9ebc3e3583057d533e6f', // Scroll Sepolia
    '0xEa237441c92CAe6FC17Caaf9a7acB3f953be4bd1', // Plume Mainnet
].map((x) => x.toLowerCase());
