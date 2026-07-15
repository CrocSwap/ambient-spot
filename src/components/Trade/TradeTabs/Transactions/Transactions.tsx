/* eslint-disable no-irregular-whitespace */
import { CandleDataIF, TransactionIF } from '../../../../ambient-utils/types';
import useMediaQuery from '../../../../utils/hooks/useMediaQuery';

import {
    Dispatch,
    memo,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { fetchPoolRecentChanges } from '../../../../ambient-utils/api';

import { candleTimeIF } from '../../../../App/hooks/useChartSettings';
import { ChainDataContext, UserDataContext } from '../../../../contexts';
import { AppStateContext } from '../../../../contexts/AppStateContext';
import { CachedDataContext } from '../../../../contexts/CachedDataContext';
import { CandleContext } from '../../../../contexts/CandleContext';
import { ChartContext } from '../../../../contexts/ChartContext';
import { CrocEnvContext } from '../../../../contexts/CrocEnvContext';
import { DataLoadingContext } from '../../../../contexts/DataLoadingContext';
import { GraphDataContext } from '../../../../contexts/GraphDataContext';
import { ReceiptContext } from '../../../../contexts/ReceiptContext';
import { SidebarContext } from '../../../../contexts/SidebarContext';
import { TokenContext } from '../../../../contexts/TokenContext';
import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import { TradeTableContext } from '../../../../contexts/TradeTableContext';
import { FlexContainer } from '../../../../styled/Common';
import { TransactionRow as TransactionRowStyled } from '../../../../styled/Components/TransactionTable';
import Spinner from '../../../Global/Spinner/Spinner';
import InfiniteScroll, {
    TxFetchType,
} from '../../InfiniteScroll/InfiniteScroll';
import NoTableData from '../NoTableData/NoTableData';
import { useSortedTxs } from '../useSortedTxs';
import TransactionHeader from './TransactionsTable/TransactionHeader';
import { TransactionRowPlaceholder } from './TransactionsTable/TransactionRowPlaceholder';

interface propsIF {
    filter?: CandleDataIF | undefined;
    activeAccountTransactionData?: TransactionIF[];
    connectedAccountActive?: boolean;
    isAccountView: boolean;
    setSelectedDate?: Dispatch<number | undefined>;
    setSelectedInsideTab?: Dispatch<number>;
    fullLayoutActive?: boolean;
    accountAddress?: string | undefined;
    unselectCandle?: () => void;
}

function Transactions(props: propsIF) {
    const {
        filter,
        activeAccountTransactionData,
        connectedAccountActive,
        setSelectedDate,
        setSelectedInsideTab,
        isAccountView,
        fullLayoutActive,
        accountAddress,
        unselectCandle,
    } = props;

    const {
        server: { isEnabled: isServerEnabled },
    } = useContext(AppStateContext);
    const { isCandleSelected } = useContext(CandleContext);
    const { cachedQuerySpotPrice, cachedFetchTokenPrice, cachedTokenDetails } =
        useContext(CachedDataContext);
    const { activePoolList } = useContext(ChainDataContext);
    const { chartSettings } = useContext(ChartContext);
    const { crocEnv, provider } = useContext(CrocEnvContext);
    const {
        activeNetwork: { chainId, poolIndex, gcgo },
    } = useContext(AppStateContext);

    const { setOutsideControl, showAllData: showAllDataSelection } =
        useContext(TradeTableContext);
    const { tokens } = useContext(TokenContext);

    const { userAddress } = useContext(UserDataContext);

    const {
        sidebar: { isOpen: isSidebarOpen },
    } = useContext(SidebarContext);

    const candleTime: candleTimeIF = chartSettings.candleTime.global;

    const dataLoadingStatus = useContext(DataLoadingContext);
    const {
        transactionsByUser,
        userTransactionsByPool,
        transactionsByPool,
        unindexedNonFailedSessionTransactionHashes,
    } = useContext(GraphDataContext);

    const { transactionsByType } = useContext(ReceiptContext);
    const { baseToken, quoteToken } = useContext(TradeDataContext);

    const selectedBaseAddress: string = baseToken.address;
    const selectedQuoteAddress: string = quoteToken.address;
    const quoteTokenSymbol: string = quoteToken?.symbol;
    const baseTokenSymbol: string = baseToken?.symbol;

    const showAllData = !isAccountView && showAllDataSelection;

    const [candleTransactionData, setCandleTransactionData] = useState<
        TransactionIF[]
    >([]);

    const transactionData = useMemo<TransactionIF[]>(
        () =>
            isAccountView
                ? activeAccountTransactionData || []
                : !showAllData
                  ? userTransactionsByPool.changes
                  : transactionsByPool.changes,
        [
            activeAccountTransactionData,
            userTransactionsByPool,
            transactionsByPool,
            showAllData,
        ],
    );

    const txDataToDisplay: TransactionIF[] = isCandleSelected
        ? candleTransactionData
        : transactionData;
    const indexedTransactionHashSet = useMemo(
        () =>
            new Set(
                txDataToDisplay.map((tx) => tx.txHash.trim().toLowerCase()),
            ),
        [txDataToDisplay],
    );

    const [infiniteScrollLock, setInfiniteScrollLock] =
        useState<boolean>(false);

    const [
        sortBy,
        setSortBy,
        reverseSort,
        setReverseSort,
        sortedTransactions,
        sortData,
    ] = useSortedTxs('time', txDataToDisplay);

    const userTransacionsLength = useMemo<number>(
        () =>
            isAccountView
                ? activeAccountTransactionData
                    ? activeAccountTransactionData.length
                    : 0
                : transactionsByUser.changes.length,
        [activeAccountTransactionData, transactionsByUser, isAccountView],
    );

    useEffect(() => {
        if (!isCandleSelected) {
            setCandleTransactionData([]);
            setInfiniteScrollLock(false);
            dataLoadingStatus.setDataLoadingStatus({
                datasetName: 'isCandleDataLoading',
                loadingStatus: true,
            });
        }
    }, [isCandleSelected]);

    useEffect(() => {
        if (isCandleSelected) {
            setInfiniteScrollLock(true);
        }
    }, [candleTransactionData]);

    const isLoading = useMemo<boolean>(
        () =>
            isCandleSelected
                ? dataLoadingStatus.isCandleDataLoading
                : isAccountView && connectedAccountActive
                  ? dataLoadingStatus.isConnectedUserTxDataLoading
                  : isAccountView
                    ? dataLoadingStatus.isLookupUserTxDataLoading
                    : dataLoadingStatus.isPoolTxDataLoading,
        [
            isAccountView,
            showAllData,
            connectedAccountActive,
            isCandleSelected,
            dataLoadingStatus.isCandleDataLoading,
            dataLoadingStatus.isConnectedUserTxDataLoading,
            dataLoadingStatus.isConnectedUserPoolTxDataLoading,
            dataLoadingStatus.isLookupUserTxDataLoading,
            dataLoadingStatus.isPoolTxDataLoading,
        ],
    );

    const unindexedNonFailedTransactions = transactionsByType.filter(
        (tx) =>
            !tx.isRemoved &&
            !indexedTransactionHashSet.has(tx.txHash.trim().toLowerCase()) &&
            unindexedNonFailedSessionTransactionHashes.some(
                (hash) =>
                    hash.trim().toLowerCase() ===
                    tx.txHash.trim().toLowerCase(),
            ) &&
            tx.txDetails?.baseAddress.toLowerCase() ===
                baseToken.address.toLowerCase() &&
            tx.txDetails?.quoteAddress.toLowerCase() ===
                quoteToken.address.toLowerCase() &&
            tx.txDetails?.poolIdx === poolIndex,
    );

    // TODO: Use these as media width constants
    const isSmallScreen: boolean = useMediaQuery('(max-width: 768px)');
    const isTabletScreen = useMediaQuery(
        '(min-width: 768px) and (max-width: 1200px)',
    );
    const isLargeScreen: boolean = useMediaQuery('(min-width: 1600px)');

    const tableView: 'small' | 'medium' | 'large' =
        isSmallScreen || isTabletScreen
            ? 'small'
            : (!isSmallScreen && !isLargeScreen) ||
                (isAccountView &&
                    isLargeScreen &&
                    isSidebarOpen &&
                    fullLayoutActive === false)
              ? 'medium'
              : 'large';

    const getCandleData = (): Promise<void> | undefined =>
        crocEnv &&
        provider &&
        fetchPoolRecentChanges({
            tokenList: tokens.tokenUniv,
            base: selectedBaseAddress,
            quote: selectedQuoteAddress,
            poolIdx: poolIndex,
            chainId: chainId,
            n: 200,
            period: candleTime.time,
            time: filter?.time,
            crocEnv: crocEnv,
            gcgo,
            provider,
            activePoolList,
            cachedFetchTokenPrice: cachedFetchTokenPrice,
            cachedQuerySpotPrice: cachedQuerySpotPrice,
            cachedTokenDetails: cachedTokenDetails,
        })
            .then((selectedCandleChangesJson) => {
                if (selectedCandleChangesJson) {
                    const selectedCandleChangesWithoutFills =
                        selectedCandleChangesJson.filter(
                            (tx) => tx.changeType !== 'cross',
                        );
                    setCandleTransactionData(selectedCandleChangesWithoutFills);
                }
                setOutsideControl(true);
                setSelectedInsideTab && setSelectedInsideTab(0);
            })
            .catch(console.error);

    // update candle transactions on fresh load
    useEffect(() => {
        if (
            isServerEnabled &&
            isCandleSelected &&
            candleTime.time &&
            filter?.time &&
            crocEnv &&
            provider
        ) {
            dataLoadingStatus.setDataLoadingStatus({
                datasetName: 'isCandleDataLoading',
                loadingStatus: true,
            });
            getCandleData()?.then(() => {
                dataLoadingStatus.setDataLoadingStatus({
                    datasetName: 'isCandleDataLoading',
                    loadingStatus: false,
                });
            });
        }
    }, [
        isServerEnabled,
        isCandleSelected,
        filter?.time,
        candleTime.time,
        !!crocEnv,
        !!provider,
    ]);

    const sideType: React.ReactNode = (
        <>
            <p>Type</p>
            <p>Side</p>
        </>
    );

    const headerColumns: {
        name: string | React.ReactNode;
        show: boolean;
        slug: string;
        sortable: boolean;
        alignRight?: boolean;
        alignCenter?: boolean;
    }[] = [
        {
            name: 'Timestamp',
            show: tableView !== 'small',
            slug: 'time',
            sortable: true,
        },
        {
            name: 'Pair',
            show: isAccountView,
            slug: 'pool',
            sortable: true,
        },
        {
            name: 'Transaction ID',
            show:
                tableView === 'large' ||
                (tableView === 'medium' && isAccountView),
            slug: 'id',
            sortable: false,
        },
        {
            name: 'Wallet',
            show: !isAccountView,
            slug: 'wallet',
            sortable: showAllData,
        },
        {
            name: 'Price',
            show: tableView !== 'small',
            slug: 'price',
            sortable: false,
            alignRight: true,
        },
        {
            name: 'Side',
            show: tableView === 'large',
            slug: 'side',
            sortable: false,
            alignCenter: true,
        },
        {
            name: 'Type',
            show: tableView === 'large',
            slug: 'type',
            sortable: false,
            alignCenter: true,
        },
        {
            name: sideType,
            show: tableView !== 'large',
            slug: 'sidetype',
            sortable: false,
            alignCenter: true,
        },
        {
            name: 'Value (USD)',
            show: true,
            slug: 'value',
            sortable: true,
            alignRight: true,
        },
        {
            name: isAccountView ? <></> : `${baseTokenSymbol}`,
            show: tableView === 'large',
            slug: baseTokenSymbol,
            sortable: false,
            alignRight: true,
        },
        {
            name: isAccountView ? <></> : `${quoteTokenSymbol}`,
            show: tableView === 'large',
            slug: quoteTokenSymbol,
            sortable: false,
            alignRight: true,
        },
        {
            name: 'Tokens',
            show: !isAccountView && tableView === 'medium',
            slug: 'tokens',
            sortable: false,
            alignRight: true,
        },
        {
            name: <>Tokens</>,
            show: isAccountView && tableView === 'medium',
            slug: 'tokens',
            sortable: false,
            alignRight: true,
        },
        {
            name: '',
            show: false,
            slug: 'menu',
            sortable: false,
        },
    ];

    const headerColumnsDisplay: React.ReactNode = (
        <TransactionRowStyled size={tableView} header account={isAccountView}>
            {headerColumns.map((header, idx) => (
                <TransactionHeader
                    key={idx}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    reverseSort={reverseSort}
                    setReverseSort={setReverseSort}
                    header={header}
                />
            ))}
        </TransactionRowStyled>
    );

    const listRef = useRef<HTMLUListElement>(null);

    const handleKeyDownViewTransaction = (
        event: React.KeyboardEvent<HTMLUListElement | HTMLDivElement>,
    ): void => {
        // Opens a modal which displays the contents of a transaction and some other information
        const { key } = event;

        if (key === 'ArrowDown' || key === 'ArrowUp') {
            const rows = document.querySelectorAll('.row_container_global');
            const currentRow = event.target as HTMLLIElement;
            const index = Array.from(rows).indexOf(currentRow);

            if (key === 'ArrowDown') {
                event.preventDefault();
                if (index < rows.length - 1) {
                    (rows[index + 1] as HTMLLIElement).focus();
                } else {
                    (rows[0] as HTMLLIElement).focus();
                }
            } else if (key === 'ArrowUp') {
                event.preventDefault();
                if (index > 0) {
                    (rows[index - 1] as HTMLLIElement).focus();
                } else {
                    (rows[rows.length - 1] as HTMLLIElement).focus();
                }
            }
        }
    };

    const fetchType = useMemo<TxFetchType>(() => {
        if (showAllData && !isAccountView) {
            return TxFetchType.PoolTxs;
        } else if (!showAllData && !isAccountView && userAddress) {
            return TxFetchType.UserPoolTxs;
        } else if (isAccountView && accountAddress) {
            return TxFetchType.UserTxs;
        }

        return TxFetchType.None;
    }, [showAllData, isAccountView, userAddress, accountAddress]);

    const addressToUse = useMemo<`0x${string}` | string | undefined>(() => {
        if (fetchType === TxFetchType.UserPoolTxs && userAddress) {
            return userAddress;
        } else if (fetchType === TxFetchType.UserTxs) {
            if (accountAddress) {
                return accountAddress;
            } else {
                return userAddress;
            }
        }

        return undefined;
    }, [fetchType]);

    const [debouncedIsLoading, setDebouncedIsLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!isLoading && !txDataToDisplay.length) {
            // use a timeout to keep the isLoading state true 1 second longer
            const handler = setTimeout(
                () => setDebouncedIsLoading(isLoading),
                1000,
            );
            return () => clearTimeout(handler);
        } else {
            setDebouncedIsLoading(isLoading);
        }
    }, [isLoading, txDataToDisplay.length]);

    const shouldDisplayNoTableData: boolean =
        !debouncedIsLoading &&
        !txDataToDisplay.length &&
        unindexedNonFailedTransactions.length === 0;

    const transactionDataOrNull: React.ReactNode = shouldDisplayNoTableData ? (
        <NoTableData
            setSelectedDate={setSelectedDate}
            type='transactions'
            isAccountView={isAccountView}
            activeUserPositionsLength={userTransacionsLength}
            activeUserPositionsByPoolLength={
                userTransactionsByPool.changes.length
            }
            unselectCandle={unselectCandle}
        />
    ) : (
        <div onKeyDown={handleKeyDownViewTransaction}>
            <ul
                ref={listRef}
                id='current_row_scroll'
                style={
                    isSmallScreen
                        ? isAccountView
                            ? {
                                  maxHeight: 'calc(100svh - 310px)',
                                  overflowY: 'auto',
                              }
                            : {
                                  height: 'calc(100svh - 300px)',
                                  overflowY: 'auto',
                              }
                        : undefined
                }
            >
                {!isAccountView &&
                    unindexedNonFailedTransactions.length > 0 &&
                    unindexedNonFailedTransactions.reverse().map((tx, idx) => {
                        if (tx.txAction !== 'Reposition')
                            return (
                                <TransactionRowPlaceholder
                                    key={idx}
                                    transaction={{
                                        hash: tx.txHash,
                                        side: tx.txAction,
                                        type: tx.txType,
                                        action: tx.txAction,
                                        details: tx.txDetails,
                                    }}
                                    tableView={tableView}
                                />
                            );
                        return (
                            <>
                                <TransactionRowPlaceholder
                                    key={idx + 'sell'}
                                    transaction={{
                                        hash: tx.txHash,
                                        side: 'Sell',
                                        type: 'Market',
                                        action: tx.txAction,
                                        details: {
                                            baseSymbol:
                                                tx.txDetails?.baseSymbol ??
                                                '...',
                                            quoteSymbol:
                                                tx.txDetails?.quoteSymbol ??
                                                '...',
                                            baseTokenDecimals:
                                                tx.txDetails?.baseTokenDecimals,
                                            quoteTokenDecimals:
                                                tx.txDetails
                                                    ?.quoteTokenDecimals,
                                            lowTick: tx.txDetails?.lowTick,
                                            highTick: tx.txDetails?.highTick,
                                            gridSize: tx.txDetails?.gridSize,
                                            isBid: tx.txDetails?.isBid,
                                        },
                                    }}
                                    tableView={tableView}
                                />
                                <TransactionRowPlaceholder
                                    key={idx + 'add'}
                                    transaction={{
                                        hash: tx.txHash,
                                        side: 'Add',
                                        type: 'Range',
                                        action: tx.txAction,
                                        details: {
                                            baseSymbol:
                                                tx.txDetails?.baseSymbol ??
                                                '...',
                                            quoteSymbol:
                                                tx.txDetails?.quoteSymbol ??
                                                '...',
                                            baseTokenDecimals:
                                                tx.txDetails?.baseTokenDecimals,
                                            quoteTokenDecimals:
                                                tx.txDetails
                                                    ?.quoteTokenDecimals,
                                            lowTick: tx.txDetails?.lowTick,
                                            highTick: tx.txDetails?.highTick,
                                            gridSize: tx.txDetails?.gridSize,
                                        },
                                    }}
                                    tableView={tableView}
                                />
                                <TransactionRowPlaceholder
                                    key={idx + 'remove'}
                                    transaction={{
                                        hash: tx.txHash,
                                        side: 'Remove',
                                        type: 'Range',
                                        action: tx.txAction,
                                        details: {
                                            baseSymbol:
                                                tx.txDetails?.baseSymbol ??
                                                '...',
                                            quoteSymbol:
                                                tx.txDetails?.quoteSymbol ??
                                                '...',
                                            baseTokenDecimals:
                                                tx.txDetails?.baseTokenDecimals,
                                            quoteTokenDecimals:
                                                tx.txDetails
                                                    ?.quoteTokenDecimals,
                                            lowTick:
                                                tx.txDetails?.originalLowTick,
                                            highTick:
                                                tx.txDetails?.originalHighTick,
                                            gridSize: tx.txDetails?.gridSize,
                                        },
                                    }}
                                    tableView={tableView}
                                />
                            </>
                        );
                    })}
                <InfiniteScroll
                    type='Transaction'
                    data={sortedTransactions}
                    tableView={tableView}
                    isAccountView={isAccountView}
                    sortBy={sortBy}
                    reverseSort={reverseSort}
                    showAllData={showAllData}
                    dataPerPage={50}
                    fetchCount={50}
                    targetCount={30}
                    sortTransactions={sortData}
                    txFetchType={fetchType}
                    txFetchAddress={addressToUse}
                    componentLock={infiniteScrollLock}
                />
            </ul>
        </div>
    );

    if (isSmallScreen)
        return (
            <div
                style={{
                    overflow: 'scroll',
                    height: '100%',
                    position: 'relative',
                }}
            >
                <div
                    style={{
                        position: 'sticky',
                        top: 0,
                        background: 'var(--dark2',
                        zIndex: '1',
                    }}
                >
                    {headerColumnsDisplay}
                </div>
                <div>{transactionDataOrNull}</div>
            </div>
        );

    return (
        <FlexContainer
            flexDirection='column'
            style={{ height: '100%', position: 'relative' }}
        >
            <div>{headerColumnsDisplay}</div>
            <div
                style={{
                    flex: 1,
                    overflow: 'auto',
                    transition: 'all .1s ease-in-out',
                    scrollbarGutter: 'stable',
                }}
                className='custom_scroll_ambient'
            >
                {(
                    isCandleSelected
                        ? dataLoadingStatus.isCandleDataLoading
                        : debouncedIsLoading
                ) ? (
                    <div style={{ height: isSmallScreen ? '80vh' : '100%' }}>
                        <Spinner size={100} bg='var(--dark1)' centered />
                    </div>
                ) : (
                    transactionDataOrNull
                )}
            </div>
        </FlexContainer>
    );
}

export default memo(Transactions);
