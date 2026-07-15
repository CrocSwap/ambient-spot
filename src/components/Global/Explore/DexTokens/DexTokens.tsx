import {
    Dispatch,
    memo,
    SetStateAction,
    useContext,
    useEffect,
    useMemo,
    useRef,
} from 'react';
import { hiddenTokens } from '../../../../ambient-utils/constants';
import { isWrappedNativeToken } from '../../../../ambient-utils/dataLayer';
import { PoolIF, TokenIF } from '../../../../ambient-utils/types';
import { ChainDataContext } from '../../../../contexts';
import { dexTokenData } from '../../../../pages/platformAmbient/Explore/useTokenStats';
import useIsPWA from '../../../../utils/hooks/useIsPWA';
import { useVirtualRowWindow } from '../../../../utils/hooks/useVirtualRowWindow';
import useMediaQuery from '../../../../utils/hooks/useMediaQuery';
import TooltipComponent from '../../TooltipComponent/TooltipComponent';
import AssignSort from '../AssignSort';
import ExploreToggle from '../ExploreToggle/ExploreToggle';
import TokenRow from '../TokenRow/TokenRow';
import TokenRowSkeleton from '../TokenRow/TokenRowSkeleton';
import { sortedDexTokensIF, useSortedDexTokens } from '../useSortedDexTokens';
import styles from './DexTokens.module.css';

export type columnSlugs =
    | 'token'
    | 'name'
    | 'tvl'
    | 'fees'
    | 'volume'
    | 'tradeBtn';

export interface HeaderItem {
    label: string;
    slug: columnSlugs;
    sortable: boolean;
    pxValue?: number;
    onClick?: () => void;
    tooltipText?: string | React.ReactNode;
    classname?: boolean;
}

interface propsIF {
    dexTokens: dexTokenData[];
    chainId: string;
    goToMarket: (tknA: string, tknB: string) => void;
    searchQuery: string;
    setSearchQuery: Dispatch<SetStateAction<string>>;
    view: 'pools' | 'tokens';
    handleToggle(): void;
}

