import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { fetchRecords, fetchUserRecentChanges } from '../ambient-utils/api';
import { getPositionHash } from '../ambient-utils/dataLayer/functions/getPositionHash';
import {
    LimitOrderIF,
    LiquidityDataIF,
    PositionIF,
    RecordType,
    TransactionIF,
} from '../ambient-utils/types';
import useGenFakeTableRow from '../components/Trade/InfiniteScroll/useGenFakeTableRow';
import { AppStateContext } from './AppStateContext';
import { CachedDataContext } from './CachedDataContext';
import { ChainDataContext } from './ChainDataContext';
import { CrocEnvContext } from './CrocEnvContext';
import { DataLoadingContext } from './DataLoadingContext';
import {
    PositionUpdateIF,
    ReceiptContext,
    TransactionByType,
} from './ReceiptContext';
import { TokenContext } from './TokenContext';
import { TradeDataContext } from './TradeDataContext';
import { UserDataContext } from './UserDataContext';

export interface Changes {
    dataReceived: boolean;
    changes: Array<TransactionIF>;
}

interface PositionsByUser {
    dataReceived: boolean;
    positions: Array<PositionIF>;
}
interface LimitOrdersByUser {
    dataReceived: boolean;
    limitOrders: LimitOrderIF[];
}
export interface PositionsByPool {
    dataReceived: boolean;
    positions: Array<PositionIF>;
}
export interface LimitOrdersByPool {
    dataReceived: boolean;
    limitOrders: LimitOrderIF[];
}
interface PoolRequestParams {
    baseAddress: string;
    quoteAddress: string;
    poolIndex: number;
    chainId: string;
}

export type RecentlyUpdatedPositionStatus = 'pending' | 'onchain' | 'indexed';

export type RecentlyUpdatedPositionIF = {
    positionHash: string;
    timestamp: number;
    position?: LimitOrderIF | PositionIF;
    type: string;
    action: string;
    status: RecentlyUpdatedPositionStatus;
    txByType?: TransactionByType;
    currentLiquidity?: bigint | undefined;
    isSuccess?: boolean;
    prevPositionHash?: string;
};

export interface GraphDataContextIF {
    positionsByUser: PositionsByUser;
    limitOrdersByUser: LimitOrdersByUser;
    transactionsByUser: Changes;
    userTransactionsByPool: Changes;
    unindexedNonFailedSessionTransactionHashes: string[];
    unindexedNonFailedSessionPositionUpdates: PositionUpdateIF[];
    unindexedNonFailedSessionLimitOrderUpdates: PositionUpdateIF[];
    transactionsByPool: Changes;
    userPositionsByPool: PositionsByPool;
    positionsByPool: PositionsByPool;
    userLimitOrdersByPool: LimitOrdersByPool;
    limitOrdersByPool: LimitOrdersByPool;
    liquidityData: LiquidityDataIF | undefined;
    liquidityFee: number | undefined;

    setLiquidity: (
        liqData: LiquidityDataIF,
        request: PoolRequestParams | undefined,
    ) => void;
    setLiquidityFee: React.Dispatch<React.SetStateAction<number | undefined>>;
    setTransactionsByPool: React.Dispatch<React.SetStateAction<Changes>>;
    setTransactionsByUser: React.Dispatch<React.SetStateAction<Changes>>;
    setUserTransactionsByPool: React.Dispatch<React.SetStateAction<Changes>>;
    setUserPositionsByPool: React.Dispatch<
        React.SetStateAction<PositionsByPool>
    >;
    setPositionsByPool: React.Dispatch<React.SetStateAction<PositionsByPool>>;
    setUserLimitOrdersByPool: React.Dispatch<
        React.SetStateAction<LimitOrdersByPool>
    >;
    setLimitOrdersByPool: React.Dispatch<
        React.SetStateAction<LimitOrdersByPool>
    >;
    resetUserGraphData: () => void;
    recentlyUpdatedPositions: RecentlyUpdatedPositionIF[];
    pendingRecentlyUpdatedPositions: RecentlyUpdatedPositionIF[];
    removeFromRecentlyUpdatedPositions: (positionHash: string) => void;
    prevPositionHashes: Set<string>;
    handleIndexedPosition: (positionHash: string) => void;
}

