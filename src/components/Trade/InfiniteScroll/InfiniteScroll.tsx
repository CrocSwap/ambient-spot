import {
    memo,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { RiArrowUpSLine } from 'react-icons/ri';
import { LimitOrderIF } from '../../../ambient-utils/types/limitOrder';
import { PositionIF } from '../../../ambient-utils/types/position';
import { TransactionIF } from '../../../ambient-utils/types/transaction';
import {
    ScrollToTopButton,
    ScrollToTopButtonMobile,
} from '../../../styled/Components/TransactionTable';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import TableRows from '../TradeTabs/TableRows';
import { LimitSortType } from '../TradeTabs/useSortedLimits';
import { RangeSortType } from '../TradeTabs/useSortedPositions';
import { TxSortType } from '../TradeTabs/useSortedTxs';
import styles from './InfiniteScroll.module.css';
import useInfiniteScrollData from './useInfiniteScrollData';
import useRowVirtualizer from './useRowVirtualizer';
import {
    getScrollParent,
    recordId,
    TableRecord,
    TxFetchType,
} from './virtualTableHelpers';

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

// Fallback row height (px) before a real row is measured. Matches the table
// row `min-height` in styled/Components/TransactionTable.
const DEFAULT_ROW_HEIGHT = 35;
const OVERSCAN = 10;

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

    const isSmallScreen = useMediaQuery('(max-width: 768px)');

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

    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [scrollElement, setScrollElement] = useState<HTMLElement | null>(
        null,
    );
    const [rowHeight, setRowHeight] = useState<number>(DEFAULT_ROW_HEIGHT);
    const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

    // Locate the scroll container owned by the parent table component.
    useLayoutEffect(() => {
        setScrollElement(getScrollParent(wrapperRef.current));
    }, [tableView, isAccountView, isSmallScreen]);

    // Measure a real row once rows exist so the spacer math stays accurate
    // across the small/medium/large layouts.
    useLayoutEffect(() => {
        const firstRow = wrapperRef.current?.querySelector(
            '[data-type="infinite-scroll-row"]',
        ) as HTMLElement | null;
        if (firstRow) {
            const measured = firstRow.getBoundingClientRect().height;
            if (measured > 0 && Math.abs(measured - rowHeight) > 0.5) {
                setRowHeight(measured);
            }
        }
    }, [displayData.length, tableView, rowHeight]);

    const { startIndex, endIndex } = useRowVirtualizer({
        count: displayData.length,
        rowHeight,
        overscan: OVERSCAN,
        scrollElement,
        wrapperRef,
        onReachEnd: () => {
            if (moreDataAvailable && !isLoadingMore && !componentLock) {
                loadMore();
            }
        },
        endThresholdPx: rowHeight * OVERSCAN,
    });

    const visibleRows = useMemo<TableRecord[]>(
        () => displayData.slice(startIndex, endIndex),
        [displayData, startIndex, endIndex],
    );

    // Keep the viewport visually anchored when new live records are prepended
    // (e.g. a fresh swap lands while the user is scrolled down). We find where
    // the previous top row moved to and offset scrollTop by that many rows.
    const prevHeadRef = useRef<string | null>(null);
    useLayoutEffect(() => {
        const newHead = displayData.length
            ? recordId(type, displayData[0])
            : null;
        const prevHead = prevHeadRef.current;
        prevHeadRef.current = newHead;

        if (!scrollElement || !prevHead || prevHead === newHead) return;
        if (scrollElement.scrollTop <= 0) return;

        const prependedCount = displayData.findIndex(
            (r) => recordId(type, r) === prevHead,
        );
        // Only compensate for genuine top-insertions (not a full re-sort).
        if (prependedCount > 0 && prependedCount <= 64) {
            scrollElement.scrollTop += prependedCount * rowHeight;
        }
    }, [displayData, scrollElement, type, rowHeight]);

    // Toggle the scroll-to-top affordance.
    useEffect(() => {
        if (!scrollElement) return;
        const onScroll = () => setShowScrollTop(scrollElement.scrollTop > 200);
        scrollElement.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => scrollElement.removeEventListener('scroll', onScroll);
    }, [scrollElement]);

    // Jump back to the top whenever the sort / data source changes.
    useEffect(() => {
        scrollElement?.scrollTo({
            top: 0,
            behavior: 'instant' as ScrollBehavior,
        });
    }, [sortBy, reverseSort, showAllData, componentLock, scrollElement]);

    return (
        <>
            <div ref={wrapperRef} style={{ position: 'relative' }}>
                <div
                    style={{
                        height: displayData.length * rowHeight,
                        position: 'relative',
                        width: '100%',
                    }}
                >
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            transform: `translateY(${startIndex * rowHeight}px)`,
                        }}
                    >
                        <TableRows
                            type={type}
                            data={visibleRows as TransactionIF[]}
                            fullData={displayData as TransactionIF[]}
                            isAccountView={isAccountView}
                            tableView={tableView}
                        />
                    </div>
                </div>
            </div>

            {showScrollTop &&
                (isSmallScreen ? (
                    <ScrollToTopButtonMobile
                        onClick={() =>
                            scrollElement?.scrollTo({
                                top: 0,
                                behavior: 'smooth',
                            })
                        }
                    >
                        <RiArrowUpSLine size={20} color='white' />
                    </ScrollToTopButtonMobile>
                ) : (
                    <ScrollToTopButton
                        onClick={() =>
                            scrollElement?.scrollTo({
                                top: 0,
                                behavior: 'smooth',
                            })
                        }
                    >
                        Scroll to Top
                    </ScrollToTopButton>
                ))}

            {isLoadingMore && (
                <div className={styles.data_fetching_panel}>
                    <div className={styles.data_fetching_bar2}></div>
                </div>
            )}
        </>
    );
}

export default memo(InfiniteScroll);
