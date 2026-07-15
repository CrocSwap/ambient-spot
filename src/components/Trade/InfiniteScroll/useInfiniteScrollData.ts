import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { LimitOrderIF } from '../../../ambient-utils/types/limitOrder';
import { PositionIF } from '../../../ambient-utils/types/position';
import { TransactionIF } from '../../../ambient-utils/types/transaction';
import useInfiniteScrollFetchers from './useInfiniteScrollFetchers';
import useMergeWithPendingTxs from './useMergeWithPendingTxs';
import {
    dedupeById,
    oldestTime,
    recordId,
    TableRecord,
    TableType,
    TxFetchType,
} from './virtualTableHelpers';

interface propsIF {
    type: TableType;
    // Live "head" of the list, already sorted, sourced from the GraphData
    // contexts. New/updated records flow in here and are merged at the top.
    data: TableRecord[];
    fetchCount: number;
    targetCount: number;
    sortData?: (data: TableRecord[]) => TableRecord[];
    sortBy: string;
    reverseSort: boolean;
    showAllData: boolean;
    componentLock?: boolean;
    txFetchType?: TxFetchType;
    txFetchAddress?: `0x${string}` | string;
}

interface returnIF {
    // Final list to render (merged live data + paginated older data + pending).
    displayData: TableRecord[];
    loadMore: () => void;
    isLoadingMore: boolean;
    moreDataAvailable: boolean;
}

// Maximum backend round-trips per loadMore call while hunting for `targetCount`
// fresh records. Prevents runaway loops when the server keeps returning data we
// already have.
const MAX_FETCH_ROUNDS = 8;

// Owns the data side of the infinite-scroll tables: it merges the live context
// data with older records fetched on demand, de-duplicates and re-sorts the
// result, and exposes a single `loadMore` entry point. Replaces the old
// page-window / hot-transaction / request-credit machinery with a flat,
// always-sorted list that the virtualizer renders a slice of.
export default function useInfiniteScrollData(props: propsIF): returnIF {
    const {
        type,
        data,
        fetchCount,
        targetCount,
        sortData,
        sortBy,
        reverseSort,
        showAllData,
        componentLock,
        txFetchType,
        txFetchAddress,
    } = props;

    const { baseToken, quoteToken } = useContext(TradeDataContext);
    const pairKey = (baseToken.address + quoteToken.address).toLowerCase();

    const {
        fetchLimitOrders,
        fetchPositions,
        fetchTxsPool,
        fetchTxsUser,
        fetchTxsUserPool,
    } = useInfiniteScrollFetchers();

    // Older records fetched via pagination, beyond what the contexts provide.
    const [fetchedOlder, setFetchedOlder] = useState<TableRecord[]>([]);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [moreDataAvailable, setMoreDataAvailable] = useState(true);

    // Reset pagination whenever the underlying query changes (pool pair, fetch
    // mode, candle lock, or all-data toggle). The live `data` prop intentionally
    // does NOT reset us — it merges in continuously.
    useEffect(() => {
        setFetchedOlder([]);
        setMoreDataAvailable(true);
        requestedTimesRef.current = new Set();
    }, [pairKey, txFetchType, componentLock, showAllData]);

    // Merge live data + fetched older data, de-dupe (live wins) and sort.
    const combined = useMemo<TableRecord[]>(() => {
        const merged = dedupeById(type, data, fetchedOlder);
        return sortData ? sortData(merged) : merged;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, data, fetchedOlder, sortBy, reverseSort]);

    // Fold in optimistic / pending positions (no-op for plain transactions).
    const { mergedData } = useMergeWithPendingTxs({
        type,
        data: combined as TransactionIF[],
    });

    const displayData = mergedData as TableRecord[];

    // Refs for use inside the async loadMore loop without stale closures.
    const displayDataRef = useRef<TableRecord[]>(displayData);
    displayDataRef.current = displayData;

    const isLoadingMoreRef = useRef(false);
    const moreDataAvailableRef = useRef(true);
    moreDataAvailableRef.current = moreDataAvailable;
    const requestedTimesRef = useRef<Set<number>>(new Set());
    const aliveRef = useRef(true);
    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
        };
    }, []);

    const fetchBatch = useCallback(
        async (before: number): Promise<TableRecord[]> => {
            if (type === 'Order') {
                return (await fetchLimitOrders(
                    before,
                    fetchCount,
                )) as LimitOrderIF[];
            }
            if (type === 'Range') {
                const positions = (await fetchPositions(
                    before,
                    fetchCount,
                )) as PositionIF[];
                return positions.filter((p) => p.positionLiq !== 0);
            }
            // Transaction
            if (txFetchType === undefined) return [];
            switch (txFetchType) {
                case TxFetchType.UserTxs:
                    return txFetchAddress
                        ? ((await fetchTxsUser(
                              before,
                              fetchCount,
                              txFetchAddress,
                          )) as TransactionIF[])
                        : [];
                case TxFetchType.UserPoolTxs:
                    return txFetchAddress
                        ? ((await fetchTxsUserPool(
                              before,
                              fetchCount,
                              txFetchAddress as `0x${string}`,
                          )) as TransactionIF[])
                        : [];
                case TxFetchType.PoolTxs:
                    return (await fetchTxsPool(
                        before,
                        fetchCount,
                    )) as TransactionIF[];
                default:
                    return [];
            }
        },
        [
            type,
            fetchCount,
            txFetchType,
            txFetchAddress,
            fetchLimitOrders,
            fetchPositions,
            fetchTxsPool,
            fetchTxsUser,
            fetchTxsUserPool,
        ],
    );

    const loadMore = useCallback(async () => {
        if (
            componentLock ||
            isLoadingMoreRef.current ||
            !moreDataAvailableRef.current ||
            !aliveRef.current
        ) {
            return;
        }
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);

        const collected: TableRecord[] = [];
        let before = oldestTime(type, displayDataRef.current);
        let rounds = 0;

        while (
            collected.length < targetCount &&
            rounds < MAX_FETCH_ROUNDS &&
            aliveRef.current
        ) {
            rounds++;
            if (before === Infinity) break;
            if (requestedTimesRef.current.has(before)) break;
            requestedTimesRef.current.add(before);

            const batch = await fetchBatch(before);
            if (batch.length === 0) break;

            // Drop anything we already have (current list + this round).
            const known = new Set(
                dedupeById(type, displayDataRef.current, collected).map((r) =>
                    recordId(type, r),
                ),
            );
            const fresh = batch.filter((r) => !known.has(recordId(type, r)));

            const batchOldest = oldestTime(type, batch);
            if (fresh.length === 0) {
                // Nothing new at this window; step further back if we can.
                if (batchOldest >= before) break;
                before = batchOldest;
                continue;
            }
            collected.push(...fresh);
            before = batchOldest < before ? batchOldest : before - 1;
        }

        if (!aliveRef.current) {
            isLoadingMoreRef.current = false;
            return;
        }

        if (collected.length > 0) {
            setFetchedOlder((prev) => [...prev, ...collected]);
        } else {
            setMoreDataAvailable(false);
        }
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
    }, [componentLock, type, targetCount, fetchBatch]);

    return { displayData, loadMore, isLoadingMore, moreDataAvailable };
}