function normalizeAddr(addr: string): string {
    const caseAddr = addr.toLowerCase();
    return caseAddr.startsWith('0x') ? caseAddr : '0x' + caseAddr;
}

export const GraphDataContext = createContext({} as GraphDataContextIF);

export const GraphDataContextProvider = (props: { children: ReactNode }) => {
    const {
        activeNetwork: { gcgo, chainId, poolIndex, isTestnet },
        server: { isEnabled: isServerEnabled },
        isUserIdle,
        isUserOnline,
        isTradeRoute,
        isAccountRoute,
    } = useContext(AppStateContext);
    const { baseToken, quoteToken } = useContext(TradeDataContext);
    const {
        pendingTransactions,
        allReceipts,
        sessionPositionUpdates,
        transactionsByTypeIfs,
    } = useContext(ReceiptContext);
    const { activePoolList } = useContext(ChainDataContext);
    const { setDataLoadingStatus } = useContext(DataLoadingContext);
    const { cachedQuerySpotPrice, cachedFetchTokenPrice, cachedTokenDetails } =
        useContext(CachedDataContext);
    const { crocEnv, provider } = useContext(CrocEnvContext);
    const { tokens } = useContext(TokenContext);
    const { userAddress: userDefaultAddress, isUserConnected } =
        useContext(UserDataContext);
    const { genFakeLimitOrder, genFakePosition } = useGenFakeTableRow();

    const [positionsByUser, setPositionsByUser] = useState<PositionsByUser>({
        dataReceived: false,
        positions: [],
    });
    const [limitOrdersByUser, setLimitOrdersByUser] =
        useState<LimitOrdersByUser>({
            dataReceived: false,
            limitOrders: [],
        });
    const [transactionsByUser, setTransactionsByUser] = useState<Changes>({
        dataReceived: false,
        changes: [],
    });
    const [userPositionsByPool, setUserPositionsByPool] =
        useState<PositionsByPool>({
            dataReceived: false,
            positions: [],
        });
    const [userTransactionsByPool, setUserTransactionsByPool] =
        useState<Changes>({
            dataReceived: false,
            changes: [],
        });

    const [positionsByPool, setPositionsByPool] = useState<PositionsByPool>({
        dataReceived: false,
        positions: [],
    });
    const [transactionsByPool, setTransactionsByPool] = useState<Changes>({
        dataReceived: false,
        changes: [],
    });

    const [userLimitOrdersByPool, setUserLimitOrdersByPool] =
        useState<LimitOrdersByPool>({
            dataReceived: false,
            limitOrders: [],
        });
    const [limitOrdersByPool, setLimitOrdersByPool] =
        useState<LimitOrdersByPool>({
            dataReceived: false,
            limitOrders: [],
        });

    const [liquidityData, setLiquidityData] = useState<
        LiquidityDataIF | undefined
    >(undefined);

    const [liquidityFee, setLiquidityFee] = useState<number | undefined>();

    const [recentlyUpdatedPositions, setRecentlyUpdatedPositions] = useState<
        RecentlyUpdatedPositionIF[]
    >([]);

    const [
        pendingRecentlyUpdatedPositions,
        setPendingRecentlyUpdatedPositions,
    ] = useState<RecentlyUpdatedPositionIF[]>([]);
    const pendingRecentlyUpdatedPositionsRef = useRef<
        RecentlyUpdatedPositionIF[]
    >([]);

    const [prevPositionHashes, setPrevPositionHashes] = useState<Set<string>>(
        new Set(),
    );

    pendingRecentlyUpdatedPositionsRef.current =
        pendingRecentlyUpdatedPositions;

    const recentlyUpdatedPositionsRef = useRef<RecentlyUpdatedPositionIF[]>([]);
    recentlyUpdatedPositionsRef.current = recentlyUpdatedPositions;

    const userAddress = userDefaultAddress;

    const resetUserGraphData = () => {
        setPositionsByUser({
            dataReceived: false,
            positions: [],
        });
        setLimitOrdersByUser({
            dataReceived: false,
            limitOrders: [],
        });
        setTransactionsByUser({
            dataReceived: false,
            changes: [],
        });
        setUserPositionsByPool({
            dataReceived: false,
            positions: [],
        });
        setUserLimitOrdersByPool({
            dataReceived: false,
            limitOrders: [],
        });
        setUserTransactionsByPool({
            dataReceived: false,
            changes: [],
        });
        setSessionTransactionHashes([]);
    };

    const resetPoolGraphData = () => {
        setTransactionsByPool({
            dataReceived: false,
            changes: [],
        });
        setPositionsByPool({
            dataReceived: false,
            positions: [],
        });
        setLimitOrdersByPool({
            dataReceived: false,
            limitOrders: [],
        });
    };

    const setLiquidity = (
        liqData: LiquidityDataIF,
        request: PoolRequestParams | undefined,
    ) => {
        // Sanitize the raw result from the backend
        const base = normalizeAddr(liqData.curveState.base);
        const quote = normalizeAddr(liqData.curveState.quote);
        const chainId = liqData.curveState.chainId;
        const curveState = { ...liqData.curveState, base, quote, chainId };

        // Verify that the result matches the current request in case multiple are in-flight
        if (
            request?.baseAddress.toLowerCase() === base &&
            request?.quoteAddress.toLowerCase() === quote &&
            request?.poolIndex === liqData.curveState.poolIdx &&
            request?.chainId === chainId
        ) {
            setLiquidityData({ ...liqData, curveState });
        } else {
            console.warn(
                'Discarding mismatched liquidity curve request',
                base,
                quote,
                chainId,
            );
        }
    };

    const [sessionTransactionHashes, setSessionTransactionHashes] = useState<
        string[]
    >([]);

    useEffect(() => {
        if (isUserOnline) {
            resetUserGraphData();
        }
    }, [userAddress]);

    useEffect(() => {
        if (isUserOnline) {
            resetPoolGraphData();
        }
    }, [baseToken.address + quoteToken.address]);

    useEffect(() => {
        setUserPositionsByPool({
            dataReceived: false,
            positions: [],
        });
        setUserLimitOrdersByPool({
            dataReceived: false,
            limitOrders: [],
        });
        setUserTransactionsByPool({
            dataReceived: false,
            changes: [],
        });
    }, [baseToken.address + quoteToken.address]);

    const txsByUserHashSet = useMemo(
        () =>
            new Set(
                transactionsByUser.changes
                    .concat(userTransactionsByPool.changes)
                    .map((change) => change.txHash.trim().toLowerCase()),
            ),
        [transactionsByUser.changes, userTransactionsByPool.changes],
    );

    const positionsByUserIndexUpdateArray: PositionUpdateIF[] = useMemo(
        () =>
            positionsByUser.positions
                .concat(userPositionsByPool.positions)
                .map((position) => {
                    return {
                        positionID: getPositionHash(position),
                        isLimit: false,
                        unixTimeIndexed: position.latestUpdateTime,
                    };
                }),
        [positionsByUser, userPositionsByPool],
    );

    const limitOrdersByUserIndexUpdateArray: PositionUpdateIF[] = useMemo(
        () =>
            limitOrdersByUser.limitOrders
                .concat(userLimitOrdersByPool.limitOrders)
                .map((limitOrder) => {
                    const posHash = getPositionHash(undefined, {
                        isPositionTypeAmbient: false,
                        user: limitOrder.user,
                        baseAddress: limitOrder.base,
                        quoteAddress: limitOrder.quote,
                        poolIdx: limitOrder.poolIdx,
                        bidTick: limitOrder.bidTick,
                        askTick: limitOrder.askTick,
                    });
                    return {
                        positionID: posHash,
                        isLimit: true,
                        unixTimeIndexed: limitOrder.latestUpdateTime,
                    };
                }),
        [limitOrdersByUser, userLimitOrdersByPool],
    );

    useEffect(() => {
        for (let i = 0; i < pendingTransactions.length; i++) {
            const pendingTx = pendingTransactions[i];
            setSessionTransactionHashes((prev) => {
                if (!prev.includes(pendingTx)) {
                    return [pendingTx, ...prev];
                } else return prev;
            });
        }
    }, [pendingTransactions]);

    const unindexedSessionTransactionHashes = sessionTransactionHashes.filter(
        (tx) => !txsByUserHashSet.has(tx.trim().toLowerCase()),
    );

    const failedSessionTransactionHashes = allReceipts
        .filter((r) => r.status === 0)
        .map((r) => r.hash.trim().toLowerCase());

    const unixTimeOffset = 10; // 10s offset needed to account for system clock differences

    // transaction hashes for subsequently fully removed positions
    const removedPositionUpdateTxHashes = useMemo(
        () =>
            sessionPositionUpdates
                .filter((pos1) =>
                    sessionPositionUpdates.some((pos2) => {
                        return (
                            pos1.positionID === pos2.positionID &&
                            pos2.isFullRemoval &&
                            (pos2.unixTimeReceipt || 0) >
                                (pos1.unixTimeAdded || 0)
                        );
                    }),
                )
                .map((removedTx) => removedTx.txHash),
        [sessionPositionUpdates],
    );

    const unindexedNonFailedSessionTransactionHashes = useMemo(
        () =>
            unindexedSessionTransactionHashes.filter(
                (tx) =>
                    !failedSessionTransactionHashes.includes(
                        tx.trim().toLowerCase(),
                    ),
            ),
        [unindexedSessionTransactionHashes, failedSessionTransactionHashes],
    );

    const unindexedNonFailedSessionPositionUpdates = useMemo(
        () =>
            sessionPositionUpdates.filter(
                (positionUpdate) =>
                    positionUpdate.isLimit === false &&
                    !failedSessionTransactionHashes.includes(
                        positionUpdate.txHash?.trim().toLowerCase() ?? '',
                    ) &&
                    !removedPositionUpdateTxHashes.includes(
                        positionUpdate.txHash,
                    ) &&
                    !positionsByUserIndexUpdateArray.some(
                        (userPositionIndexUpdate) =>
                            userPositionIndexUpdate.positionID ===
                                positionUpdate.positionID &&
                            (userPositionIndexUpdate.unixTimeIndexed || 0) +
                                unixTimeOffset >=
                                (positionUpdate.unixTimeAdded || 0),
                    ),
            ),
        [
            sessionPositionUpdates,
            failedSessionTransactionHashes,
            removedPositionUpdateTxHashes,
            positionsByUserIndexUpdateArray,
        ],
    );

    const unindexedNonFailedSessionLimitOrderUpdates = useMemo(
        () =>
            sessionPositionUpdates.filter(
                (positionUpdate) =>
                    positionUpdate.isLimit === true &&
                    !failedSessionTransactionHashes.includes(
                        positionUpdate.txHash?.trim().toLowerCase() ?? '',
                    ) &&
                    !removedPositionUpdateTxHashes.includes(
                        positionUpdate.txHash,
                    ) &&
                    !limitOrdersByUserIndexUpdateArray.some(
                        (userPositionIndexUpdate) =>
                            userPositionIndexUpdate.positionID ===
                                positionUpdate.positionID &&
                            (userPositionIndexUpdate.unixTimeIndexed || 0) +
                                unixTimeOffset >=
                                (positionUpdate.unixTimeAdded || 0),
                    ),
            ),
        [
            sessionPositionUpdates,
            failedSessionTransactionHashes,
            limitOrdersByUserIndexUpdateArray,
        ],
    );

    const addIntoRelevantPositions = (
        relevantLimitOrders: RecentlyUpdatedPositionIF[],
    ) => {
        const positionsMap = new Map();

        relevantLimitOrders.forEach((e) => {
            positionsMap.set(e.positionHash, e);
        });

        const uniqueRelevantLimitOrders = Array.from(positionsMap.values());

        if (recentlyUpdatedPositionsRef.current) {
            setRecentlyUpdatedPositions([
                ...recentlyUpdatedPositionsRef.current.filter(
                    (e) =>
                        !uniqueRelevantLimitOrders.some(
                            (e2) => e2.positionHash === e.positionHash,
                        ),
                ),
                ...uniqueRelevantLimitOrders,
            ]);
        }

        setTimeout(() => {
            handleRedundantPendings(uniqueRelevantLimitOrders);
        }, 300);
    };

    const removeFromRecentlyUpdatedPositions = (positonHash: string) => {
        setRecentlyUpdatedPositions(
            recentlyUpdatedPositionsRef.current.filter(
                (e) => e.positionHash !== positonHash,
            ),
        );
    };

    const addPendingRelevantPosition = (pending: RecentlyUpdatedPositionIF) => {
        setPendingRecentlyUpdatedPositions([
            ...pendingRecentlyUpdatedPositions.filter(
                (e) => pending.positionHash !== e.positionHash,
            ),
            pending,
        ]);
    };

    const handleIndexedPosition = (positionHash: string) => {
        if (pendingRecentlyUpdatedPositionsRef.current) {
            setPendingRecentlyUpdatedPositions(
                pendingRecentlyUpdatedPositionsRef.current.filter(
                    (e) => e.positionHash !== positionHash,
                ),
            );
        }

        // this removal may cause problem once toggle has been switched on Limits and Ranges tabs
        // removeFromRecentlyUpdatedPositions(positionHash);
    };

    const handleRedundantPendings = (pendings: RecentlyUpdatedPositionIF[]) => {
        if (pendingRecentlyUpdatedPositionsRef.current) {
            setPendingRecentlyUpdatedPositions(
                pendingRecentlyUpdatedPositionsRef.current.filter(
                    (e) =>
                        !pendings.some(
                            (pending) =>
                                pending.positionHash === e.positionHash,
                        ),
                ),
            );
        }
    };

    const getPositionHashForTxByType = (tbt: TransactionByType) => {
        const posHashObject = {
            isPositionTypeAmbient: tbt.txDetails?.isAmbient || false,
            user: tbt.userAddress.toLowerCase(),
            baseAddress: tbt.txDetails?.baseAddress.toLowerCase() || '',
            quoteAddress: tbt.txDetails?.quoteAddress.toLowerCase() || '',
            poolIdx: tbt.txDetails?.poolIdx || 0,
            bidTick: tbt.txDetails?.lowTick || 0,
            askTick: tbt.txDetails?.highTick || 0,
        };

        return getPositionHash(undefined, posHashObject);
    };

    const tempBool = false;

    useEffect(() => {
        if (tempBool) return;

        const relevantLimitOrders = transactionsByTypeIfs.filter(
            (tx) =>
                !tx.isRemoved &&
                unindexedNonFailedSessionLimitOrderUpdates.some(
                    (update) => update.txHash === tx.txHash,
                ) &&
                tx.userAddress.toLowerCase() ===
                    (userAddress || '').toLowerCase() &&
                tx.txDetails?.baseAddress.toLowerCase() ===
                    baseToken.address.toLowerCase() &&
                tx.txDetails?.quoteAddress.toLowerCase() ===
                    quoteToken.address.toLowerCase() &&
                tx.txDetails?.poolIdx === poolIndex &&
                tx.txType === 'Limit',
        );

        relevantLimitOrders.forEach((tx) => {
            addPendingRelevantPosition({
                positionHash: getPositionHashForTxByType(tx),
                timestamp: Math.floor(new Date().getTime() / 1000),
                type: 'Limit',
                action: tx.txAction || '',
                status: 'pending',
                txByType: tx,
            });
        });

        Promise.all(
            relevantLimitOrders.map((tx) => genFakeLimitOrder(tx)),
        ).then((rows) => {
            addIntoRelevantPositions(rows);
        });
    }, [
        unindexedNonFailedSessionLimitOrderUpdates.length,
        transactionsByTypeIfs.length,
    ]);

    useEffect(() => {
        if (tempBool) return;

        const relevantPositions = transactionsByTypeIfs.filter(
            (tx) =>
                !tx.isRemoved &&
                unindexedNonFailedSessionPositionUpdates.some(
                    (update) => update.txHash === tx.txHash,
                ) &&
                tx.userAddress.toLowerCase() ===
                    (userAddress || '').toLowerCase() &&
                tx.txDetails?.baseAddress.toLowerCase() ===
                    baseToken.address.toLowerCase() &&
                tx.txDetails?.quoteAddress.toLowerCase() ===
                    quoteToken.address.toLowerCase() &&
                tx.txDetails?.poolIdx === poolIndex &&
                tx.txType === 'Range',
        );

        relevantPositions.forEach((tx) => {
            addPendingRelevantPosition({
                positionHash: getPositionHashForTxByType(tx),
                timestamp: Math.floor(new Date().getTime() / 1000),
                type: 'Range',
                action: tx.txAction || '',
                status: 'pending',
                txByType: tx,
            });
        });

        Promise.all(relevantPositions.map((tx) => genFakePosition(tx))).then(
            (rows) => {
                addIntoRelevantPositions(rows);

                rows.filter((row) => row.isSuccess).map((e) => {
                    if (e.prevPositionHash) {
                        const prevPosHash = e.prevPositionHash;
                        setPrevPositionHashes((prev) => {
                            prev.add(prevPosHash);
                            return prev;
                        });
                    }
                    if (e.type === 'Add') {
                        const hash = e.positionHash;
                        setPrevPositionHashes((prev) => {
                            prev.delete(hash);
                            return prev;
                        });
                    }
                });
            },
        );
    }, [
        unindexedNonFailedSessionPositionUpdates.length,
        transactionsByTypeIfs.length,
    ]);

    const onAccountRoute = location.pathname.includes('account');

    const userDataByPoolLength = useMemo(
        () =>
            transactionsByUser.changes.length +
            userLimitOrdersByPool.limitOrders.length +
            userPositionsByPool.positions.length,
        [transactionsByUser, userLimitOrdersByPool, userPositionsByPool],
    );

    useEffect(() => {
        const fetchData = async () => {
            // This useEffect controls a series of other dispatches that fetch data on update of the user object
            // user Postions, limit orders, and recent changes are all governed here
            if (
                !activePoolList ||
                (!isTradeRoute && !isAccountRoute) ||
                !isUserOnline ||
                !isServerEnabled ||
                !isUserConnected ||
                !userAddress ||
                !crocEnv ||
                !provider ||
                !tokens.tokenUniv.length ||
                !chainId ||
                (await crocEnv.context).chain.chainId !== chainId
            ) {
                return;
            }
            const recordTargets = [RecordType.Position, RecordType.LimitOrder];
            for (let i = 0; i < recordTargets.length; i++) {
                try {
                    const updatedLedger = await fetchRecords({
                        recordType: recordTargets[i],
                        user: userAddress,
                        chainId: chainId,
                        gcgo: gcgo,
                        provider,
                        tokenUniv: tokens.tokenUniv,
                        crocEnv,
                        activePoolList,
                        isTestnet,
                        cachedFetchTokenPrice,
                        cachedQuerySpotPrice,
                        cachedTokenDetails,
                    });

                    if (recordTargets[i] == RecordType.Position) {
                        setPositionsByUser({
                            dataReceived: true,
                            positions: updatedLedger as PositionIF[],
                        });
                        setDataLoadingStatus({
                            datasetName: 'isConnectedUserRangeDataLoading',
                            loadingStatus: false,
                        });
                    } else {
                        // default user_positions
                        (setLimitOrdersByUser({
                            dataReceived: true,
                            limitOrders: updatedLedger as LimitOrderIF[],
                        }),
                            setDataLoadingStatus({
                                datasetName: 'isConnectedUserOrderDataLoading',
                                loadingStatus: false,
                            }));
                    }
                } catch (error) {
                    console.error(error);
                }
            }

            try {
                fetchUserRecentChanges({
                    tokenList: tokens.tokenUniv,
                    user: userAddress,
                    chainId: chainId,
                    crocEnv: crocEnv,
                    gcgo: gcgo,
                    provider,
                    n: 200,
                    activePoolList,
                    cachedFetchTokenPrice: cachedFetchTokenPrice,
                    cachedQuerySpotPrice: cachedQuerySpotPrice,
                    cachedTokenDetails: cachedTokenDetails,
                })
                    .then((updatedTransactions) => {
                        if (updatedTransactions) {
                            const userTransactionsWithoutFills =
                                updatedTransactions.filter(
                                    (tx) => tx.changeType !== 'cross',
                                );
                            setTransactionsByUser({
                                dataReceived: true,
                                changes: userTransactionsWithoutFills,
                            });
                        }

                        setDataLoadingStatus({
                            datasetName: 'isConnectedUserTxDataLoading',
                            loadingStatus: false,
                        });
                    })
                    .catch(console.error);
            } catch (error) {
                console.error;
            }
        };
        fetchData();
    }, [
        activePoolList,
        isTradeRoute || isAccountRoute,
        isUserOnline,
        isServerEnabled,
        tokens.tokenUniv.length,
        isUserConnected,
        userAddress,
        chainId,
        isUserIdle
            ? Math.floor(Date.now() / (onAccountRoute ? 60000 : 120000))
            : Math.floor(Date.now() / (onAccountRoute ? 15000 : 60000)), // cache every 15 seconds while viewing portfolio, otherwise 1 minute
        crocEnv,
        provider,
        userDataByPoolLength,
        allReceipts.length,
    ]);

    const graphDataContext: GraphDataContextIF = {
        positionsByUser,
        limitOrdersByUser,
        transactionsByUser,
        userPositionsByPool,
        userTransactionsByPool,
        unindexedNonFailedSessionTransactionHashes,
        unindexedNonFailedSessionPositionUpdates,
        unindexedNonFailedSessionLimitOrderUpdates,
        resetUserGraphData,
        setTransactionsByUser,
        setUserPositionsByPool,
        setUserTransactionsByPool,
        positionsByPool,
        setPositionsByPool,
        transactionsByPool,
        setTransactionsByPool,
        userLimitOrdersByPool,
        setUserLimitOrdersByPool,
        limitOrdersByPool,
        setLimitOrdersByPool,
        liquidityData,
        setLiquidity,
        liquidityFee,
        setLiquidityFee,
        recentlyUpdatedPositions,
        pendingRecentlyUpdatedPositions,
        removeFromRecentlyUpdatedPositions,
        prevPositionHashes,
        handleIndexedPosition,
    };

    return (
        <GraphDataContext.Provider value={graphDataContext}>
            {props.children}
        </GraphDataContext.Provider>
    );
};