function DexTokens(props: propsIF) {
    const {
        dexTokens,
        goToMarket,
        searchQuery,
        setSearchQuery,
        view,
        handleToggle,
    } = props;

    const { activePoolList } = useContext(ChainDataContext);

    const isPWA = useIsPWA();

    const sortedTokens: sortedDexTokensIF = useSortedDexTokens(dexTokens);

    const desktopView = useMediaQuery('(min-width: 768px)');

    const ROW_HEIGHT_PX = 40;
    const LIST_OVERSCAN_ROWS = 24;

    const contentContainerRef = useRef<HTMLDivElement | null>(null);

    const filteredTokenItems = useMemo(() => {
        const lowerCaseQuery =
            searchQuery.length >= 2 ? searchQuery.toLowerCase() : '';
        return sortedTokens.data.reduce<
            Array<{
                token: dexTokenData;
                tokenMeta: TokenIF;
                matchingPool: PoolIF;
            }>
        >((acc, token: dexTokenData) => {
            if (
                hiddenTokens.some(
                    (excluded) =>
                        excluded.address.toLowerCase() ===
                            token.tokenAddr.toLowerCase() &&
                        excluded.chainId === token.tokenMeta?.chainId,
                )
            ) {
                return acc;
            }
            if (!token.tokenMeta) return acc;
            const matchingPool = (activePoolList || []).find(
                (p: PoolIF) =>
                    (p.base.toLowerCase() === token.tokenAddr.toLowerCase() &&
                        !isWrappedNativeToken(p.quote)) ||
                    (p.quote.toLowerCase() === token.tokenAddr.toLowerCase() &&
                        !isWrappedNativeToken(p.base)),
            );
            if (!matchingPool) return acc;
            if (
                lowerCaseQuery.length > 0 &&
                !token.tokenMeta.name.toLowerCase().includes(lowerCaseQuery) &&
                !token.tokenMeta.symbol.toLowerCase().includes(lowerCaseQuery)
            ) {
                return acc;
            }
            acc.push({
                token,
                tokenMeta: token.tokenMeta as TokenIF,
                matchingPool,
            });
            return acc;
        }, []);
    }, [sortedTokens.data, searchQuery, activePoolList]);

    const { startIndex, endIndex, topSpacerPx, bottomSpacerPx, syncWindow } =
        useVirtualRowWindow({
            containerRef: contentContainerRef,
            rowCount: filteredTokenItems.length,
            rowHeightPx: ROW_HEIGHT_PX,
            overscanRows: LIST_OVERSCAN_ROWS,
            remeasureKey: filteredTokenItems.length,
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

    // this logic is here to patch cases where existing logic to identify a token pool fails,
    // ... this is not an optimal location but works as a stopgap that minimizes needing to
    // ... alter existing logic or type annotation in the component tree

    const dexTokensHeaderItems: (HeaderItem | null)[] = [
        // mobileScrenView ? null :
        {
            label: 'Token',
            slug: 'token',
            sortable: false,
            classname: styles.tokens,
        },
        desktopView
            ? {
                  label: 'Name',
                  slug: 'name',
                  sortable: true,
                  classname: styles.poolName,
              }
            : null,
        {
            label: 'Volume',
            slug: 'volume',
            sortable: true,
            tooltipText: 'Total trade volume',
        },
        {
            label: 'TVL',
            slug: 'tvl',
            sortable: true,
            tooltipText: 'Total value locked',
        },
        {
            label: 'Fees',
            slug: 'fees',
            sortable: true,
            tooltipText: 'Total fees collected',
        },
        {
            label: '',
            slug: 'tradeBtn',

            sortable: false,
        },
    ];

    const headerDisplay = (
        <div className={styles.headerContainer}>
            {dexTokensHeaderItems
                .filter((item): item is HeaderItem => item !== null)
                .map((item: HeaderItem) => {
                    const isActiveSort: boolean =
                        sortedTokens.sortBy.slug === item.slug;
                    return (
                        <div
                            key={JSON.stringify(item.label)} // No need for optional chaining
                            className={`${styles.gridHeaderItem} ${item.classname} ${styles.headerItems}`}
                            style={{
                                cursor: item.sortable ? 'pointer' : 'default',
                                paddingRight:
                                    item?.tooltipText && desktopView
                                        ? '16px'
                                        : '0',
                            }}
                            onClick={() =>
                                item.sortable && sortedTokens.update(item.slug)
                            }
                        >
                            {item.label}
                            {isActiveSort && (
                                <AssignSort
                                    direction={
                                        sortedTokens.sortBy.reverse
                                            ? 'descending'
                                            : 'ascending'
                                    }
                                />
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

    const noResults = (
        <div className={styles.no_results}>
            No pools match the search query: {searchQuery}
            <button onClick={() => setSearchQuery('')}>View all Tokens</button>
        </div>
    );

    const tempItems = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const skeletonDisplay = tempItems.map((item, idx) => (
        <TokenRowSkeleton key={idx} />
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

                {filteredTokenItems.length ? (
                    <>
                        {topSpacerPx > 0 && (
                            <div
                                className='virtual-list-spacer'
                                style={{ height: topSpacerPx }}
                                aria-hidden='true'
                            />
                        )}
                        {filteredTokenItems
                            .slice(startIndex, endIndex)
                            .map(
                                ({
                                    token,
                                    tokenMeta,
                                    matchingPool,
                                }: {
                                    token: dexTokenData;
                                    tokenMeta: TokenIF;
                                    matchingPool: PoolIF;
                                }) => (
                                    <TokenRow
                                        key={token.tokenAddr}
                                        token={token}
                                        tokenMeta={tokenMeta}
                                        matchingPool={matchingPool}
                                        goToMarket={goToMarket}
                                    />
                                ),
                            )}
                        {bottomSpacerPx > 0 && (
                            <div
                                className='virtual-list-spacer'
                                style={{ height: bottomSpacerPx }}
                                aria-hidden='true'
                            />
                        )}
                    </>
                ) : searchQuery ? (
                    noResults
                ) : (
                    skeletonDisplay
                )}
            </div>
        </div>
    );
}

export default memo(DexTokens);
