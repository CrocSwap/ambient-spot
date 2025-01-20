import { defaultTokens } from '../../constants/defaultTokens';

export const getTranslatedSymbol = (tokenSymbol: string) =>
    tokenSymbol?.toUpperCase() === 'USD+'
        ? 'USDPLUS'
        : tokenSymbol?.toUpperCase() === 'USDC.E'
          ? 'USDC'
          : tokenSymbol?.toUpperCase() === 'SOLVBTC.B'
            ? 'SOLVBTC'
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
        USDB: 100,
        AXLUSDC: 95,
        LUSD: 95,
        USDPLUS: 95,
        USDE: 95,
        PUSD: 95,
        SUSDE: 90,
        DAI: 90,
        USDT: 80,
        NRWA: 75,
        FRAX: 70,
        WBTC: 60,
        SOLVBTC: 55,
        TBTC: 55,
        SWBTC: 55,
        STBTC: 55,
        UBTC: 55,
        SWELL: 52,
        ETH: 50,
        RSWETH: 48,
        WSTETH: 45,
        WRSETH: 45,
        RSETH: 45,
        PZETH: 45,
        EZETH: 45,
        WEETH: 45,
        RETH: 45,
        SWETH: 45,
        PXETH: 45,
        STONE: 40,
        UNIETH: 40,
        PEPE: 0,
    };
    const translatedSymbol = getTranslatedSymbol(tokenSymbol);
    const rank =
        moneynessRank[translatedSymbol as keyof typeof moneynessRank] ?? 0;
    return rank;
};

export const getMoneynessRankByAddr = (tokenAddress: string): number => {
    let moneynessRank = 0;
    defaultTokens.forEach((token) => {
        if (token.address.toLowerCase() === tokenAddress.toLowerCase()) {
            const translatedSymbol = getTranslatedSymbol(token.symbol);

            moneynessRank = getMoneynessRank(translatedSymbol);
        }
    });
    return moneynessRank;
};
