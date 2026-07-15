import { memo } from 'react';
import { LimitOrderIF } from '../../../ambient-utils/types/limitOrder';
import { PositionIF } from '../../../ambient-utils/types/position';
import { TransactionIF } from '../../../ambient-utils/types/transaction';
import { LimitSortType } from '../TradeTabs/useSortedLimits';
import { RangeSortType } from '../TradeTabs/useSortedPositions';
import { TxSortType } from '../TradeTabs/useSortedTxs';
import VirtualRows from './VirtualRows';
import useInfiniteScrollData from './useInfiniteScrollData';
import { TableRecord, TxFetchType } from './virtualTableHelpers';

export { TxFetchType };

interface propsIF {
    type: 'Transaction' | 'Order' | 'Range';
    tableView: 'small' | 'medium' | 'large';
    isAccountView: boolean;
    data: TransactionIF[] | LimitOrderIF[] | PositionIF[];
    dataPerPage: number;
    fetchCount: number;
    targetCount: number;
    sortOrders?: (data: LimitOrderIF[]) => LimitOrderIF[];
    sortPositions?: (data: PositionIF[]) => PositionIF[];
    sortTransactions?: (data: TransactionIF[]) => TransactionIF[];
    sortBy: TxSortType | LimitSortType | RangeSortType;
    reverseSort: boolean;
    showAllData: boolean;
    componentLock?: boolean;
    extraRequestCreditLimit?: number;
    txFetchType?: TxFetchType;
    txFetchAddress?: `0x${string}` | string;
}

// Owns the data side only. Scroll-driven re-renders live in <VirtualRows> so the
// (potentially expensive) data merge below does not re-run on every scroll
// frame.
function InfiniteScroll(props: propsIF) {
    const {
        type,
        data,
        fetchCount,
        targetCount,
        sortOrders,
        sortPositions,
        sortTransactions,
        tableView,
        isAccountView,
        sortBy,
        reverseSort,
        showAllData,
        txFetchType,
        txFetchAddress,
        componentLock,
    } = props;

    // Adapt the type-specific sort fn to the union-typed signature the data hook
    // expects. Recreated each render so it always captures the latest sort.
    const sortData = ((): ((d: TableRecord[]) => TableRecord[]) | undefined => {
        if (type === 'Transaction' && sortTransactions)
            return (d) =>
                sortTransactions(d as TransactionIF[]) as TableRecord[];
        if (type === 'Order' && sortOrders)
            return (d) => sortOrders(d as LimitOrderIF[]) as TableRecord[];
        if (type === 'Range' && sortPositions)
            return (d) => sortPositions(d as PositionIF[]) as TableRecord[];
        return undefined;
    })();

    const { displayData, loadMore, isLoadingMore, moreDataAvailable } =
        useInfiniteScrollData({
            type,
            data: data as TableRecord[],
            fetchCount,
            targetCount,
            sortData,
            sortBy,
            reverseSort,
            showAllData,
            componentLock,
            txFetchType,
            txFetchAddress,
        });

    return (
        <VirtualRows
            type={type}
            displayData={displayData}
            tableView={tableView}
            isAccountView={isAccountView}
            loadMore={loadMore}
            isLoadingMore={isLoadingMore}
            moreDataAvailable={moreDataAvailable}
            componentLock={componentLock}
            // Reset scroll position whenever the sort / data source changes.
            resetKey={`${sortBy}|${reverseSort}|${showAllData}|${componentLock}`}
        />
    );
}

export default memo(InfiniteScroll);
