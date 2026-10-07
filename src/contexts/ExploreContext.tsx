import { CrocEnv } from '@crocswap-libs/sdk';
import {
    Dispatch,
    ReactNode,
    SetStateAction,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    excludedTokenAddressesLowercase,
    hiddenTokens,
} from '../ambient-utils/constants';
import { expandPoolStats } from '../ambient-utils/dataLayer';
import { PoolIF } from '../ambient-utils/types';
import checkPoolForWETH from '../App/functions/checkPoolForWETH';
import {
    useTokenStats,
    useTokenStatsIF,
} from '../pages/platformAmbient/Explore/useTokenStats';
import { AppStateContext } from './AppStateContext';
import { CachedDataContext } from './CachedDataContext';
import { ChainDataContext } from './ChainDataContext';
import { CrocEnvContext } from './CrocEnvContext';
import { TokenContext } from './TokenContext';

export interface ExploreContextIF {
    pools: {
        all: Array<PoolIF>;
        topPools: PoolIF[];
        visibleTopPoolData: PoolIF[];
        setVisibleTopPoolData: Dispatch<SetStateAction<PoolIF[]>>;
        processPoolListForActiveChain: () => Promise<void>;
        activePoolList: PoolIF[] | undefined;
        reset: () => void;
    };
    topTokensOnchain: useTokenStatsIF;
    isExploreDollarizationEnabled: boolean;
    setIsExploreDollarizationEnabled: Dispatch<SetStateAction<boolean>>;
}

export const ExploreContext = createContext({} as ExploreContextIF);

