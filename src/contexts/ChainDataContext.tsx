import { CrocEnv, toDisplayQty } from '@crocswap-libs/sdk';
import moment from 'moment';
import {
    createContext,
    Dispatch,
    ReactNode,
    SetStateAction,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    expandTokenBalances,
    fetchBlastUserXpData,
    fetchBlockNumber,
    fetchUserXpData,
    fetchVaultTvlUsd,
    RpcNodeStatus,
} from '../ambient-utils/api';
import { fetchNFT } from '../ambient-utils/api/fetchNft';
import {
    hiddenTokens,
    supportedNetworks,
    VAULTS_API_URL,
    vaultSupportedNetworkIds,
    ZERO_ADDRESS,
} from '../ambient-utils/constants';
import { ethereumMainnet } from '../ambient-utils/constants';
import { blastMainnet } from '../ambient-utils/constants';
import { plumeMainnet } from '../ambient-utils/constants';
import { scrollMainnet } from '../ambient-utils/constants';
import { swellMainnet } from '../ambient-utils/constants';
import { tokens as AMBIENT_TOKEN_LIST } from '../ambient-utils/constants/ambient-token-list.json';
import { getChainStats, getFormattedNumber } from '../ambient-utils/dataLayer';
import {
    AllVaultsServerIF,
    PoolIF,
    TokenIF,
    UserVaultsServerIF,
    VaultWithLiveTvlIF,
} from '../ambient-utils/types';
import { usePoolList } from '../App/hooks/usePoolList';
import { AppStateContext } from './AppStateContext';
import { BrandContext } from './BrandContext';
import { CachedDataContext } from './CachedDataContext';
import { CrocEnvContext } from './CrocEnvContext';
import { ReceiptContext } from './ReceiptContext';
import {
    NftDataIF,
    NftListByChain,
    TokenBalanceContext,
} from './TokenBalanceContext';
import { TokenContext } from './TokenContext';
import {
    BlastUserXpDataIF,
    UserDataContext,
    UserXpDataIF,
} from './UserDataContext';
import { fallbackVaultsList } from '../pages/platformAmbient/Vaults/fallbackVaultsList';

export interface ChainDataContextIF {
    gasPriceInGwei: number | undefined;
    setGasPriceinGwei: Dispatch<SetStateAction<number | undefined>>;
    lastBlockNumber: number;
    setLastBlockNumber: Dispatch<SetStateAction<number>>;
    rpcNodeStatus: RpcNodeStatus;
    connectedUserXp: UserXpDataIF;
    connectedUserBlastXp: BlastUserXpDataIF;
    isActiveNetworkBlast: boolean;
    isActiveNetworkPlume: boolean;
    isActiveNetworkSwell: boolean;
    isActiveNetworkBase: boolean;
    isActiveNetworkMonad: boolean;
    isActiveNetworkScroll: boolean;
    isActiveNetworkMainnet: boolean;
    isVaultSupportedOnNetwork: boolean;
    isActiveNetworkL2: boolean;
    nativeTokenUsdPrice: number | undefined;
    gcgoPoolList: PoolIF[] | undefined;
    allVaultsData: AllVaultsServerIF[] | null | undefined;
    setAllVaultsData: Dispatch<
        SetStateAction<AllVaultsServerIF[] | null | undefined>
    >;
    totalTvlString: string | undefined;
    totalVolumeString: string | undefined;
    totalFeesString: string | undefined;
    analyticsPoolList: PoolIF[] | undefined;
    setIsTokenBalanceFetchManuallyTriggerered: Dispatch<
        SetStateAction<boolean>
    >;
    setIsGasPriceFetchManuallyTriggerered: Dispatch<SetStateAction<boolean>>;
    isAnalyticsPoolListDefinedOrUnavailable: boolean;
    activePoolList: PoolIF[] | undefined;
    vaultsOnCurrentChain: VaultWithLiveTvlIF[] | undefined;
}

export const ChainDataContext = createContext({} as ChainDataContextIF);

