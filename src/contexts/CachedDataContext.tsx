import React, { createContext } from 'react';
import {
    AmbientListBalancesQueryFn,
    DexBalancesQueryFn,
    FetchAddrFn,
    FetchBlockTimeFn,
    FetchContractDetailsFn,
    FetchTopPairedTokenFn,
    PoolListFn,
    TokenPriceFn,
    memoizeFetchAmbientListWalletBalances,
    memoizeFetchBlockTime,
    memoizeFetchContractDetails,
    memoizeFetchDexBalances,
    memoizeFetchEnsAddress,
    memoizeFetchPoolList,
    memoizeFetchTopPairedToken,
    memoizeTokenPrice,
} from '../ambient-utils/api';

import { NFTQueryFn, memoizeFetchNFT } from '../ambient-utils/api/fetchNft';
import {
    AllPoolStatsFn,
    Change24Fn,
    LiquidityFeeFn,
    PoolStatsFn,
    SpotPriceFn,
    memoizeAllPoolStats,
    memoizeGet24hChange,
    memoizeGetLiquidityFee,
    memoizePoolStats,
    memoizeQuerySpotPrice,
    memoizeQuerySpotTick,
} from '../ambient-utils/dataLayer';

export interface CachedDataContextIF {
    cachedFetchAmbientListWalletBalances: AmbientListBalancesQueryFn;
    cachedFetchDexBalances: DexBalancesQueryFn;
    cachedFetchTokenPrice: TokenPriceFn;
    cachedPoolStatsFetch: PoolStatsFn;
    cachedAllPoolStatsFetch: AllPoolStatsFn;
    cachedGet24hChange: Change24Fn;
    cachedGetLiquidityFee: LiquidityFeeFn;
    cachedQuerySpotPrice: SpotPriceFn;
    cachedQuerySpotTick: SpotPriceFn;
    cachedTokenDetails: FetchContractDetailsFn;
    cachedEnsResolve: FetchAddrFn;
    cachedFetchTopPairedToken: FetchTopPairedTokenFn;
    cachedFetchBlockTime: FetchBlockTimeFn;
    cachedFetchNFT: NFTQueryFn;
    cachedFetchPoolList: PoolListFn;
}

export const CachedDataContext = createContext({} as CachedDataContextIF);

// TODO: refactor to cache in context and use other contexts as dependencies
export const CachedDataContextProvider = (props: {
    children: React.ReactNode;
}) => {
    const cachedDataState: CachedDataContextIF = {
        cachedFetchAmbientListWalletBalances:
            memoizeFetchAmbientListWalletBalances(),
        cachedFetchDexBalances: memoizeFetchDexBalances(),
        cachedFetchTokenPrice: memoizeTokenPrice(),
        cachedPoolStatsFetch: memoizePoolStats(),
        cachedAllPoolStatsFetch: memoizeAllPoolStats(),
        cachedGet24hChange: memoizeGet24hChange(),
        cachedGetLiquidityFee: memoizeGetLiquidityFee(),
        cachedQuerySpotPrice: memoizeQuerySpotPrice(),
        cachedQuerySpotTick: memoizeQuerySpotTick(),
        cachedTokenDetails: memoizeFetchContractDetails(),
        cachedEnsResolve: memoizeFetchEnsAddress(),
        cachedFetchTopPairedToken: memoizeFetchTopPairedToken(),
        cachedFetchBlockTime: memoizeFetchBlockTime(),
        cachedFetchNFT: memoizeFetchNFT(),
        cachedFetchPoolList: memoizeFetchPoolList(),
    };

    return (
        <CachedDataContext.Provider value={cachedDataState}>
            {props.children}
        </CachedDataContext.Provider>
    );
};
