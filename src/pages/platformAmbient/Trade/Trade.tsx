import { NumberSize } from 're-resizable';
import {
    memo,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Outlet } from 'react-router-dom';

import { Direction } from 're-resizable/lib/resizer';
import {
    getFormattedNumber,
    getUnicodeCharacter,
} from '../../../ambient-utils/dataLayer';
import { CandleDataIF } from '../../../ambient-utils/types';
import { useSimulatedIsPoolInitialized } from '../../../App/hooks/useSimulatedIsPoolInitialized';
import { NoChartData } from '../../../components/NoChartData/NoChartData';
import TradeTabs2 from '../../../components/Trade/TradeTabs/TradeTabs2';
import { CandleContext } from '../../../contexts/CandleContext';
import { ChartContext } from '../../../contexts/ChartContext';
import { CrocEnvContext } from '../../../contexts/CrocEnvContext';
import { PoolContext } from '../../../contexts/PoolContext';
import { TokenContext } from '../../../contexts/TokenContext';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { TradeTableContext } from '../../../contexts/TradeTableContext';
import { FlexContainer } from '../../../styled/Common';
import {
    ChartContainer,
    MainSection,
    ResizableContainer,
} from '../../../styled/Components/Trade';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import { useUrlParams } from '../../../utils/hooks/useUrlParams';
import ChartToolbar from '../Chart/Draw/Toolbar/Toolbar';
import { TradeChartsHeader } from './TradeCharts/TradeChartsHeader/TradeChartsHeader';

import { AppStateContext } from '../../../contexts/AppStateContext';

import { useModal } from '../../../components/Global/Modal/useModal';
import TradeCharts from './TradeCharts/TradeCharts';

import TradeMobile from './TradeMobile';

const TRADE_CHART_MIN_HEIGHT = 175;

