import ambientTokenList from '../../constants/ambient-token-list.json';
import testnetTokenList from '../../constants/testnet-token-list.json';

export const getTranslatedSymbol = (tokenSymbol: string) =>
    tokenSymbol?.toUpperCase() === 'USD+'
        ? 'USDPLUS'
        : tokenSymbol?.toUpperCase() === 'USDC.E'
          ? 'USDC'
          : tokenSymbol?.toUpperCase() === 'SOLVBTC.B'
            ? 'SOLVBTC'
            : tokenSymbol?.toUpperCase() === 'USD₮0'
              ? 'USDT0'
              : tokenSymbol?.toUpperCase();

export const getMoneynessRank = (tokenSymbol: string): number => {
    /* 
        This 'moneyness' rank is intended to reflect an average user's expectation 
        of default price denomination, e.g. the price of the ETH/USDC pool should be 
        denominated by default in USDC for an appearance like 1,600, rather than 0.0006. 
        
        Comparing the moneyness rank value of USDC with the rank of ETH allows the front-end
        to set the default denomination to USDC, as it has a higher moneyness rank.

        The user can override this default denomination on /trade, but not /account.

        The current hardcoded ranking values are ordered according the dev team's intuition, 
        but otherwise arbitrary.
    */

    const moneynessRank = {
        USDC: 100,
        USDE: 99,
        USDT: 98,
        USDQ: 97,
        DAI: 96,
        AXLUSDC: 95,
        LUSD: 95,
        USDPLUS: 95,
        USDT0: 95,
        PUSD: 95,
        SUSDE: 90,
        NRWA: 75,
        NTBILL: 75,
        NYIELD: 75,
        NUSDY: 75,
        NBASIS: 75,
        NELIXIR: 75,
        NCREDIT: 75,
        FRAX: 70,
        WBTC: 60,
        SOLVBTC: 55,
        TBTC: 55,
        SWBTC: 55,
        STBTC: 55,
        UBTC: 55,
        SWELL: 52,
        ETH: 50,
        WETH: 49,
        WEETH: 48,
        PETH: 48,
        WSTETH: 45,
        WRSETH: 45,
        RSWETH: 45,
        RSETH: 45,
        PZETH: 45,
        EZETH: 45,
        WWETH: 45,
        RETH: 45,
        SWETH: 45,
        PXETH: 45,
        STONE: 40,
        UNIETH: 40,
        MON: 39,
        PLUME: 39,
        WMON: 38,
    };
    const translatedSymbol = getTranslatedSymbol(tokenSymbol);
    const rank =
        moneynessRank[translatedSymbol as keyof typeof moneynessRank] ?? 0;
    return rank;
};

export const getMoneynessRankByAddr = (
    tokenAddress: string,
    chainId: string,
): number => {
    let moneynessRank = 0;
    ambientTokenList.tokens.concat(testnetTokenList.tokens).forEach((token) => {
        if (
            token.address.toLowerCase() === tokenAddress.toLowerCase() &&
            token.chainId === Number(chainId)
        ) {
            const translatedSymbol = getTranslatedSymbol(token.symbol);

            moneynessRank = getMoneynessRank(translatedSymbol);
        }
    });
    return moneynessRank;
};