export const ChainDataContextProvider = (props: { children: ReactNode }) => {
    const {
        activeNetwork: { chainId, gcgo, isTestnet },
        isUserIdle,
        isUserOnline,
        isTradeRoute,
        isAccountRoute,
        isAccountOrVaultRoute,
    } = useContext(AppStateContext);
    const {
        setTokenBalances,
        setNFTData,
        NFTFetchSettings,
        setNFTFetchSettings,
    } = useContext(TokenBalanceContext);
    const { sessionReceipts } = useContext(ReceiptContext);
    const {
        crocEnv,
        provider,
        mainnetProvider,
        scrollProvider,
        blastProvider,
        swellProvider,
        plumeProvider,
    } = useContext(CrocEnvContext);

    const [
        isAnalyticsPoolListDefinedOrUnavailable,
        setIsAnalyticsPoolListDefinedOrUnavailable,
    ] = useState(false);

    const {
        cachedFetchAmbientListWalletBalances,
        cachedFetchDexBalances,
        cachedFetchTokenPrice,
        cachedTokenDetails,
        cachedFetchNFT,
        cachedAllPoolStatsFetch,
    } = useContext(CachedDataContext);
    const { tokens } = useContext(TokenContext);
    const { showDexStats } = useContext(BrandContext);

    const {
        userAddress,
        isUserConnected,
        setIsfetchNftTriggered,
        isfetchNftTriggered,
        nftTestWalletAddress,
        setNftTestWalletAddress,
        setUserVaultData,
    } = useContext(UserDataContext);

    const [lastBlockNumber, setLastBlockNumber] = useState<number>(0);

    const [
        isTokenBalanceFetchManuallyTriggerered,
        setIsTokenBalanceFetchManuallyTriggerered,
    ] = useState<boolean>(false);

    const [
        isGasPriceFetchManuallyTriggerered,
        setIsGasPriceFetchManuallyTriggerered,
    ] = useState<boolean>(false);

    const [rpcNodeStatus, setRpcNodeStatus] =
        useState<RpcNodeStatus>('unknown');

    const [gasPriceInGwei, setGasPriceinGwei] = useState<number | undefined>();

    const isActiveNetworkBlast = ['0x13e31', '0xa0c71fd'].includes(chainId);
    const isActiveNetworkScroll = ['0x82750', '0x8274f'].includes(chainId);
    const isActiveNetworkMainnet = ['0x1'].includes(chainId);
    const isActiveNetworkPlume = ['0x18231', '0x18232'].includes(chainId);
    const isActiveNetworkSwell = ['0x783', '0x784'].includes(chainId);
    const isActiveNetworkBase = ['0x14a34'].includes(chainId);
    const isActiveNetworkMonad = ['0x279f'].includes(chainId);

    const isVaultSupportedOnNetwork =
        vaultSupportedNetworkIds.includes(chainId);

    // vault data from tempest API
    const [allVaultsData, setAllVaultsData] = useState<
        AllVaultsServerIF[] | null | undefined
    >(null);

    // Load cached stats from localStorage for instant display
    const cachedStats = useMemo(() => {
        try {
            const cached = localStorage.getItem('ambient_dex_stats');
            if (cached) {
                const parsed = JSON.parse(cached);
                // Only use cache if less than 5 minutes old
                if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
                    return parsed;
                }
            }
        } catch {
            // Ignore parse errors
        }
        return null;
    }, []);

    const [totalTvlString, setTotalTvlString] = useState<string | undefined>(
        cachedStats?.tvl,
    );
    const [totalVolumeString, setTotalVolumeString] = useState<
        string | undefined
    >(cachedStats?.volume);
    const [totalFeesString, setTotalFeesString] = useState<string | undefined>(
        cachedStats?.fees,
    );

    // array of network IDs for supported L2 networks
    const L1_NETWORKS: string[] = [
        '0x1', // ethereum mainnet
        // '0xaa36a7', // ethereum sepolia // removing to test base network slippage on sepolia
    ];

    // boolean representing whether the active network is an L2
    const isActiveNetworkL2 = !L1_NETWORKS.includes(chainId);

    const BLOCK_NUM_POLL_MS = isUserIdle || isActiveNetworkMonad ? 30000 : 5000; // poll for new block every 30 seconds when user is idle, every 5 seconds when user is active

    const poolStatsPollingCacheTime = Math.floor(
        Date.now() / (isUserIdle || isTestnet ? 120000 : 30000),
    ); // poll for new pool stats every 120 seconds when user is idle or on a testnet, every 30 seconds when user is active

    const [receiptRefreshTimeouts, setReceiptRefreshTimeouts] = useState<
        NodeJS.Timeout[]
    >([]);

    async function getAllVaultsData(): Promise<void> {
        const allVaultsEndpoint = `${VAULTS_API_URL}/vaults`;
        const chainVaultsEndpoint = `${VAULTS_API_URL}/vaults?chainId=${parseInt(chainId)}`;

        try {
            // Fetch both responses concurrently
            const [allVaultsResponse, chainVaultsResponse] = await Promise.all([
                fetch(allVaultsEndpoint),
                fetch(chainVaultsEndpoint),
            ]);

            // Parse JSON responses concurrently
            const [allVaultsData, chainVaultsData] = await Promise.all([
                allVaultsResponse.json(),
                chainVaultsResponse.json(),
            ]);

            const uniqueVaults = new Map<string, AllVaultsServerIF>();

            // Combine vaults and filter for uniqueness based on the 'id' property
            allVaultsData?.data?.vaults
                .concat(chainVaultsData?.data?.vaults)
                .forEach((vault: AllVaultsServerIF) => {
                    if (vault.id && !uniqueVaults.has(vault.id)) {
                        uniqueVaults.set(vault.id, vault);
                    }
                });

            // Convert the map back to an array and sort it
            const sorted: AllVaultsServerIF[] = Array.from(
                uniqueVaults.values(),
            ).sort(
                (a: AllVaultsServerIF, b: AllVaultsServerIF) =>
                    parseFloat(b.tvlUsd) - parseFloat(a.tvlUsd),
            );

            setAllVaultsData(sorted ?? undefined);
        } catch (error) {
            console.error('Error fetching vault data:', error);
            setAllVaultsData(fallbackVaultsList);
        }
    }

    const serverVaultsOnCurrentChain: AllVaultsServerIF[] | undefined =
        useMemo(() => {
            return allVaultsData !== undefined
                ? allVaultsData?.filter(
                      (vault) => Number(vault.chainId) === Number(chainId),
                  )
                : undefined;
        }, [allVaultsData, chainId]);

    // Settled USD value per vault. Keyed by chain as well as address because a
    // vault contract can share an address across chains, and because keying on
    // the active chain lets a network switch read as pending rather than
    // briefly showing the previous chain's figures.
    const vaultTvlKey = (vault: AllVaultsServerIF): string =>
        `${vault.chainId}:${vault.address.toLowerCase()}`;

    // Absence from this map means the read has not settled yet, so every vault
    // gets an entry once its read finishes, including the ones that fall back to
    // the server figure. See fetchVaultTvlUsd for why the API's own number goes
    // stale.
    const [onChainVaultTvl, setOnChainVaultTvl] = useState<Map<string, number>>(
        new Map(),
    );

    useEffect(() => {
        if (!provider || !serverVaultsOnCurrentChain?.length) return;
        let isStale = false;
        Promise.all(
            serverVaultsOnCurrentChain.map(async (vault) => {
                try {
                    const tvlUsd = await fetchVaultTvlUsd(
                        vault,
                        chainId,
                        provider,
                        cachedFetchTokenPrice,
                    );
                    // A vault the app cannot price on-chain keeps the server
                    // figure, so it still lists a number rather than reading as
                    // permanently pending.
                    return [
                        vaultTvlKey(vault),
                        tvlUsd ?? parseFloat(vault.tvlUsd),
                    ] as const;
                } catch (error) {
                    console.error(
                        `Error reading on-chain TVL for vault ${vault.vaultSymbol} (${vault.address}):`,
                        error,
                    );
                    return [
                        vaultTvlKey(vault),
                        parseFloat(vault.tvlUsd),
                    ] as const;
                }
            }),
        ).then((entries) => {
            if (isStale) return;
            setOnChainVaultTvl(new Map(entries));
        });
        return () => {
            isStale = true;
        };
    }, [
        provider,
        chainId,
        serverVaultsOnCurrentChain,
        poolStatsPollingCacheTime,
    ]);

    const vaultsOnCurrentChain: VaultWithLiveTvlIF[] | undefined = useMemo(
        () =>
            serverVaultsOnCurrentChain?.map((vault) => {
                const tvlUsd = onChainVaultTvl.get(vaultTvlKey(vault));
                return { ...vault, tvlUsd: tvlUsd?.toString() };
            }),
        [serverVaultsOnCurrentChain, onChainVaultTvl],
    );

    // logic to get user vault data
    async function getUserVaultData(): Promise<void> {
        if (userAddress && chainId && crocEnv && allVaultsData) {
            let calls: Map<AllVaultsServerIF, Promise<bigint>> = new Map();
            for (const vaultSpec of allVaultsData || []) {
                if (parseInt(vaultSpec.chainId) != parseInt(chainId)) continue;
                let vault = crocEnv.tempestVault(
                    vaultSpec.address,
                    vaultSpec.mainAsset,
                    vaultSpec.strategy,
                );
                calls.set(vaultSpec, vault.balanceToken1(userAddress));
            }
            await Promise.all(calls.values());
            const chainUserVaults: UserVaultsServerIF[] = [];
            for (const [vaultSpec, balanceInt] of calls.entries()) {
                if ((await balanceInt) == 0n) continue;
                const balance = (await balanceInt).toString();
                const balanceAmount = toDisplayQty(
                    await balanceInt,
                    vaultSpec.mainAsset == vaultSpec.token0Address
                        ? vaultSpec.token0Decimals
                        : vaultSpec.token1Decimals,
                );
                let price = 0;
                try {
                    const priceObj = await cachedFetchTokenPrice(
                        vaultSpec.mainAsset,
                        chainId,
                    );
                    price = priceObj?.usdPrice ?? 0;
                } catch {}

                const balanceUsd = price * Number(balanceAmount);

                chainUserVaults.push({
                    chainId: vaultSpec.chainId,
                    vaultAddress: vaultSpec.address,
                    walletAddress: userAddress as `0x${string}`,
                    balance,
                    balanceAmount,
                    balanceUsd: balanceUsd.toString(),
                });
            }

            setUserVaultData(chainUserVaults);
        }
    }

    useEffect(() => {
        // clear user vault data when the user changes
        setUserVaultData(undefined);
    }, [userAddress]);

    useEffect(() => {
        if (
            isVaultSupportedOnNetwork &&
            isAccountOrVaultRoute &&
            userAddress &&
            chainId &&
            allVaultsData &&
            crocEnv
        ) {
            getUserVaultData();
            const period = isUserIdle ? 600000 : 60000; // 10 minutes while idle, 1 minute while active
            const interval = setInterval(getUserVaultData, period);
            return () => clearInterval(interval);
        }
    }, [
        isVaultSupportedOnNetwork,
        isAccountOrVaultRoute,
        chainId,
        userAddress,
        isUserIdle,
        allVaultsData,
        crocEnv,
    ]);

    // logic to fetch vault data from API
    useEffect(() => {
        if (!isAccountOrVaultRoute || !isVaultSupportedOnNetwork) return;
        // run the first fetch immediately
        getAllVaultsData();
        // run subsequent fetches on an interval
        const period = isUserIdle ? 600000 : 60000; // 10 minutes while idle, 1 minute while active
        const interval = setInterval(getAllVaultsData, period);
        // clear the interval when this component dismounts
        return () => clearInterval(interval);
    }, [isAccountOrVaultRoute, isUserIdle, chainId]);

    useEffect(() => {
        // also run the user data fetch after a receipt is received
        if (sessionReceipts.length === 0 || !isVaultSupportedOnNetwork) return;
        getUserVaultData();
        // and repeat after a delay
        const t1 = setTimeout(() => {
            getUserVaultData();
        }, 5000);
        const t2 = setTimeout(() => {
            getUserVaultData();
        }, 15000);
        const t3 = setTimeout(() => {
            getUserVaultData();
        }, 30000);

        setReceiptRefreshTimeouts([t1, t2, t3]);

        // clear the timeouts when this component dismounts
        return () => {
            receiptRefreshTimeouts.forEach((timeout) => clearTimeout(timeout));
        };
    }, [sessionReceipts.length, isVaultSupportedOnNetwork]);

    useEffect(() => {
        // clear the timeouts when the user or chain changes
        receiptRefreshTimeouts.forEach((timeout) => clearTimeout(timeout));
        setReceiptRefreshTimeouts([]);
    }, [userAddress, chainId]);

    useEffect(() => {
        (async () => {
            if (isTradeRoute || isGasPriceFetchManuallyTriggerered) {
                const network = await provider.getNetwork();
                if (Number(network.chainId) !== parseInt(chainId)) {
                    console.warn(
                        `Provider is connected to chain ${network.chainId}, expected ${parseInt(chainId).toString()}`,
                    );
                    return;
                }
                setGasPriceinGwei(undefined);
                const newGasPrice =
                    await supportedNetworks[chainId].getGasPriceInGwei(
                        provider,
                    );
                setGasPriceinGwei(newGasPrice);
                if (isGasPriceFetchManuallyTriggerered) {
                    setIsGasPriceFetchManuallyTriggerered(false);
                }
            }
        })();
    }, [
        chainId,
        provider,
        poolStatsPollingCacheTime,
        isTradeRoute,
        isGasPriceFetchManuallyTriggerered,
    ]);

    const pollBlockNum = useCallback(async () => {
        try {
            const lastBlockNumber = await fetchBlockNumber(provider);
            if (lastBlockNumber > 0) {
                setLastBlockNumber(lastBlockNumber);
                setRpcNodeStatus('active');
            } else {
                setRpcNodeStatus('inactive');
            }
        } catch (error) {
            setRpcNodeStatus('inactive');
        }
    }, [provider]);

    useEffect(() => {
        if (!isUserOnline) return;
        // Grab block right away, then poll on periodic basis; useful for initial load
        pollBlockNum();

        const interval = setInterval(() => {
            pollBlockNum();
        }, BLOCK_NUM_POLL_MS);

        // Clean up the interval when the component unmounts or when dependencies change
        return () => clearInterval(interval);
    }, [isUserOnline, chainId, BLOCK_NUM_POLL_MS, provider]);

    const [gcgoPoolList, setGcgoPoolList] = useState<PoolIF[] | undefined>();

    async function fetchGcgoPoolList(): Promise<void> {
        try {
            const gcgoPoolList: Promise<PoolIF[]> = cachedAllPoolStatsFetch(
                chainId,
                gcgo,
                poolStatsPollingCacheTime,
                true,
            );

            Promise.resolve<PoolIF[]>(gcgoPoolList)
                .then((res: PoolIF[]) => {
                    if (res) {
                        return res
                            .map((result: PoolIF) => {
                                const baseToken: TokenIF | undefined =
                                    tokens.getTokenByAddress(result.base);
                                const quoteToken: TokenIF | undefined =
                                    tokens.getTokenByAddress(result.quote);
                                if (baseToken && quoteToken) {
                                    return {
                                        ...result, // Spreads all properties of result
                                        baseToken, // Overwrite base with the mapped token
                                        quoteToken, // Overwrite quote with the mapped token
                                    };
                                } else {
                                    return null;
                                }
                            })
                            .filter(
                                (pool: PoolIF | null) => pool !== null,
                            ) as PoolIF[];
                    } else {
                        setGcgoPoolList([]);
                    }
                })
                .then((pools) => {
                    setGcgoPoolList(pools);
                })
                .catch((err) => console.error(err));
        } catch (error) {
            console.log({ error });
        }
    }

    const analyticsPoolList: PoolIF[] | undefined = usePoolList(crocEnv);
    useEffect(() => {
        if (analyticsPoolList) {
            setIsAnalyticsPoolListDefinedOrUnavailable(true);
            return; // Exit early to prevent setting a timeout
        }

        const timer = setTimeout(
            () => setIsAnalyticsPoolListDefinedOrUnavailable(true),
            2000,
        ); // Flip after 2s

        return () => clearTimeout(timer); // Cleanup if component unmounts early
    }, [analyticsPoolList]);

    const isAnalyticsPoolListUnavailable =
        (analyticsPoolList === undefined || analyticsPoolList.length === 0) &&
        isAnalyticsPoolListDefinedOrUnavailable;

    useEffect(() => {
        if (chainId && gcgo && isUserOnline && isAnalyticsPoolListUnavailable) {
            fetchGcgoPoolList();
        }
    }, [
        chainId,
        poolStatsPollingCacheTime,
        isUserOnline,
        tokens.getTokenByAddress,
        isAnalyticsPoolListUnavailable,
    ]);

    const activePoolList = useMemo(() => {
        return analyticsPoolList && analyticsPoolList.length
            ? analyticsPoolList
            : gcgoPoolList && gcgoPoolList.length
              ? gcgoPoolList
              : undefined;
    }, [gcgoPoolList, analyticsPoolList]);

    // used to trigger token balance refreshes every 5 minutes
    const everyFiveMinutes = Math.floor(Date.now() / 300000);
    const everyFiveSeconds = Math.floor(Date.now() / 5000);

    useEffect(() => {
        const nftLocalData = localStorage.getItem('user_nft_data');

        const actionKey = userAddress;

        const localNftDataParsed = nftLocalData
            ? new Map(JSON.parse(nftLocalData))
            : undefined;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nftDataMap = localNftDataParsed?.get(actionKey) as any;

        const isOverTimeLimit =
            nftDataMap &&
            moment(Date.now()).diff(moment(nftDataMap.lastFetchTime), 'days') >=
                7;

        if (
            isUserOnline &&
            (isfetchNftTriggered ||
                !nftLocalData ||
                isOverTimeLimit ||
                (localNftDataParsed && !localNftDataParsed.has(actionKey)))
        ) {
            (async () => {
                if (crocEnv && isUserConnected && userAddress && chainId) {
                    try {
                        const fetchFunction = isfetchNftTriggered
                            ? fetchNFT
                            : cachedFetchNFT;

                        const NFTResponse = await fetchFunction(
                            nftTestWalletAddress !== ''
                                ? nftTestWalletAddress
                                : userAddress,
                            crocEnv,
                            NFTFetchSettings.pageKey,
                            NFTFetchSettings.pageSize,
                        );

                        if (NFTResponse !== undefined) {
                            const NFTData = NFTResponse.NFTData;

                            const pageKey = NFTResponse.pageKey;

                            const userHasNFT = NFTResponse.userHasNFT;

                            setNFTFetchSettings({
                                pageSize: NFTFetchSettings.pageSize,
                                pageKey: pageKey ? pageKey : '',
                            });

                            const nftImgArray: Array<NftDataIF> = [];

                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            NFTData.map((nftData: any) => {
                                if (
                                    nftData.collection.name !==
                                    'ENS: Ethereum Name Service'
                                ) {
                                    nftImgArray.push({
                                        contractAddress:
                                            nftData.contract.address,
                                        contractName: nftData.contract.name,
                                        thumbnailUrl:
                                            nftData.image.thumbnailUrl,
                                        cachedUrl: nftData.image.cachedUrl,
                                    });
                                }
                            });

                            const nftDataMap = localNftDataParsed
                                ? localNftDataParsed
                                : new Map<string, Array<NftListByChain>>();

                            const mapValue: Array<NftListByChain> = [];

                            mapValue.push({
                                chainId: chainId,
                                totalNFTCount: NFTResponse.totalNFTCount,
                                userHasNFT: userHasNFT,
                                data: nftImgArray,
                            });

                            const mapWithFetchTime = {
                                lastFetchTime: Date.now(),
                                mapValue: mapValue,
                            };

                            nftDataMap.set(actionKey, mapWithFetchTime);

                            localStorage.setItem(
                                'user_nft_data',
                                JSON.stringify(Array.from(nftDataMap)),
                            );

                            setNFTData(mapValue);
                            setIsfetchNftTriggered(() => false);
                            setNftTestWalletAddress(() => '');
                        }
                    } catch (error) {
                        console.error({ error });
                        setIsfetchNftTriggered(() => false);
                    }
                }
            })();
        } else {
            if (localNftDataParsed && localNftDataParsed.has(actionKey)) {
                if (nftDataMap) {
                    setNFTData(() => nftDataMap.mapValue as NftListByChain[]);
                }
            }
        }
    }, [
        isUserOnline,
        crocEnv,
        isUserConnected,
        userAddress,
        chainId,
        isfetchNftTriggered,
    ]);

    useEffect(() => {
        (async () => {
            if (
                (isAccountRoute || isTokenBalanceFetchManuallyTriggerered) &&
                crocEnv &&
                userAddress &&
                (await crocEnv.context).chain.chainId === chainId
            ) {
                try {
                    const combinedBalances: TokenIF[] = [];
                    // Run both API calls concurrently
                    const [ambientListWalletBalances, dexBalancesFromCache] =
                        await Promise.all([
                            cachedFetchAmbientListWalletBalances({
                                address: userAddress,
                                chain: chainId,
                                crocEnv: crocEnv,
                                ackTokens: tokens.ackTokens,
                                _refreshTime: everyFiveSeconds,
                            }),
                            cachedFetchDexBalances({
                                address: userAddress,
                                chain: chainId,
                                crocEnv: crocEnv,
                                gcgo,
                                _refreshTime: everyFiveSeconds,
                            }),
                        ]);

                    if (ambientListWalletBalances) {
                        combinedBalances.push(...ambientListWalletBalances);
                    }

                    if (dexBalancesFromCache !== undefined) {
                        // Run expandTokenBalances concurrently for all tokens
                        const expandedTokenBalances = await Promise.all(
                            dexBalancesFromCache.map((tokenBalances) =>
                                expandTokenBalances(
                                    tokenBalances,
                                    tokens.tokenUniv,
                                    cachedTokenDetails,
                                    crocEnv,
                                    chainId,
                                ),
                            ),
                        );

                        expandedTokenBalances.forEach((newToken, index) => {
                            const tokenBalances = dexBalancesFromCache[index];
                            const indexOfExistingToken =
                                combinedBalances.findIndex(
                                    (existingToken) =>
                                        existingToken.address.toLowerCase() ===
                                        tokenBalances.tokenAddress.toLowerCase(),
                                );

                            if (indexOfExistingToken === -1) {
                                combinedBalances.push({ ...newToken });
                            } else {
                                combinedBalances[indexOfExistingToken] = {
                                    ...combinedBalances[indexOfExistingToken],
                                    dexBalance: newToken.dexBalance,
                                };
                            }
                        });
                    }

                    const tokensWithLogos = combinedBalances
                        .filter(
                            (t) =>
                                !hiddenTokens.some(
                                    (excluded) =>
                                        excluded.address.toLowerCase() ===
                                            t.address.toLowerCase() &&
                                        excluded.chainId === t.chainId,
                                ),
                        )
                        .map((token) => {
                            const oldToken: TokenIF | undefined =
                                tokens.getTokenByAddress(token.address);
                            return {
                                ...token,
                                decimals:
                                    oldToken?.decimals || token.decimals || 18,
                                name: oldToken?.name || token.name || '',
                                logoURI:
                                    oldToken?.logoURI || token.logoURI || '',
                                symbol: oldToken?.symbol || token.symbol || '',
                            };
                        });

                    setTokenBalances(tokensWithLogos);
                    if (isTokenBalanceFetchManuallyTriggerered) {
                        setIsTokenBalanceFetchManuallyTriggerered(false);
                    }
                } catch (error) {
                    if (error instanceof Error) {
                        console.error(error.message); // Prints the error message
                        console.error(error.stack); // Prints the stack trace
                    } else {
                        console.error('Unknown error', error);
                    }
                }
            }
        })();
    }, [
        crocEnv,
        userAddress,
        chainId,
        everyFiveMinutes,
        sessionReceipts.length,
        isAccountRoute,
        isTokenBalanceFetchManuallyTriggerered,
    ]);

    const [nativeTokenUsdPrice, setNativeTokenUsdPrice] = useState<
        number | undefined
    >();

    useEffect(() => {
        Promise.resolve(cachedFetchTokenPrice(ZERO_ADDRESS, chainId)).then(
            (response) => {
                setNativeTokenUsdPrice(response?.usdPrice);
            },
        );
    }, [chainId, everyFiveMinutes]);

    const [connectedUserXp, setConnectedUserXp] = useState<UserXpDataIF>({
        dataReceived: false,
        data: undefined,
    });

    const [connectedUserBlastXp, setConnectedUserBlastXp] =
        useState<BlastUserXpDataIF>({
            dataReceived: false,
            data: undefined,
        });

    useEffect(() => {
        if (isUserOnline) {
            if (userAddress) {
                fetchUserXpData({
                    user: userAddress,
                    chainId: chainId,
                })
                    .then((data) => {
                        setConnectedUserXp({
                            dataReceived: true,
                            data: data,
                        });
                    })
                    .catch((error) => {
                        console.error(error);
                        setConnectedUserXp({
                            dataReceived: false,
                            data: undefined,
                        });
                    });

                if (isActiveNetworkBlast) {
                    fetchBlastUserXpData({
                        user: userAddress,
                        chainId: chainId,
                    })
                        .then((data) => {
                            setConnectedUserBlastXp({
                                dataReceived: true,
                                data: data,
                            });
                        })
                        .catch((error) => {
                            console.error(error);
                            setConnectedUserBlastXp({
                                dataReceived: false,
                                data: undefined,
                            });
                        });
                }
            } else {
                setConnectedUserXp({
                    dataReceived: false,
                    data: undefined,
                });
                setConnectedUserBlastXp({
                    dataReceived: false,
                    data: undefined,
                });
            }
        }
    }, [isUserOnline, userAddress, isActiveNetworkBlast]);

    const mainnetCrocEnv = useMemo(
        () =>
            mainnetProvider
                ? new CrocEnv(mainnetProvider, undefined)
                : undefined,
        [mainnetProvider !== undefined],
    );

    const scrollCrocEnv = useMemo(
        () =>
            scrollProvider ? new CrocEnv(scrollProvider, undefined) : undefined,
        [scrollProvider !== undefined],
    );

    const swellCrocEnv = useMemo(
        () =>
            swellProvider ? new CrocEnv(swellProvider, undefined) : undefined,
        [swellProvider !== undefined],
    );

    const blastCrocEnv = useMemo(
        () =>
            blastProvider ? new CrocEnv(blastProvider, undefined) : undefined,
        [blastProvider !== undefined],
    );

    const plumeCrocEnv = useMemo(
        () =>
            plumeProvider ? new CrocEnv(plumeProvider, undefined) : undefined,
        [plumeProvider !== undefined],
    );

    // Helper to update stats and cache them
    const updateStats = useCallback(
        (tvl: number, volume: number, fees: number) => {
            const tvlStr = getFormattedNumber({
                value: tvl,
                prefix: '$',
                isTvl: true,
                mantissa: 1,
            });
            const volumeStr = getFormattedNumber({
                value: volume,
                prefix: '$',
                mantissa: 1,
            });
            const feesStr = getFormattedNumber({
                value: fees,
                prefix: '$',
                mantissa: 1,
            });

            setTotalTvlString(tvlStr);
            setTotalVolumeString(volumeStr);
            setTotalFeesString(feesStr);

            // Cache to localStorage
            try {
                localStorage.setItem(
                    'ambient_dex_stats',
                    JSON.stringify({
                        tvl: tvlStr,
                        volume: volumeStr,
                        fees: feesStr,
                        timestamp: Date.now(),
                    }),
                );
            } catch {
                // Ignore storage errors
            }
        },
        [],
    );

    useEffect(() => {
        if (!showDexStats) return;

        // Track running totals
        let tvlTotalUsd = 0;
        let volumeTotalUsd = 0;
        let feesTotalUsd = 0;
        let resultsReceived = 0;
        const numChainsToAggregate = 5;

        const handleChainStats = (
            dexStats:
                | {
                      tvlTotalUsd: number;
                      volumeTotalUsd: number;
                      feesTotalUsd: number;
                  }
                | undefined,
        ) => {
            if (!dexStats) return;

            tvlTotalUsd += dexStats.tvlTotalUsd;
            volumeTotalUsd += dexStats.volumeTotalUsd;
            feesTotalUsd += dexStats.feesTotalUsd;
            resultsReceived += 1;

            // Only update stats when all chains have completed
            // to ensure we show accurate totals (not partial sums)
            if (resultsReceived === numChainsToAggregate) {
                updateStats(tvlTotalUsd, volumeTotalUsd, feesTotalUsd);
            }
        };

        // Fetch all chains in parallel
        const chainConfigs = [
            {
                chainId: '0x1',
                env: mainnetCrocEnv,
                gcgo: ethereumMainnet.gcgo,
                tokenCount: 10,
            },
            {
                chainId: '0x82750',
                env: scrollCrocEnv,
                gcgo: scrollMainnet.gcgo,
                tokenCount: 20,
            },
            {
                chainId: '0x783',
                env: swellCrocEnv,
                gcgo: swellMainnet.gcgo,
                tokenCount: 10,
            },
            {
                chainId: '0x13e31',
                env: blastCrocEnv,
                gcgo: blastMainnet.gcgo,
                tokenCount: 10,
            },
            {
                chainId: '0x18232',
                env: plumeCrocEnv,
                gcgo: plumeMainnet.gcgo,
                tokenCount: 10,
            },
        ];

        chainConfigs.forEach(({ chainId: cId, env, gcgo, tokenCount }) => {
            if (!env) return;
            getChainStats(
                'cumulative',
                cId,
                env,
                gcgo,
                cachedFetchTokenPrice,
                tokenCount,
                activePoolList,
                AMBIENT_TOKEN_LIST,
            ).then(handleChainStats);
        });
    }, [
        showDexStats,
        mainnetCrocEnv !== undefined,
        scrollCrocEnv !== undefined,
        swellCrocEnv !== undefined,
        blastCrocEnv !== undefined,
        plumeCrocEnv !== undefined,
        updateStats,
    ]);

    const chainDataContext = {
        lastBlockNumber,
        setLastBlockNumber,
        rpcNodeStatus,
        gasPriceInGwei,
        connectedUserXp,
        connectedUserBlastXp,
        setGasPriceinGwei,
        isActiveNetworkBlast,
        isActiveNetworkPlume,
        isActiveNetworkSwell,
        isActiveNetworkBase,
        isActiveNetworkMonad,
        isActiveNetworkScroll,
        isActiveNetworkMainnet,
        isVaultSupportedOnNetwork,
        isActiveNetworkL2,
        gcgoPoolList,
        nativeTokenUsdPrice,
        allVaultsData,
        setAllVaultsData,
        totalTvlString,
        totalVolumeString,
        totalFeesString,
        analyticsPoolList,
        setIsTokenBalanceFetchManuallyTriggerered,
        setIsGasPriceFetchManuallyTriggerered,
        isAnalyticsPoolListDefinedOrUnavailable,
        activePoolList,
        vaultsOnCurrentChain,
    };

    return (
        <ChainDataContext.Provider value={chainDataContext}>
            {props.children}
        </ChainDataContext.Provider>
    );
};