export const ExploreContextProvider = (props: { children: ReactNode }) => {
    const { activeNetwork, isUserOnline } = useContext(AppStateContext);
    const { cachedFetchTokenPrice, cachedTokenDetails, cachedQuerySpotPrice } =
        useContext(CachedDataContext);
    const { activePoolList } = useContext(ChainDataContext);

    const {
        topPools: hardcodedTopPools,
        crocEnv,
        provider,
    } = useContext(CrocEnvContext);
    const { tokens } = useContext(TokenContext);

    const [intermediaryPoolData, setIntermediaryPoolData] = useState<
        Array<PoolIF>
    >([]);
    const [visibleTopPoolData, setVisibleTopPoolData] = useState<PoolIF[]>([]);
    const [isFetchError, setIsFetchError] = useState(false);
    const [isExploreDollarizationEnabled, setIsExploreDollarizationEnabled] =
        useState(
            localStorage.getItem('isExploreDollarizationEnabled') === 'true',
        );

    useEffect(() => {
        const savedDollarizationPreference =
            localStorage.getItem('isExploreDollarizationEnabled') === 'true';
        if (isExploreDollarizationEnabled !== savedDollarizationPreference) {
            localStorage.setItem(
                'isExploreDollarizationEnabled',
                isExploreDollarizationEnabled.toString(),
            );
        }
    }, [isExploreDollarizationEnabled]);

    const processPoolListForActiveChain = async (): Promise<void> => {
        // make sure crocEnv exists and pool metadata is present
        if (
            // poolList?.length &&
            crocEnv
        ) {
            // use metadata to get expanded pool data
            processPoolList(activeNetwork.chainId, crocEnv);
        }
    };

    // fn to get data on a single pool
    async function expandPoolListData(
        pool: PoolIF,
        crocEnv: CrocEnv,
    ): Promise<PoolIF> {
        const expandedPoolData = await expandPoolStats(
            pool,
            crocEnv,
            cachedFetchTokenPrice,
            cachedTokenDetails,
            cachedQuerySpotPrice,
            tokens.tokenUniv,
        );

        return expandedPoolData;
    }

    function processPoolList(chainId: string, crocEnv: CrocEnv): void {
        if (!activePoolList?.length) return;

        const expandedPoolDataOnCurrentChain = activePoolList
            .filter((pool) => pool.chainId === chainId)
            .map((pool: PoolIF) => expandPoolListData(pool, crocEnv));

        Promise.allSettled(expandedPoolDataOnCurrentChain)
            .then((results) => {
                setIsFetchError(false);

                // Extract only successfully resolved pools
                const successfulPools = results
                    .filter(
                        (res): res is PromiseFulfilledResult<PoolIF> =>
                            res.status === 'fulfilled',
                    )
                    .map((res) => res.value)
                    .filter(
                        (pool) => pool.lastPriceSwap && pool.lastPriceSwap > 0,
                    );

                if (successfulPools.length) {
                    setIntermediaryPoolData(successfulPools);
                }
            })
            .catch((err) => {
                setIsFetchError(true);
                console.warn(err);
            });
    }

    const [poolDataFilteredByActiveChain, setPoolDataFilteredByActiveChain] =
        useState<Array<PoolIF>>([]);

    useEffect(() => {
        setPoolDataFilteredByActiveChain([]);
    }, [activeNetwork.chainId]);

    useEffect(() => {
        const poolDataFilteredByActiveChain = intermediaryPoolData.filter(
            (pool) => pool.chainId === activeNetwork.chainId,
        );
        if (
            intermediaryPoolData.length === poolDataFilteredByActiveChain.length
        ) {
            setPoolDataFilteredByActiveChain(intermediaryPoolData);
        }
    }, [intermediaryPoolData, activeNetwork.chainId]);

    // Filter out excluded addresses and hidden tokens
    const filteredPoolsNoExcludedOrHiddenTokens = useMemo(
        () =>
            poolDataFilteredByActiveChain.filter(
                (pool) =>
                    !checkPoolForWETH(pool) &&
                    !excludedTokenAddressesLowercase.includes(
                        pool.base.toLowerCase(),
                    ) &&
                    !excludedTokenAddressesLowercase.includes(
                        pool.quote.toLowerCase(),
                    ) &&
                    !hiddenTokens.some(
                        (excluded) =>
                            (excluded.address.toLowerCase() ===
                                pool.base.toLowerCase() ||
                                excluded.address.toLowerCase() ===
                                    pool.quote.toLowerCase()) &&
                            excluded.chainId === parseInt(pool.chainId),
                    ),
            ),
        [poolDataFilteredByActiveChain],
    );

    // get expanded pool metadata
    useEffect(() => {
        (async () => {
            if (
                isUserOnline &&
                crocEnv !== undefined &&
                activePoolList?.length &&
                (await crocEnv.context).chain.chainId === activeNetwork.chainId
            ) {
                processPoolListForActiveChain();
            }
        })();
    }, [
        isUserOnline,
        JSON.stringify(activePoolList),
        crocEnv,
        activeNetwork.chainId,
        // intermediaryPoolData.length !== poolDataFilteredByActiveChain.length,
    ]);

    const topPools = useMemo(() => {
        let topPoolsFilteredByVolume;
        if (
            filteredPoolsNoExcludedOrHiddenTokens.filter(
                (pool) => pool.volumeChange24h && pool.volumeChange24h > 1000,
            ).length >= 3
        ) {
            topPoolsFilteredByVolume =
                filteredPoolsNoExcludedOrHiddenTokens.filter(
                    (pool) =>
                        pool.volumeChange24h && pool.volumeChange24h > 1000,
                );
        } else if (
            filteredPoolsNoExcludedOrHiddenTokens.filter(
                (pool) => pool.volumeChange24h && pool.volumeChange24h > 100,
            ).length >= 3
        ) {
            topPoolsFilteredByVolume =
                filteredPoolsNoExcludedOrHiddenTokens.filter(
                    (pool) =>
                        pool.volumeChange24h && pool.volumeChange24h > 100,
                );
        } else if (
            filteredPoolsNoExcludedOrHiddenTokens.filter(
                (pool) => pool.volumeChange24h && pool.volumeChange24h > 0,
            ).length >= 3
        ) {
            topPoolsFilteredByVolume =
                filteredPoolsNoExcludedOrHiddenTokens.filter(
                    (pool) => pool.volumeChange24h && pool.volumeChange24h > 0,
                );
        } else {
            topPoolsFilteredByVolume = filteredPoolsNoExcludedOrHiddenTokens;
        }
        return isFetchError
            ? hardcodedTopPools
            : topPoolsFilteredByVolume
                  .sort(
                      (poolA: PoolIF, poolB: PoolIF) =>
                          (poolB['volumeChange24h'] || 0) -
                          (poolA['volumeChange24h'] || 0),
                  )
                  .slice(0, 5);
    }, [isFetchError, JSON.stringify(filteredPoolsNoExcludedOrHiddenTokens)]);

    const dexTokens: useTokenStatsIF = useTokenStats(
        activeNetwork.chainId,
        crocEnv,
        activeNetwork.gcgo,
        cachedFetchTokenPrice,
        cachedTokenDetails,
        tokens,
        provider,
        activePoolList,
    );

    const exploreContext: ExploreContextIF = {
        pools: {
            all: filteredPoolsNoExcludedOrHiddenTokens,
            processPoolListForActiveChain,
            topPools: topPools,
            visibleTopPoolData,
            setVisibleTopPoolData,
            activePoolList,
            reset: () => {
                setIntermediaryPoolData([]);
                setPoolDataFilteredByActiveChain([]);
            },
        },
        topTokensOnchain: dexTokens,
        isExploreDollarizationEnabled,
        setIsExploreDollarizationEnabled,
    };

    return (
        <ExploreContext value={exploreContext}>{props.children}</ExploreContext>
    );
};