// React functional component
function Trade() {
    const showMobileVersion = useMediaQuery('(max-width: 768px)');

    const { provider } = useContext(CrocEnvContext);
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);
    const { setIsCandleSelected } = useContext(CandleContext);

    const {
        isFullScreen: isChartFullScreen,
        chartSettings,
        chartHeights,
        setChartHeight,
        canvasRef,
        tradeTableState,
        isChartHeightMinimum,
        isCandleDataNull,
        setIsChartHeightMinimum,
    } = useContext(ChartContext);

    const isPoolInitialized = useSimulatedIsPoolInitialized();

    const { tokens } = useContext(TokenContext);

    const { setOutsideControl, setSelectedOutsideTab } =
        useContext(TradeTableContext);

    const { baseToken, quoteToken, isDenomBase, limitTick } =
        useContext(TradeDataContext);

    const { urlParamMap, updateURL } = useUrlParams(tokens, chainId, provider);

    const [transactionFilter, setTransactionFilter] = useState<CandleDataIF>();
    const [selectedDate, setSelectedDate] = useState<number | undefined>();

    const tradeTableRef = useRef<HTMLDivElement>(null);

    const [hasInitialized, setHasInitialized] = useState(false);

    const changeState = useCallback(
        (isOpen: boolean | undefined, candleData: CandleDataIF | undefined) => {
            setIsCandleSelected(isOpen);
            setHasInitialized(false);
            setTransactionFilter(candleData);
            if (isOpen) {
                setOutsideControl(true);
                setSelectedOutsideTab(0);
            }
        },
        [],
    );

    const unselectCandle = useCallback(() => {
        setSelectedDate(undefined);
        changeState(false, undefined);
        setIsCandleSelected(false);
    }, []);

    useEffect(() => {
        unselectCandle();
    }, [chartSettings.candleTime.global.time, baseToken.name, quoteToken.name]);

    const [
        isMobileSettingsModalOpen,
        openMobileSettingsModal,
        closeMobileSettingsModal,
    ] = useModal();

    const tradeChartsProps = {
        changeState: changeState,
        selectedDate: selectedDate,
        setSelectedDate: setSelectedDate,
        updateURL,
        isMobileSettingsModalOpen,
        openMobileSettingsModal,
        closeMobileSettingsModal,
    };

    const tradeTabsProps = {
        filter: transactionFilter,
        setTransactionFilter: setTransactionFilter,
        changeState: changeState,
        selectedDate: selectedDate,
        setSelectedDate: setSelectedDate,
        hasInitialized: hasInitialized,
        setHasInitialized: setHasInitialized,
        unselectCandle: unselectCandle,
        candleTime: chartSettings.candleTime.global,
        tokens,
    };
    const {
        poolPriceDisplay,
        poolPriceChangePercent,

        usdPrice,
        isTradeDollarizationEnabled,
    } = useContext(PoolContext);
    const currencyCharacter = isDenomBase
        ? // denom in a, return token b character
          getUnicodeCharacter(quoteToken.symbol)
        : // denom in b, return token a character
          getUnicodeCharacter(baseToken.symbol);

    const poolPriceDisplayWithDenom = poolPriceDisplay
        ? isDenomBase
            ? 1 / poolPriceDisplay
            : poolPriceDisplay
        : 0;

    const truncatedPoolPrice = getFormattedNumber({
        value: poolPriceDisplayWithDenom,
        abbrevThreshold: 10000000, // use 'm', 'b' format > 10m
    });

    const poolPrice = isTradeDollarizationEnabled
        ? usdPrice
            ? getFormattedNumber({ value: usdPrice, prefix: '$' })
            : '…'
        : poolPriceDisplay === Infinity ||
            poolPriceDisplay === 0 ||
            poolPriceDisplay === undefined
          ? '…'
          : `${currencyCharacter}${truncatedPoolPrice}`;

    const poolPriceChangeString =
        poolPriceChangePercent === undefined ? '…' : poolPriceChangePercent;

    const tradeMobileProps = {
        changeState: changeState,
        selectedDate: selectedDate,
        setSelectedDate: setSelectedDate,
        updateURL,
        isMobileSettingsModalOpen,
        openMobileSettingsModal,
        closeMobileSettingsModal,

        filter: transactionFilter,
        setTransactionFilter: setTransactionFilter,
        transactionFilter,

        hasInitialized: hasInitialized,
        setHasInitialized: setHasInitialized,
        unselectCandle: unselectCandle,
        candleTime: chartSettings.candleTime.global,
        tokens,
        poolPrice,
        poolPriceChangeString,
    };

    if (showMobileVersion) return <TradeMobile {...tradeMobileProps} />;

    return (
        <>
            <MainSection isFill={false}>
                <FlexContainer
                    flexDirection='column'
                    fullWidth
                    background='dark2'
                    style={{
                        height: 'calc(100vh - 56px)',
                        ...(isChartFullScreen
                            ? { gridColumnStart: 1, gridColumnEnd: 3 }
                            : {}),
                    }}
                    ref={canvasRef}
                >
                    {!isChartFullScreen && <TradeChartsHeader tradePage />}
                    {/* This div acts as a parent to maintain a min/max for the resizable element below */}
                    <FlexContainer
                        flexDirection='column'
                        fullHeight
                        overflow='hidden'
                    >
                        <ResizableContainer
                            showResizeable={
                                !isCandleDataNull && !isChartFullScreen
                            }
                            isChartFullScreen={isChartFullScreen}
                            enable={{
                                bottom: !isChartFullScreen,
                                top: false,
                                left: false,
                                topLeft: false,
                                bottomLeft: false,
                                right: false,
                                topRight: false,
                                bottomRight: false,
                            }}
                            size={{
                                width: '100%',
                                height: isChartFullScreen
                                    ? '100%'
                                    : chartHeights.current,
                            }}
                            minHeight={4}
                            onResize={(
                                evt: MouseEvent | TouchEvent,
                                dir: Direction,
                                ref: HTMLElement,
                                d: NumberSize,
                            ) => {
                                if (
                                    chartHeights.current + d.height <
                                    TRADE_CHART_MIN_HEIGHT
                                ) {
                                    setIsChartHeightMinimum(true);
                                } else {
                                    setIsChartHeightMinimum(false);
                                }
                            }}
                            onResizeStart={() => {
                                // may be useful later
                            }}
                            onResizeStop={(
                                evt: MouseEvent | TouchEvent,
                                dir: Direction,
                                ref: HTMLElement,
                                d: NumberSize,
                            ) => {
                                if (
                                    chartHeights.current + d.height <
                                    TRADE_CHART_MIN_HEIGHT
                                ) {
                                    if (tradeTableState == 'Expanded') {
                                        setChartHeight(chartHeights.default);
                                    } else {
                                        setChartHeight(chartHeights.min);
                                    }
                                } else {
                                    setChartHeight(
                                        chartHeights.current + d.height,
                                    );
                                }
                            }}
                            bounds={'parent'}
                        >
                            {(isCandleDataNull || !isPoolInitialized) && (
                                <NoChartData
                                    chainId={chainId}
                                    tokenA={
                                        isDenomBase ? baseToken : quoteToken
                                    }
                                    tokenB={
                                        isDenomBase ? quoteToken : baseToken
                                    }
                                    isCandleDataNull
                                    isTableExpanded={
                                        tradeTableState == 'Expanded'
                                    }
                                    isPoolInitialized={isPoolInitialized}
                                />
                            )}
                            {!isCandleDataNull && isPoolInitialized && (
                                <ChartContainer fullScreen={isChartFullScreen}>
                                    {!isCandleDataNull && (
                                        <TradeCharts {...tradeChartsProps} />
                                    )}
                                </ChartContainer>
                            )}
                        </ResizableContainer>
                        {!isChartFullScreen && (
                            <FlexContainer
                                ref={tradeTableRef}
                                style={{ flex: 1 }}
                                overflow='hidden'
                                id='tx-table'
                            >
                                <TradeTabs2 {...tradeTabsProps} />
                            </FlexContainer>
                        )}
                    </FlexContainer>
                </FlexContainer>
                <FlexContainer
                    flexDirection='column'
                    fullHeight
                    fullWidth
                    background='dark1'
                    overflow='auto'
                >
                    <Outlet
                        context={{
                            urlParamMap: urlParamMap,
                            limitTick: limitTick,
                            updateURL: updateURL,
                        }}
                    />
                </FlexContainer>
                {!isChartHeightMinimum && <ChartToolbar />}
            </MainSection>
        </>
    );
}

export default memo(Trade);
