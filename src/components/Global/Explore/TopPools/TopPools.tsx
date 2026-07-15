import {
    Dispatch,
    memo,
    SetStateAction,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import { PoolIF } from '../../../../ambient-utils/types';
import useIsPWA from '../../../../utils/hooks/useIsPWA';
import { useVirtualRowWindow } from '../../../../utils/hooks/useVirtualRowWindow';
import useMediaQuery from '../../../../utils/hooks/useMediaQuery';
import TooltipComponent from '../../TooltipComponent/TooltipComponent';
import AssignSort from '../AssignSort';
import ExploreToggle from '../ExploreToggle/ExploreToggle';
import PoolRow from '../PoolRow/PoolRow';
import PoolRowSkeleton from '../PoolRow/PoolRowSkeleton';
import {
    SortedPoolMethodsIF,
    sortType,
    useSortedPools,
} from '../useSortedPools';
import styles from './TopPools.module.css';

export type HeaderItem = {
    label: string;
    sortable: boolean;
    pxValue?: number;
    onClick?: () => void;
    tooltipText?: string | React.ReactNode;
    classname?: boolean;
};

interface propsIF {
    allPools: Array<PoolIF>;
    goToMarket: (tknA: string, tknB: string) => void;
    isExploreDollarizationEnabled: boolean;
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;
    view: 'pools' | 'tokens';
    handleToggle(): void;
}

function TopPools(props: propsIF) {
    const {
        allPools,
        goToMarket,
        isExploreDollarizationEnabled,
        searchQuery,
        setSearchQuery,
        view,
        handleToggle,
    } = props;

    const isPWA = useIsPWA();
    // logic to take raw pool list and sort them based on user input
    const sortedPools: SortedPoolMethodsIF = useSortedPools(allPools);
    const desktopView = useMediaQuery('(min-width: 768px)');

    const ROW_HEIGHT_PX = 50;
    const LIST_OVERSCAN_ROWS = 24;

    const contentContainerRef = useRef<HTMLDivElement | null>(null);

    const filteredPools = useMemo(() => {
        if (searchQuery.length < 2) return sortedPools.pools;
        const lowerCaseQuery = searchQuery.toLowerCase();
        return sortedPools.pools.filter(
            (pool: PoolIF) =>
                pool.baseToken.name.toLowerCase().includes(lowerCaseQuery) ||
                pool.baseToken.symbol.toLowerCase().includes(lowerCaseQuery) ||
                pool.quoteToken.name.toLowerCase().includes(lowerCaseQuery) ||
                pool.quoteToken.symbol.toLowerCase().includes(lowerCaseQuery),
        );
    }, [sortedPools.pools, searchQuery]);

    const { startIndex, endIndex, topSpacerPx, bottomSpacerPx, syncWindow } =
        useVirtualRowWindow({
            containerRef: contentContainerRef,
            rowCount: filteredPools.length,
            rowHeightPx: ROW_HEIGHT_PX,
            overscanRows: LIST_OVERSCAN_ROWS,
            remeasureKey: filteredPools.length,
        });

    // Keep the virtual window aligned when the user clears the search query
    // from a non-top position.
    const prevSearchQueryRef = useRef(searchQuery);
    useEffect(() => {
        if (
            prevSearchQueryRef.current.length >= 2 &&
            searchQuery.length < 2 &&
            contentContainerRef.current
        ) {
            contentContainerRef.current.scrollTop = 0;
            syncWindow();
        }
        prevSearchQueryRef.current = searchQuery;
    }, [searchQuery, syncWindow]);

    // !important:  any changes to `sortable` values must be accompanied by an update
    // !important:  ... to the type definition `sortType` in `useSortedPools.ts`

    const topPoolsHeaderItems: (HeaderItem | null)[] = [
        !desktopView
            ? null
            : {
                  label: 'Tokens',

                  sortable: false,
                  pxValue: 8,
                  classname: styles.tokens,
              },
        {
            label: desktopView ? 'Pool' : ' Pool',

            sortable: false,
            classname: styles.poolName,
        },
        {
            label: desktopView ? 'Price' : '    Price',
            sortable: false,
            classname: styles.price,
        },
        {
            label: desktopView ? 'TVL' : '    TVL',

            sortable: true,
            tooltipText: 'Total value locked',
        },
        {
            label: '24h Vol.',

            sortable: true,
            tooltipText: 'Total volume in the last 24 hours',
        },
        !desktopView
            ? null
            : {
                  label: 'APR',

                  sortable: true,
                  tooltipText: (
                      <>
                          <div>
                              Annual Percentage Rate (APR) is estimated using
                              the following formula: 24h Fees / TVL × 365
                          </div>
                          <div>{' '}</div>
                          <div>
                              This estimate is based on historical data. Past
                              performance does not guarantee future results.
                          </div>
                      </>
                  ),
              },

        {
            label: desktopView ? '24h Price Δ' : 'Change',

            sortable: true,
            tooltipText: 'The change in price over the last 24 hours',
        },
        {
            label: '',

            sortable: false,
            classname: styles.tradeButton,
        },
    ];

    const headerDisplay = (
        <div className={styles.headerContainer}>
            {topPoolsHeaderItems
                .filter((item): item is HeaderItem => item !== null)
                .map((item: HeaderItem) => {
                    const isActiveSort: boolean =
                        sortedPools.current === item.label.toLowerCase();
                    return (
                        <div
                            key={JSON.stringify(item.label)}
                            className={`${styles.gridHeaderItem} ${item.classname} ${styles.headerItems}`}
                            style={{
                                cursor: item.sortable ? 'pointer' : 'default',
                            }}
                            onClick={() => {
                                item.sortable &&
                                    sortedPools.updateSort(
                                        item.label.toLowerCase() as sortType,
                                    );
                            }}
                        >
                            {item.label}
                            {isActiveSort && (
                                <AssignSort direction={sortedPools.direction} />
                            )}
                            {item.tooltipText && desktopView && (
                                <TooltipComponent
                                    title={item.tooltipText}
                                    placement='right'
                                />
                            )}
                        </div>
                    );
                })}
        </div>
    );
    const tempItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const skeletonDisplay = tempItems.map((item, idx) => (
        <PoolRowSkeleton key={idx} />
    ));

    return (
        <div
            className={styles.mainContainer}
            style={{ marginBottom: isPWA ? '0' : '50px' }}
        >
            <ExploreToggle view={view} handleToggle={handleToggle} />
            {headerDisplay}
            <div
                ref={contentContainerRef}
                className={`${styles.contentContainer} custom_scroll_ambient`}
                style={
                    {
                        '--virtual-row-height': `${ROW_HEIGHT_PX}px`,
                    } as React.CSSProperties
                }
            >
                <div className={styles.borderRight} />

                {filteredPools.length ? (
                    <>
                        {topSpacerPx > 0 && (
                            <div
                                className='virtual-list-spacer'
                                style={{ height: topSpacerPx }}
                                aria-hidden='true'
                            />
                        )}
                        {filteredPools
                            .slice(startIndex, endIndex)
                            .map((pool: PoolIF) => (
                                <PoolRow
                                    key={`${pool.base}-${pool.quote}`}
                                    pool={pool}
                                    goToMarket={goToMarket}
                                    isExploreDollarizationEnabled={
                                        isExploreDollarizationEnabled
                                    }
                                />
                            ))}
                        {bottomSpacerPx > 0 && (
                            <div
                                className='virtual-list-spacer'
                                style={{ height: bottomSpacerPx }}
                                aria-hidden='true'
                            />
                        )}
                    </>
                ) : searchQuery ? (
                    <div className={styles.no_results}>
                        No pools match the search query: {searchQuery}
                        <button onClick={() => setSearchQuery('')}>
                            View all Pools
                        </button>
                    </div>
                ) : (
                    skeletonDisplay
                )}
            </div>
        </div>
    );
}

export default memo(TopPools);
