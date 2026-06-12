import * as d3 from 'd3';
import * as d3fc from 'd3fc';
import {
    MouseEvent,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useLocation } from 'react-router-dom';

import {
    fromDisplayPrice,
    pinTickLower,
    pinTickUpper,
    priceHalfAboveTick,
    priceHalfBelowTick,
    tickToPrice,
    toDisplayPrice,
} from '@crocswap-libs/sdk';
import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { candleTimeIF } from '../../../App/hooks/useChartSettings';
import useDebounce from '../../../App/hooks/useDebounce';
import { useDrawSettings } from '../../../App/hooks/useDrawSettings';
import { IS_LOCAL_ENV } from '../../../ambient-utils/constants';
import {
    diffHashSig,
    diffHashSigChart,
    diffHashSigScaleData,
    formatSubscript,
    getPinnedPriceValuesFromDisplayPrices,
    getPinnedPriceValuesFromTicks,
    getPinnedTickFromDisplayPrice,
} from '../../../ambient-utils/dataLayer';
import {
    pinTickToTickLower,
    pinTickToTickUpper,
} from '../../../ambient-utils/dataLayer/functions/pinTick';
import {
    CandleDataIF,
    CandleDomainIF,
    CandlesByPoolAndDurationIF,
    LimitOrderIF,
    TransactionIF,
} from '../../../ambient-utils/types';
import { GraphDataContext } from '../../../contexts';
import { AppStateContext } from '../../../contexts/AppStateContext';
import { CandleContext } from '../../../contexts/CandleContext';
import { ChartContext } from '../../../contexts/ChartContext';
import { PoolContext } from '../../../contexts/PoolContext';
import { RangeContext } from '../../../contexts/RangeContext';
import { SidebarContext } from '../../../contexts/SidebarContext';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { TradeTableContext } from '../../../contexts/TradeTableContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import useHandleSwipeBack from '../../../utils/hooks/useHandleSwipeBack';
import { linkGenMethodsIF, useLinkGen } from '../../../utils/hooks/useLinkGen';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import { updatesIF } from '../../../utils/hooks/useUrlParams';
import { formatDollarAmountAxis } from '../../../utils/numbers';
import ChartSettings from '../../Chart/ChartSettings/ChartSettings';
import { filterCandleWithTransaction } from '../../Chart/ChartUtils/discontinuityScaleUtils';
import XAxisCanvas from './Axes/xAxis/XaxisCanvas';
import YAxisCanvas from './Axes/yAxis/YaxisCanvas';
import CandleChart from './Candle/CandleChart';
import './Chart.css';
import { updateZeroPriceCandles } from './ChartUtils/candleDataUtils';
import {
    LS_KEY_CHART_ANNOTATIONS,
    defaultCandleBandwith,
    mainCanvasElementId,
    xAxisBuffer,
    xAxisHeightPixel,
    xAxisMobileBuffer,
} from './ChartUtils/chartConstants';
import {
    CandleDataChart,
    SubChartValue,
    bandLineData,
    calculateFibRetracement,
    calculateFibRetracementBandAreas,
    chartItemStates,
    checkShowLatestCandle,
    crosshair,
    findSnapTime,
    formatTimeDifference,
    getCandleCount,
    getInitialDisplayCandleCount,
    getXandYLocationForChart,
    getXandYLocationForChartDrag,
    lineData,
    lineValue,
    liquidityChartData,
    renderCanvasArray,
    renderSubchartCrCanvas,
    roundToNearestPreset,
    scaleData,
    selectedDrawnData,
    setCanvasResolution,
    timeGapsValue,
} from './ChartUtils/chartUtils';
import { checkCircleLocation, createCircle } from './ChartUtils/circle';
import useDollarPrice from './ChartUtils/getDollarPrice';
import { Zoom } from './ChartUtils/zoom';
import {
    createArrowPointsOfDPRangeLine,
    createBandArea,
    createPointsOfBandLine,
    createPointsOfDPRangeLine,
} from './Draw/DrawCanvas/BandArea';
import DragCanvas from './Draw/DrawCanvas/DragCanvas';
import DrawCanvas from './Draw/DrawCanvas/DrawCanvas';
import {
    createAnnotationLineSeries,
    createLinearLineSeries,
    distanceToLine,
} from './Draw/DrawCanvas/LinearLineSeries';
import FloatingToolbar from './Draw/FloatingToolbar/FloatingToolbar';
import FeeRateChart from './FeeRate/FeeRateChart';
import LimitLineChart from './LimitLine/LimitLineChart';
import LiquidityChart from './Liquidity/LiquidityChart';
import OrderHistoryCanvas from './OrderHistoryCh/OrderHistoryCanvas';
import OrderHistoryTooltip from './OrderHistoryCh/OrderHistoryTooltip';
import RangeLinesChart from './RangeLine/RangeLinesChart';
import TvlChart from './Tvl/TvlChart';
import VolumeBarCanvas from './Volume/VolumeBarCanvas';

interface propsIF {
    isTokenABase: boolean;
    liquidityData: liquidityChartData | undefined;
    changeState: (
        isOpen: boolean | undefined,
        candleData: CandleDataIF | undefined,
    ) => void;
    denomInBase: boolean;
    chartItemStates: chartItemStates;
    setCurrentData: React.Dispatch<
        React.SetStateAction<CandleDataIF | undefined>
    >;
    currentData: CandleDataIF | undefined;
    isCandleAdded: boolean | undefined;
    setIsCandleAdded: React.Dispatch<boolean>;
    scaleData: scaleData;
    poolPriceNonDisplay: number | undefined;
    selectedDate: number | undefined;
    setSelectedDate: React.Dispatch<number | undefined>;
    rescale: boolean | undefined;
    setRescale: React.Dispatch<React.SetStateAction<boolean>>;
    latest: boolean | undefined;
    setLatest: React.Dispatch<React.SetStateAction<boolean>>;
    reset: boolean | undefined;
    setReset: React.Dispatch<React.SetStateAction<boolean>>;
    showLatest: boolean | undefined;
    setShowLatest: React.Dispatch<React.SetStateAction<boolean>>;
    setShowTooltip: React.Dispatch<React.SetStateAction<boolean>>;
    liquidityScale: d3.ScaleLinear<number, number> | undefined;
    liquidityDepthScale: d3.ScaleLinear<number, number> | undefined;
    candleTime: candleTimeIF;
    unparsedData: CandlesByPoolAndDurationIF;
    prevPeriod: number;
    candleTimeInSeconds: number | undefined;
    updateURL: (changes: updatesIF) => void;
    userTransactionData: Array<TransactionIF> | undefined;
    setPrevCandleCount: React.Dispatch<React.SetStateAction<number>>;
    setChartResetStatus: React.Dispatch<
        React.SetStateAction<{
            isResetChart: boolean;
        }>
    >;
    chartResetStatus: {
        isResetChart: boolean;
    };
    openMobileSettingsModal: () => void;
    isMobileSettingsModalOpen: boolean;
}

export default function Chart(props: propsIF) {
    const {
        isTokenABase,
        denomInBase,
        scaleData,
        poolPriceNonDisplay,
        selectedDate,
        setSelectedDate,
        rescale,
        setRescale,
        reset,
        setReset,
        showLatest,
        setShowLatest,
        latest,
        setLatest,
        liquidityData,
        liquidityScale,
        liquidityDepthScale,
        unparsedData,
        prevPeriod,
        candleTimeInSeconds,
        updateURL,
        userTransactionData,
        setPrevCandleCount,
        setChartResetStatus,
        chartResetStatus,
        // openMobileSettingsModal,
        isMobileSettingsModalOpen,
    } = props;

    const {
        tokenA,
        tokenB,
        isDenomBase,
        isTokenABase: isBid,
        setIsTokenAPrimary,
        limitTick,
        setLimitTick,
        currentPoolPriceTick,
        noGoZoneBoundaries,
        setNoGoZoneBoundaries,
    } = useContext(TradeDataContext);
    const {
        activeNetwork: { gridSize, chainId },
    } = useContext(AppStateContext);
    const {
        sidebar: { isOpen: isSidebarOpen },
    } = useContext(SidebarContext);
    const {
        isMagnetActive,
        setIsChangeScaleChart,
        isToolbarOpen,
        toolbarRef,
        activeDrawingType,
        setActiveDrawingType,
        selectedDrawnShape,
        setSelectedDrawnShape,
        undoRedoOptions: {
            drawnShapeHistory,
            setDrawnShapeHistory,
            undo,
            redo,
            drawActionStack,
            undoStack,
            addDrawActionStack,
            deleteItem,
        },
        isMagnetActiveLocal,
        setChartContainerOptions,
        chartThemeColors,
        contextmenu,
        setContextmenu,
        contextMenuPlacement,
        setContextMenuPlacement,
        shouldResetBuffer,
        setShouldResetBuffer,
        colorChangeTrigger,
        setColorChangeTrigger,
        chartSettingsRef,
    } = useContext(ChartContext);
    const {
        setCandleDomains,
        setCandleScale,
        candleScale,
        candleDomains,
        timeOfEndCandle,
        isCondensedModeEnabled,
        setIsCondensedModeEnabled,
        setCandleData,
    } = useContext(CandleContext);
    const { poolPriceDisplay: poolPriceWithoutDenom } = useContext(PoolContext);
    const { advancedMode, setIsLinesSwitched } = useContext(RangeContext);

    const [isUpdatingShape, setIsUpdatingShape] = useState(false);

    const [isDragActive, setIsDragActive] = useState(false);

    const [localCandleDomains, setLocalCandleDomains] =
        useState<CandleDomainIF>({
            lastCandleDate: undefined,
            domainBoundry: undefined,
            isAbortedRequest: false,
            isResetRequest: false,
            isCondensedFetching: false,
        });

    const {
        minRangePrice: minPrice,
        setMinRangePrice: setMinPrice,
        maxRangePrice: maxPrice,
        setMaxRangePrice: setMaxPrice,
        rescaleRangeBoundariesWithSlider,
        chartTriggeredBy,
        setChartTriggeredBy,
        simpleRangeWidth: rangeSimpleRangeWidth,
        setSimpleRangeWidth: setRangeSimpleRangeWidth,
    } = useContext(RangeContext);

    const { userPositionsByPool, userLimitOrdersByPool } =
        useContext(GraphDataContext);

    const [isChartZoom, setIsChartZoom] = useState(false);
    const [cursorStyleTrigger, setCursorStyleTrigger] = useState(false);

    const { isUserConnected } = useContext(UserDataContext);

    const [minTickForLimit, setMinTickForLimit] = useState<number>(0);
    const [maxTickForLimit, setMaxTickForLimit] = useState<number>(0);
    const [isShowFloatingToolbar, setIsShowFloatingToolbar] = useState(false);
    const [handleDocumentEvent, setHandleDocumentEvent] = useState();
    const period = unparsedData.duration;

    const side =
        (isDenomBase && !isBid) || (!isDenomBase && isBid) ? 'buy' : 'sell';
    const sellOrderStyle = side === 'sell' ? 'order_sell' : 'order_buy';
    // const [activeDrawingType, setActiveDrawingType] = useState('Cross');

    const [chartMousemoveEvent, setChartMousemoveEvent] = useState<
        MouseEvent<HTMLDivElement> | undefined
    >(undefined);
    const [mouseLeaveEvent, setMouseLeaveEvent] =
        useState<MouseEvent<HTMLDivElement>>();
    const [chartZoomEvent, setChartZoomEvent] = useState('');
    const [timeGaps, setTimeGaps] = useState<timeGapsValue[]>([]);

    const {
        showFeeRate,
        showTvl,
        showVolume,
        liqMode,
        showSwap,
        showLiquidity,
        showHistorical,
    } = props.chartItemStates;

    const poolPriceDisplay = poolPriceWithoutDenom
        ? isDenomBase && poolPriceWithoutDenom
            ? 1 / poolPriceWithoutDenom
            : (poolPriceWithoutDenom ?? 0)
        : 0;

    const d3Container = useRef<HTMLDivElement | null>(null);
    // const toolbarRef = useRef<HTMLDivElement | null>(null);
    const d3XaxisRef = useRef<HTMLInputElement | null>(null);

    const d3CanvasCrosshair = useRef<HTMLCanvasElement | null>(null);
    const d3CanvasMarketLine = useRef<HTMLCanvasElement | null>(null);
    const d3CanvasMain = useRef<HTMLDivElement | null>(null);

    const location = useLocation();

    const simpleRangeWidth = rangeSimpleRangeWidth;
    const setSimpleRangeWidth = setRangeSimpleRangeWidth;

    const tokenADecimals = tokenA.decimals;
    const tokenBDecimals = tokenB.decimals;
    const baseTokenDecimals = isTokenABase ? tokenADecimals : tokenBDecimals;
    const quoteTokenDecimals = !isTokenABase ? tokenADecimals : tokenBDecimals;
    const [ranges, setRanges] = useState<lineValue[]>([
        {
            name: 'Min',
            value: 0,
        },
        {
            name: 'Max',
            value: 0,
        },
    ]);

    const [limit, setLimit] = useState<number>(0);

    const [boundaries, setBoundaries] = useState<boolean>();
    const [isShapeEdited, setIsShapeEdited] = useState<boolean>();

    const [isLineDrag, setIsLineDrag] = useState(false);

    // Data
    const [crosshairData, setCrosshairData] = useState<crosshair[]>([
        { x: 0, y: 0 },
    ]);

    // Draw
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lineSeries, setLineSeries] = useState<any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [annotationLineSeries, setAnnotationLineSeries] = useState<any>();

    const [hoveredDrawnShape, setHoveredDrawnShape] = useState<
        selectedDrawnData | undefined
    >(undefined);

    const [hoveredOrderHistory, setHoveredOrderHistory] = useState<{
        type: string;
        id: string;
        totalValueUSD: number;
        tokenFlowDecimalCorrected: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        order: any;
    }>();

    const [isHoveredOrderHistory, setIsHoveredOrderHistory] =
        useState<boolean>(false);

    const [isSelectedOrderHistory, setIsSelectedOrderHistory] =
        useState<boolean>(false);

    const [selectedOrderHistory, setSelectedOrderHistory] = useState<{
        type: string;
        id: string;
        totalValueUSD: number;
        tokenFlowDecimalCorrected: number;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        order: any;
    }>();

    const [hoverOHTooltip, setHoverOHTooltip] = useState<boolean>(true);

    const [hoveredOrderTooltipPlacement, setHoveredOrderTooltipPlacement] =
        useState<{ top: number; left: number; isOnLeftSide: boolean }>();
    const [selectedOrderTooltipPlacement, setSelectedOrderTooltipPlacement] =
        useState<{ top: number; left: number; isOnLeftSide: boolean }>();

    const [circleScale, setCircleScale] =
        useState<d3.ScaleLinear<number, number>>();

    const [shouldDisableChartSettings, setShouldDisableChartSettings] =
        useState<boolean>(true);
    const [closeOutherChartSetting, setCloseOutherChartSetting] =
        useState<boolean>(false);

    const mobileView = useMediaQuery('(max-width: 800px)');
    const tabletView = useMediaQuery(
        '(min-width: 768px) and (max-width: 1200px)',
    );

    const drawSettings = useDrawSettings(chartThemeColors);
    const getDollarPrice = useDollarPrice();

    const {
        setCurrentTxActiveInTransactions,
        setShowAllData,
        setOutsideControl,
        setSelectedOutsideTab,
        setCurrentPositionActive,
        setCurrentLimitOrderActive,
    } = useContext(TradeTableContext);

    const clickOutsideChartHandler = (event: Event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = event.target as any;

        const el = chartSettingsRef?.current;

        const contextButton = document.getElementById('chart_settings_button');
        const contextButtonTablet = document.getElementById(
            'chart_settings_tooltip_tablet',
        );

        if (
            (contextButtonTablet && contextButtonTablet.contains(e as Node)) ||
            (contextButton && contextButton.contains(e as Node)) ||
            el?.contains((e as Node) || null)
        ) {
            return;
        }

        if (!shouldDisableChartSettings) {
            setCloseOutherChartSetting(true);
        }

        if (shouldDisableChartSettings) {
            setContextmenu(false);
        }
    };

    const isShowLatestCandle = useMemo(() => {
        return checkShowLatestCandle(period, scaleData?.xScale);
    }, [period, diffHashSigScaleData(scaleData, 'x')]);

    /**
     * This function processes a given data array to calculate discontinuities in time intervals and updates them.
     * @param data
     */
    const calculateDiscontinuityRange = async (data: CandleDataChart[]) => {
        // timeGaps each element in the data array represents a time interval and consists of two dates: [candleDate, shiftDate].

        const timesToCheck = data
            .filter((i) => i.isShowData)
            .map((item) => item.time * 1000);

        const filterTimeGapsNotInclude = timeGaps.filter(
            (item) => !timesToCheck.some((time) => time === item.range[1]),
        );
        const localTimeGaps: { range: number[]; isAddedPixel: boolean }[] =
            structuredClone(filterTimeGapsNotInclude);
        let notTransactionDataTime: undefined | number = undefined;
        let transationDataTime: undefined | number = undefined;
        if (scaleData) {
            data.slice(1).forEach((item) => {
                if (notTransactionDataTime === undefined && !item.isShowData) {
                    notTransactionDataTime = item.time * 1000;
                }
                if (notTransactionDataTime !== undefined && item.isShowData) {
                    transationDataTime = item.time * 1000;
                }
                if (notTransactionDataTime && transationDataTime) {
                    const newRange = [
                        transationDataTime,
                        notTransactionDataTime,
                    ];

                    const isRangeExists = localTimeGaps.findIndex(
                        (gap: timeGapsValue) => gap.range[0] === newRange[0],
                    );
                    const isRangeExistsNoTransaction = localTimeGaps.findIndex(
                        (gap: timeGapsValue) => gap.range[1] === newRange[1],
                    );

                    const isSameRange = localTimeGaps.some(
                        (gap: timeGapsValue) =>
                            gap.range[0] === newRange[0] &&
                            gap.range[1] === newRange[1],
                    );

                    if (!isSameRange) {
                        if (isRangeExists !== -1) {
                            localTimeGaps[isRangeExists].range[1] =
                                notTransactionDataTime;
                            localTimeGaps[isRangeExists].isAddedPixel = false;
                        } else if (isRangeExistsNoTransaction !== -1) {
                            localTimeGaps[isRangeExistsNoTransaction].range[0] =
                                transationDataTime;
                            localTimeGaps[
                                isRangeExistsNoTransaction
                            ].isAddedPixel = false;
                        } else {
                            localTimeGaps.push({
                                range: newRange,
                                isAddedPixel: false,
                            });
                        }
                    }

                    notTransactionDataTime = undefined;
                    transationDataTime = undefined;
                }
            });

            setTimeGaps(localTimeGaps);
        }
    };

    const calculateVisibleCandles = (
        scaleData: scaleData | undefined,
        unparsedCandleData: CandleDataChart[],
        period: number,
        numberOfCandlesToDisplay: number,
    ) => {
        if (scaleData) {
            const xmin =
                scaleData.xScale.domain()[0] -
                period * 1000 * numberOfCandlesToDisplay;
            const xmax =
                scaleData.xScale.domain()[1] +
                period * 1000 * numberOfCandlesToDisplay;

            const filtered = unparsedCandleData.filter(
                (data: CandleDataChart) =>
                    data.time * 1000 >= xmin &&
                    data.time * 1000 <= xmax &&
                    (data.isShowData || !isCondensedModeEnabled),
            );

            return filtered;
        }
        return unparsedCandleData.filter(
            (data: CandleDataChart) =>
                data.isShowData || !isCondensedModeEnabled,
        );
    };

    const minimum = (data: CandleDataIF[], mouseX: number) => {
        const xScale = scaleData?.xScale;
        if (xScale) {
            const accessor = (d: CandleDataIF) =>
                Math.abs(mouseX - xScale(d.time * 1000));

            return data
                .map(function (dataPoint: CandleDataIF) {
                    return [accessor(dataPoint), dataPoint];
                })
                .reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    function (accumulator: any, dataPoint: any) {
                        return accumulator[0] > dataPoint[0]
                            ? dataPoint
                            : accumulator;
                    },
                    [Number.MAX_VALUE, null],
                );
        }
    };

    // finds candle closest to the mouse
    const snapForCandle = (point: number, filtered: Array<CandleDataIF>) => {
        if (scaleData) {
            if (point == undefined) return [];
            if (filtered.length > 1) {
                const nearest = minimum(filtered, point)[1];
                return nearest;
            }
        }

        return filtered[0];
    };

    const unparsedCandleData = useMemo(() => {
        const updatedZeroCandles = updateZeroPriceCandles(
            unparsedData.candles,
            poolPriceWithoutDenom ? poolPriceWithoutDenom : 0,
        );
        const data = filterCandleWithTransaction(
            updatedZeroCandles,
            period,
        ).sort((a, b) => b.time - a.time);

        calculateDiscontinuityRange(data);
        return calculateVisibleCandles(
            scaleData,
            data,
            period,
            mobileView ? 300 : 100,
        ) as CandleDataChart[];
    }, [
        diffHashSigChart(unparsedData.candles),
        poolPriceWithoutDenom,
        isShowLatestCandle,
        isCondensedModeEnabled,
        diffHashSigScaleData(scaleData, 'x'),
    ]);
    const visibleCandleData = useMemo(() => {
        const data = calculateVisibleCandles(
            scaleData,
            unparsedCandleData,
            period,
            0,
        ) as CandleDataChart[];

        const filtered = data.filter(
            (i) => i.isShowData || !isCondensedModeEnabled,
        );

        return filtered;
    }, [
        diffHashSigScaleData(scaleData),
        unparsedCandleData,
        isCondensedModeEnabled,
    ]);

    const closestValue = (
        data: Array<{
            order: TransactionIF;
            totalValueUSD: number;
            tokenFlowDecimalCorrected: number;
            mergedIds: Array<{ hash: string; type: string }>;
        }>,
        pointX: number,
        pointY: number,
    ) => {
        const xScale = scaleData?.xScale;
        const yScale = scaleData?.yScale;

        if (xScale && yScale) {
            const accessor = (d: TransactionIF) =>
                Math.sqrt(
                    Math.pow(pointX - xScale(d.txTime * 1000), 2) +
                        Math.pow(
                            pointY -
                                yScale(
                                    denomInBase
                                        ? d.swapInvPriceDecimalCorrected
                                        : d.swapPriceDecimalCorrected,
                                ),
                            2,
                        ),
                );
            return data
                .map(function (dataPoint: {
                    order: TransactionIF;
                    totalValueUSD: number;
                    tokenFlowDecimalCorrected: number;
                    mergedIds: Array<{ hash: string; type: string }>;
                }) {
                    return [accessor(dataPoint.order), dataPoint];
                })
                .reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    function (accumulator: any, dataPoint: any) {
                        return accumulator[0] > dataPoint[0]
                            ? dataPoint
                            : accumulator;
                    },
                    [Number.MAX_VALUE, null],
                );
        }
    };

    const closestLimitValue = (
        data: Array<{
            order: LimitOrderIF;
            totalValueUSD: number;
            tokenFlowDecimalCorrected: number;
            mergedIds: Array<{ hash: string; type: string }>;
        }>,
        pointX: number,
        pointY: number,
    ) => {
        const xScale = scaleData?.xScale;
        const yScale = scaleData?.yScale;

        if (xScale && yScale) {
            const accessor = (d: LimitOrderIF) =>
                Math.sqrt(
                    Math.pow(pointX - xScale(d.crossTime * 1000), 2) +
                        Math.pow(
                            pointY -
                                yScale(
                                    denomInBase
                                        ? d.invLimitPriceDecimalCorrected
                                        : d.limitPriceDecimalCorrected,
                                ),
                            2,
                        ),
                );
            return data
                .map(function (dataPoint: {
                    order: LimitOrderIF;
                    totalValueUSD: number;
                    tokenFlowDecimalCorrected: number;
                    mergedIds: Array<{ hash: string; type: string }>;
                }) {
                    return [accessor(dataPoint.order), dataPoint];
                })
                .reduce(
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    function (accumulator: any, dataPoint: any) {
                        return accumulator[0] > dataPoint[0]
                            ? dataPoint
                            : accumulator;
                    },
                    [Number.MAX_VALUE, null],
                );
        }
    };

    const filteredTransactionalData = useMemo(() => {
        if (
            userTransactionData &&
            showSwap &&
            scaleData &&
            d3CanvasMain.current !== null
        ) {
            const canvas = d3
                .select(d3CanvasMain.current)
                .select('canvas')
                .node() as HTMLCanvasElement;

            const rectCanvas = canvas.getBoundingClientRect();
            const width = rectCanvas.width;
            scaleData.xScale.range([0, width]);

            const mergedSellArray: Array<{
                order: TransactionIF;
                totalValueUSD: number;
                tokenFlowDecimalCorrected: number;
                mergedIds: Array<{ hash: string; type: string }>;
            }> = [];
            const mergedBuyArray: Array<{
                order: TransactionIF;
                totalValueUSD: number;
                tokenFlowDecimalCorrected: number;
                mergedIds: Array<{ hash: string; type: string }>;
            }> = [];
            const mergedLimitSellArray: Array<{
                order: TransactionIF;
                totalValueUSD: number;
                tokenFlowDecimalCorrected: number;
                mergedIds: Array<{ hash: string; type: string }>;
            }> = [];
            const mergedLimitBuyArray: Array<{
                order: TransactionIF;
                totalValueUSD: number;
                tokenFlowDecimalCorrected: number;
                mergedIds: Array<{ hash: string; type: string }>;
            }> = [];

            const leftDomain = scaleData.xScale.domain()[0] / 1000;
            const rightDomain = scaleData.xScale.domain()[1] / 1000;

            const userSwaps: Array<TransactionIF> = userTransactionData.filter(
                (transaction) => transaction.entityType === 'swap',
            );

            const userClaimedLimit = userTransactionData.filter(
                (transaction) =>
                    transaction.entityType === 'limitOrder' &&
                    transaction.changeType === 'recover',
            );

            userClaimedLimit.forEach((limit) => {
                limit.swapInvPriceDecimalCorrected =
                    limit.invLimitPriceDecimalCorrected;
                limit.swapPriceDecimalCorrected =
                    limit.limitPriceDecimalCorrected;
                limit.baseFlowDecimalCorrected = Math.abs(
                    limit.baseFlowDecimalCorrected,
                );
            });

            userSwaps.push(...userClaimedLimit);

            const sortedUserSwaps = userSwaps.sort((a, b) =>
                d3.descending(a.txTime, b.txTime),
            );

            if (leftDomain !== undefined && rightDomain !== undefined) {
                sortedUserSwaps.map((swap) => {
                    if (swap.txTime > leftDomain && swap.txTime < rightDomain) {
                        const mergedIds: Array<{ hash: string; type: string }> =
                            [];

                        mergedIds.push({
                            hash: swap.txHash,
                            type: swap.entityType,
                        });

                        const totalValueUSD = swap.totalValueUSD;

                        const limitTick = swap.isBid
                            ? swap.askTick
                            : swap.bidTick;

                        const gridSize = lookupChain(swap.chainId).gridSize;

                        const priceHalfAbove = toDisplayPrice(
                            priceHalfAboveTick(limitTick, gridSize),
                            swap.baseDecimals,
                            swap.quoteDecimals,
                        );
                        const priceHalfBelow = toDisplayPrice(
                            priceHalfBelowTick(limitTick, gridSize),
                            swap.baseDecimals,
                            swap.quoteDecimals,
                        );

                        const middlePriceDisplayNum = isDenomBase
                            ? swap.isBid
                                ? 1 / priceHalfBelow
                                : 1 / priceHalfAbove
                            : swap.isBid
                              ? priceHalfBelow
                              : priceHalfAbove;

                        const baseFlowAbsNum = swap.baseFlowDecimalCorrected;

                        const quoteFlowDisplayNum =
                            swap.quoteFlowDecimalCorrected;
                        const quoteFlowAbsNum = Math.abs(quoteFlowDisplayNum);

                        const estimatedBaseFlowDisplay = isDenomBase
                            ? quoteFlowAbsNum / middlePriceDisplayNum
                            : quoteFlowAbsNum * middlePriceDisplayNum;

                        const estimatedQuoteFlowDisplay = isDenomBase
                            ? baseFlowAbsNum * middlePriceDisplayNum
                            : baseFlowAbsNum / middlePriceDisplayNum;

                        const tokenFlowDecimalCorrected =
                            swap.entityType === 'limitOrder'
                                ? Math.abs(
                                      swap.isBuy
                                          ? denomInBase
                                              ? estimatedBaseFlowDisplay
                                              : swap.quoteFlowDecimalCorrected
                                          : denomInBase
                                            ? swap.baseFlowDecimalCorrected
                                            : estimatedQuoteFlowDisplay,
                                  )
                                : denomInBase
                                  ? swap.baseFlowDecimalCorrected
                                  : swap.quoteFlowDecimalCorrected;

                        const selectedArray = swap.isBuy
                            ? swap.entityType === 'limitOrder'
                                ? mergedLimitBuyArray
                                : mergedBuyArray
                            : swap.entityType === 'limitOrder'
                              ? mergedLimitSellArray
                              : mergedSellArray;

                        if (selectedArray.length > 0) {
                            const nearestSwap = closestValue(
                                selectedArray,
                                scaleData.xScale(swap.txTime * 1000),
                                scaleData.yScale(
                                    denomInBase
                                        ? swap.swapInvPriceDecimalCorrected
                                        : swap.swapPriceDecimalCorrected,
                                ),
                            );

                            const shouldMerge = nearestSwap[0] < 30;

                            if (shouldMerge) {
                                const order =
                                    swap.totalValueUSD >
                                    nearestSwap[1].order.totalValueUSD
                                        ? swap
                                        : nearestSwap[1].order;

                                const mergedMergeIds = nearestSwap[1].mergedIds;

                                nearestSwap[1].order = order;

                                nearestSwap[1].mergedIds =
                                    mergedIds.concat(mergedMergeIds);

                                nearestSwap[1].totalValueUSD += totalValueUSD;
                                nearestSwap[1].tokenFlowDecimalCorrected +=
                                    tokenFlowDecimalCorrected;
                            } else {
                                selectedArray.push({
                                    order: swap,
                                    mergedIds: mergedIds,
                                    totalValueUSD: totalValueUSD,
                                    tokenFlowDecimalCorrected:
                                        tokenFlowDecimalCorrected,
                                });
                            }
                        } else {
                            selectedArray.push({
                                order: swap,
                                mergedIds: mergedIds,
                                totalValueUSD: totalValueUSD,
                                tokenFlowDecimalCorrected:
                                    tokenFlowDecimalCorrected,
                            });
                        }
                    }
                });
            }

            return [
                ...mergedBuyArray,
                ...mergedSellArray,
                ...mergedLimitBuyArray,
                ...mergedLimitSellArray,
            ];
        }

        return undefined;
    }, [
        userTransactionData,
        diffHashSigScaleData(scaleData, 'x'),
        showSwap,
        denomInBase,
    ]);

    const filteredLimitTxData = useMemo(() => {
        if (
            userTransactionData &&
            userLimitOrdersByPool &&
            showSwap &&
            scaleData &&
            d3CanvasMain.current !== null
        ) {
            const userLimitOrderHistory = userTransactionData.filter(
                (transaction) =>
                    transaction.entityType === 'limitOrder' &&
                    transaction.changeType === 'mint',
            );

            const processLimitOrder = (entity: LimitOrderIF) => {
                const mintedInTick = userLimitOrderHistory.filter(
                    (his) =>
                        his.isBuy === entity.isBid &&
                        his.bidTick === entity.bidTick &&
                        his.askTick === entity.askTick,
                );

                if (mintedInTick?.length > 0) {
                    return mintedInTick;
                }
            };

            const canvas = d3
                .select(d3CanvasMain.current)
                .select('canvas')
                .node() as HTMLCanvasElement;

            const rectCanvas = canvas.getBoundingClientRect();
            const width = rectCanvas.width;
            scaleData.xScale.range([0, width]);

            const mergedSellArray: Array<{
                order: LimitOrderIF;
                totalValueUSD: number;
                tokenFlowDecimalCorrected: number;
                mergedIds: Array<{ hash: string; type: string }>;
            }> = [];
            const mergedBuyArray: Array<{
                order: LimitOrderIF;
                totalValueUSD: number;
                tokenFlowDecimalCorrected: number;
                mergedIds: Array<{ hash: string; type: string }>;
            }> = [];

            const leftDomain = scaleData.xScale.domain()[0] / 1000;
            const rightDomain = scaleData.xScale.domain()[1] / 1000;

            const userLimitTx: Array<LimitOrderIF> =
                userLimitOrdersByPool.limitOrders;

            const sortedUserLimits = userLimitTx?.sort((a, b) =>
                d3.descending(a.crossTime, b.crossTime),
            );

            if (leftDomain !== undefined && rightDomain !== undefined) {
                sortedUserLimits.map((limit) => {
                    if (
                        limit.crossTime > leftDomain &&
                        limit.crossTime < rightDomain
                    ) {
                        const mergedIds: Array<{ hash: string; type: string }> =
                            [];

                        const selectedArray = limit.isBid
                            ? mergedBuyArray
                            : mergedSellArray;

                        const mintedInTick = processLimitOrder(limit);

                        mintedInTick?.forEach((mint) => {
                            const isIn = mergedIds.find(
                                (id) => id.hash === mint.txHash,
                            );

                            if (isIn === undefined) {
                                mergedIds.push({
                                    hash: mint.txHash,
                                    type: mint.entityType,
                                });
                            }
                        });

                        const tokenFlowDecimalCorrected = limit.isBid
                            ? denomInBase
                                ? limit.originalPositionLiqBaseDecimalCorrected
                                : limit.expectedPositionLiqQuoteDecimalCorrected
                            : denomInBase
                              ? limit.expectedPositionLiqBaseDecimalCorrected
                              : limit.originalPositionLiqQuoteDecimalCorrected;

                        if (selectedArray.length > 0) {
                            const nearestSwap = closestLimitValue(
                                selectedArray,
                                scaleData.xScale(limit.crossTime * 1000),
                                scaleData.yScale(
                                    denomInBase
                                        ? limit.invLimitPriceDecimalCorrected
                                        : limit.limitPriceDecimalCorrected,
                                ),
                            );

                            const shouldMerge = nearestSwap[0] < 30;

                            if (shouldMerge) {
                                const order =
                                    limit.totalValueUSD >
                                    nearestSwap[1].totalValueUSD
                                        ? limit
                                        : nearestSwap[1].order;

                                const selectedLimitAndNearestLimitMergeIds =
                                    mergedIds.concat(nearestSwap[1].mergedIds);

                                nearestSwap[1].order = order;
                                nearestSwap[1].mergedIds =
                                    selectedLimitAndNearestLimitMergeIds;

                                nearestSwap[1].totalValueUSD +=
                                    limit.totalValueUSD;

                                nearestSwap[1].tokenFlowDecimalCorrected +=
                                    tokenFlowDecimalCorrected;
                            } else {
                                selectedArray.push({
                                    order: limit,
                                    mergedIds: mergedIds,
                                    totalValueUSD: limit.totalValueUSD,
                                    tokenFlowDecimalCorrected:
                                        tokenFlowDecimalCorrected,
                                });
                            }
                        } else {
                            selectedArray.push({
                                order: limit,
                                mergedIds: mergedIds,
                                totalValueUSD: limit.totalValueUSD,
                                tokenFlowDecimalCorrected:
                                    tokenFlowDecimalCorrected,
                            });
                        }
                    }
                });
            }

            return mergedBuyArray.concat(mergedSellArray);
        }
    }, [
        userTransactionData,
        diffHashSigScaleData(scaleData, 'x'),
        showSwap,
        denomInBase,
    ]);

    const lastCandleData = unparsedData.candles?.reduce(
        function (prev, current) {
            return prev.time > current.time ? prev : current;
        },
    );

    const firstCandleData = unparsedData.candles?.reduce(
        function (prev, current) {
            return prev.time < current.time ? prev : current;
        },
    );

    const [visibleDateForCandle, setVisibleDateForCandle] = useState(
        lastCandleData.time * 1000,
    );

    const [bandwidth, setBandwidth] = useState(5);

    const toolbarWidth = isToolbarOpen ? 38 : 15;

    const [prevlastCandleTime, setPrevLastCandleTime] = useState<number>(
        lastCandleData.time,
    );
    const [subChartValues, setsubChartValues] = useState([
        {
            name: 'feeRate',
            value: lastCandleData?.averageLiquidityFee,
        },
        {
            name: 'tvl',
            value: lastCandleData?.tvlData.tvl,
        },
        {
            name: 'volume',
            value: undefined,
        },
    ]);
    // Crosshairs
    const [liqTooltip, setLiqTooltip] =
        useState<d3.Selection<HTMLDivElement, unknown, null, undefined>>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [xAxisTooltip, setXaxisTooltip] = useState<any>();
    const [crosshairActive, setCrosshairActive] = useState<string>('none');
    const [xAxisActiveTooltip, setXaxisActiveTooltip] = useState('');

    // Crosshairs
    const [crosshairVerticalCanvas, setCrosshairVerticalCanvas] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useState<any>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [crosshairHorizontal, setCrosshairHorizontal] = useState<any>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [marketLine, setMarketLine] = useState<any>();

    const [mainZoom, setMainZoom] =
        useState<d3.ZoomBehavior<Element, unknown>>();

    // Drag
    const initialDragState: d3.DragBehavior<
        d3.DraggedElementBaseType,
        unknown,
        d3.SubjectPosition
    > | null = null;
    const [dragRange, setDragRange] = useState<d3.DragBehavior<
        d3.DraggedElementBaseType,
        unknown,
        d3.SubjectPosition
    > | null>(initialDragState);
    const [dragLimit, setDragLimit] = useState<d3.DragBehavior<
        d3.DraggedElementBaseType,
        unknown,
        d3.SubjectPosition
    > | null>(initialDragState);

    const [mainCanvasBoundingClientRect, setMainCanvasBoundingClientRect] =
        useState<DOMRect | undefined>();

    const [yAxisWidth, setYaxisWidth] = useState('4rem');

    const [
        isOnCandleOrVolumeMouseLocation,
        setIsOnCandleOrVolumeMouseLocation,
    ] = useState(false);

    const [checkLimitOrder, setCheckLimitOrder] = useState<boolean>(false);

    const isScientific = poolPriceNonDisplay
        ? poolPriceNonDisplay.toString().includes('e')
        : false;

    const debouncedGetNewCandleDataRight = useDebounce(localCandleDomains, 500);

    const zoomBase = useMemo(() => {
        return new Zoom(
            setLocalCandleDomains,
            period,
            isCondensedModeEnabled,
            candleDomains,
            timeGaps,
        );
    }, [period, isCondensedModeEnabled, timeGaps]);

    const chartPoolPrice = useMemo(() => {
        let poolPrice = poolPriceDisplay;
        const currentTime = findSnapTime(Date.now(), period) - period * 1000;
        if (unparsedData.candles.some((i) => i.time * 1000 === currentTime)) {
            const marketPrice = isDenomBase
                ? lastCandleData.invPriceCloseDecimalCorrected
                : lastCandleData.priceCloseDecimalCorrected;

            if (marketPrice !== 0 && Math.abs(marketPrice) !== Infinity) {
                poolPrice = marketPrice;
            }
        }

        return poolPrice;
    }, [
        lastCandleData.invMaxPriceDecimalCorrected,
        lastCandleData.priceCloseDecimalCorrected,
        diffHashSigScaleData(scaleData, 'x'),
        poolPriceDisplay,
        isDenomBase,
    ]);
    useEffect(() => {
        useHandleSwipeBack(d3Container, toolbarRef);
    }, [d3Container === null]);

    useEffect(() => {
        if (
            localCandleDomains.domainBoundry &&
            localCandleDomains.lastCandleDate
        ) {
            if (visibleCandleData.length > 0) {
                const minDomain = scaleData.xScale.domain()[0];
                const visibleCandleDataFirstCandleTime =
                    visibleCandleData[visibleCandleData.length - 1]?.time *
                    1000;

                if (
                    Math.floor(
                        (visibleCandleDataFirstCandleTime - minDomain) /
                            (period * 1000),
                    ) > 2
                ) {
                    localCandleDomains.lastCandleDate =
                        visibleCandleDataFirstCandleTime;
                }
            }
            setCandleDomains(localCandleDomains);
        }
    }, [debouncedGetNewCandleDataRight]);

    const render = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nd = d3.select('#d3fc_group').node() as any;
        if (nd) nd.requestRedraw();
    }, []);

    // controls the distance of the mouse to the range lines, if close, activates the dragRange event
    const canUserDragRange = useMemo<boolean>(() => {
        if (
            chartMousemoveEvent &&
            mainCanvasBoundingClientRect &&
            (location.pathname.includes('pool') ||
                location.pathname.includes('reposition')) &&
            !(!advancedMode && simpleRangeWidth === 100) &&
            scaleData
        ) {
            const offsetY =
                chartMousemoveEvent.clientY - mainCanvasBoundingClientRect?.top;
            const mousePlacement = scaleData?.yScale.invert(offsetY);
            const lineBuffer =
                (scaleData?.yScale.domain()[1] -
                    scaleData?.yScale.domain()[0]) /
                30;

            const rangeLowLineValue = ranges.filter(
                (target: lineValue) => target.name === 'Min',
            )[0].value;
            const rangeHighLineValue = ranges.filter(
                (target: lineValue) => target.name === 'Max',
            )[0].value;

            return (
                (mousePlacement < rangeLowLineValue + lineBuffer &&
                    mousePlacement > rangeLowLineValue - lineBuffer) ||
                (mousePlacement < rangeHighLineValue + lineBuffer &&
                    mousePlacement > rangeHighLineValue - lineBuffer)
            );
        }

        return false;
    }, [
        ranges,
        chartMousemoveEvent,
        mainCanvasBoundingClientRect,
        location.pathname,
        advancedMode,
        simpleRangeWidth,
    ]);

    // controls the distance of the mouse to the limit line, if close, activates the dragLimit event
    const canUserDragLimit = useMemo<boolean>(() => {
        if (
            chartMousemoveEvent &&
            mainCanvasBoundingClientRect &&
            location.pathname.includes('/limit') &&
            scaleData
        ) {
            const lineBuffer =
                (scaleData?.yScale.domain()[1] -
                    scaleData?.yScale.domain()[0]) /
                30;

            const offsetY =
                chartMousemoveEvent.clientY - mainCanvasBoundingClientRect?.top;

            const mousePlacement = scaleData?.yScale.invert(offsetY);
            const limitLineValue = limit;

            return (
                mousePlacement < limitLineValue + lineBuffer &&
                mousePlacement > limitLineValue - lineBuffer
            );
        }
        return false;
    }, [
        limit,
        chartMousemoveEvent,
        mainCanvasBoundingClientRect,
        location.pathname,
    ]);

    const canUserDragDrawnShape = useMemo<boolean>(() => {
        if (
            chartMousemoveEvent &&
            mainCanvasBoundingClientRect &&
            scaleData &&
            hoveredDrawnShape
        ) {
            return true;
        }

        return false;
    }, [hoveredDrawnShape, chartMousemoveEvent, mainCanvasBoundingClientRect]);

    function updateDrawnShapeHistoryonLocalStorage() {
        const storedData = localStorage.getItem(LS_KEY_CHART_ANNOTATIONS);
        if (storedData) {
            const parseStoredData = JSON.parse(storedData);
            parseStoredData.drawnShapes = drawnShapeHistory;
            parseStoredData.isOpenAnnotationPanel = isToolbarOpen;
            localStorage.setItem(
                LS_KEY_CHART_ANNOTATIONS,
                JSON.stringify(parseStoredData),
            );
        }
    }

    useEffect(() => {
        if (chartResetStatus.isResetChart) {
            setXScaleDefault();
        }
    }, []);

    useEffect(() => {
        if (isMobileSettingsModalOpen) {
            setHoveredDrawnShape(undefined);
            setSelectedDrawnShape(undefined);
        }
    }, [isMobileSettingsModalOpen]);

    useEffect(() => {
        if (shouldResetBuffer) {
            setXScaleDefault();
        }
    }, [liqMode, shouldResetBuffer]);

    useEffect(() => {
        (async () => {
            if (scaleData && timeGaps.length > 0) {
                const canvas = d3
                    .select(d3CanvasMain.current)
                    .select('canvas')
                    .node() as HTMLCanvasElement;

                const rectCanvas = canvas.getBoundingClientRect();
                const width = rectCanvas.width;

                scaleData.xScale.range([0, width]);
                scaleData.drawingLinearxScale.range([0, width]);

                const lastDateArray = timeGaps
                    .sort((a, b) => b.range[1] - a.range[1])
                    .filter((i) => i.isAddedPixel);
                let lastDate: undefined | number = undefined;
                if (lastDateArray.length > 0) {
                    lastDate = lastDateArray[0].range[1];
                }

                // To maintain the bandwidth of the candles, the domain is updated by the amount of shift.
                // If new data comes from the left, the scale is shifted to the right for a smaller scale, and vice versa.
                timeGaps
                    .filter((i) => !i.isAddedPixel)
                    .forEach((element: timeGapsValue) => {
                        if (isCondensedModeEnabled) {
                            const pix =
                                scaleData.xScale(element.range[0]) -
                                scaleData.xScale(element.range[1]);

                            // shift to right
                            let min = scaleData.xScale.invert(pix);
                            let maxDom = scaleData.xScale.domain()[1];

                            const dom = scaleData?.xScale.domain();
                            const check =
                                element.range[1] < dom[1] &&
                                element.range[1] > dom[0];

                            if (check) {
                                if (lastDate && lastDate < element.range[1]) {
                                    min = scaleData.xScale.domain()[0];
                                    // shift to left
                                    maxDom = scaleData.xScale.invert(
                                        scaleData.xScale.range()[1] - pix,
                                    );
                                }
                                scaleData.xScale.domain([min, maxDom]);

                                element.isAddedPixel = true;
                            }
                        }
                    });
            }
        })().then(() => {
            if (scaleData) {
                const data = isCondensedModeEnabled
                    ? timeGaps
                          .filter((element) => element.isAddedPixel)
                          .map((i: timeGapsValue) => i.range)
                    : [];

                const newDiscontinuityProvider = d3fc.discontinuityRange(
                    ...data,
                );

                scaleData.xScale.discontinuityProvider(
                    newDiscontinuityProvider,
                );

                setVisibleDateForCandle(scaleData.xScale.domain()[1]);
                changeScale(false);
                render();
            }
        });
    }, [
        diffHashSig(timeGaps),
        diffHashSigScaleData(scaleData, 'x'),
        isCondensedModeEnabled,
    ]);

    useEffect(() => {
        updateDrawnShapeHistoryonLocalStorage();
    }, [JSON.stringify(drawnShapeHistory), isToolbarOpen]);

    useEffect(() => {
        if (cursorStyleTrigger && chartZoomEvent !== 'wheel') {
            d3.select(d3CanvasMain.current).style('cursor', 'grabbing');

            render();
        } else {
            const cursorType = d3.select(d3CanvasMain.current).style('cursor');

            if (
                !(
                    isOnCandleOrVolumeMouseLocation && cursorType === 'pointer'
                ) &&
                !(!isOnCandleOrVolumeMouseLocation && cursorType === 'default')
            ) {
                d3.select(d3CanvasMain.current).style(
                    'cursor',
                    isOnCandleOrVolumeMouseLocation ? 'pointer' : 'default',
                );
            }
        }
    }, [
        chartZoomEvent,
        diffHashSig(cursorStyleTrigger),
        isOnCandleOrVolumeMouseLocation,
    ]);

    useEffect(() => {
        if (isLineDrag) {
            d3.select(d3CanvasMain.current).style('cursor', 'none');
        } else if (canUserDragLimit || canUserDragRange) {
            d3.select(d3CanvasMain.current).style('cursor', 'row-resize');
        } else {
            const cursorType = d3.select(d3CanvasMain.current).style('cursor');

            if (
                !(
                    isOnCandleOrVolumeMouseLocation && cursorType === 'pointer'
                ) &&
                !(!isOnCandleOrVolumeMouseLocation && cursorType === 'default')
            ) {
                d3.select(d3CanvasMain.current).style(
                    'cursor',
                    isOnCandleOrVolumeMouseLocation ? 'pointer' : 'default',
                );
            }
        }
    }, [
        canUserDragLimit,
        canUserDragRange,
        isLineDrag,
        isOnCandleOrVolumeMouseLocation,
    ]);

    useEffect(() => {
        // auto zoom active
        setRescale(true);
    }, [location.pathname, period, denomInBase]);

    // calculates first fetch candle domain for time and pool change
    useEffect(() => {
        if (scaleData && !isChartZoom) {
            const xDomain = scaleData?.xScale.domain();
            const isFutureDay =
                new Date(xDomain[1]).getTime() > new Date().getTime();

            let domainMax = isFutureDay
                ? new Date().getTime()
                : new Date(xDomain[1]).getTime();

            const nCandles = Math.floor(
                (xDomain[1] - xDomain[0]) / (period * 1000),
            );

            const minDate = 1657868400; // 15 July 2022

            domainMax = domainMax < minDate ? minDate : domainMax;

            const isShowLatestCandle = checkShowLatestCandle(
                period,
                scaleData?.xScale,
            );

            setCandleScale(() => {
                return {
                    isFetchForTimeframe: candleScale.isFetchForTimeframe,
                    lastCandleDate: Math.floor(domainMax / 1000),
                    nCandles: nCandles,
                    isShowLatestCandle: isShowLatestCandle,
                    isFetchFirst200Candle: false,
                };
            });
        }
    }, [diffHashSigScaleData(scaleData, 'x'), period, isChartZoom]);

    useEffect(() => {
        if (scaleData) {
            const domain = scaleData?.xScale.domain();
            const showCandleCount = getCandleCount(
                scaleData.xScale,
                visibleCandleData,
                domain,
                period,
                isCondensedModeEnabled,
            );
            setPrevCandleCount(showCandleCount);
        }
    }, [diffHashSigScaleData(scaleData, 'x')]);

    useEffect(() => {
        if (isCondensedModeEnabled) {
            const isShowSelectedDate = filterCandleWithTransaction(
                unparsedData.candles,
                period,
            ).find((i) => i.isShowData && i.time * 1000 === selectedDate);
            if (!isShowSelectedDate) {
                setSelectedDate(undefined);
                props.setCurrentData(undefined);
            }
        }
    }, [isCondensedModeEnabled]);

    useEffect(() => {
        if (isChartZoom) {
            setIsChangeScaleChart(true);
        }
    }, [isChartZoom]);

    // Zoom
    useEffect(() => {
        if (
            scaleData !== undefined &&
            unparsedCandleData !== undefined &&
            !isChartZoom
        ) {
            let clickedForLine = false;
            let zoomTimeout: number | undefined = undefined;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let previousTouch: any | undefined = undefined; // event
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let startTouch: any | undefined = undefined;
            let previousDeltaTouch: number | undefined = undefined;
            let previousDeltaTouchLocation: number | undefined = undefined;
            const lastCandleDate = lastCandleData?.time * 1000;
            const firstCandleDate = firstCandleData?.time * 1000;

            let wheelTimeout: NodeJS.Timeout | null = null; // Declare wheelTimeout

            if (lastCandleDate && firstCandleDate) {
                d3.select(d3CanvasMain.current).on(
                    'wheel',
                    function (event) {
                        if (wheelTimeout === null) {
                            setIsChartZoom(true);
                            setCursorStyleTrigger(true);
                        }

                        zoomBase.zoomWithWheel(
                            event,
                            scaleData,
                            firstCandleDate,
                            lastCandleDate,
                        );
                        render();

                        if (rescale) {
                            changeScale(true);
                        }

                        if (wheelTimeout) {
                            clearTimeout(wheelTimeout);
                        }

                        setPrevLastCandleTime(lastCandleData.time);
                        // check wheel end
                        wheelTimeout = setTimeout(() => {
                            setShouldResetBuffer(false);
                            setIsChartZoom(false);
                            setCursorStyleTrigger(false);
                            showLatestActive();
                        }, 200);
                    },
                    { passive: true },
                );

                const zoom = d3
                    .zoom()
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .on('start', (event: any) => {
                        setIsChartZoom(true);

                        if (event.sourceEvent.type.includes('touch')) {
                            // mobile
                            previousTouch = event.sourceEvent.touches[0];
                            startTouch = event.sourceEvent.touches[0];

                            if (event.sourceEvent.touches.length > 1) {
                                previousDeltaTouch = Math.hypot(
                                    event.sourceEvent.touches[0].pageX -
                                        event.sourceEvent.touches[1].pageX,
                                    event.sourceEvent.touches[0].pageY -
                                        event.sourceEvent.touches[1].pageY,
                                );
                                previousDeltaTouchLocation =
                                    event.sourceEvent.touches[0].pageX;
                            }
                        }
                        zoomTimeout = event.sourceEvent.timeStamp;
                        if (
                            event.sourceEvent &&
                            event.sourceEvent.type !== 'dblclick'
                        ) {
                            clickedForLine = false;
                            setChartZoomEvent(event.sourceEvent.type);
                        }
                    })
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .on('zoom', (event: any) => {
                        setContextmenu(false);

                        async function newDomains() {
                            if (
                                event.sourceEvent &&
                                event.sourceEvent.type !== 'dblclick' &&
                                scaleData?.xScale
                            ) {
                                if (event.sourceEvent.type === 'touchmove') {
                                    if (event.sourceEvent.touches.length > 1) {
                                        // if a second finger touches after one finger touches it
                                        if (
                                            !previousDeltaTouch ||
                                            !previousDeltaTouchLocation
                                        ) {
                                            previousDeltaTouch = Math.hypot(
                                                event.sourceEvent.touches[0]
                                                    .pageX -
                                                    event.sourceEvent.touches[1]
                                                        .pageX,
                                                event.sourceEvent.touches[0]
                                                    .pageY -
                                                    event.sourceEvent.touches[1]
                                                        .pageY,
                                            );

                                            previousDeltaTouchLocation =
                                                event.sourceEvent.touches[0]
                                                    .pageX;
                                        }

                                        if (
                                            previousDeltaTouch &&
                                            previousDeltaTouchLocation
                                        ) {
                                            zoomBase.handlePanningMultiTouch(
                                                event.sourceEvent,
                                                scaleData,
                                                previousDeltaTouch,
                                                previousDeltaTouchLocation,
                                            );
                                        }
                                    } else {
                                        zoomBase.handlePanningOneTouch(
                                            event.sourceEvent,
                                            scaleData,
                                            previousTouch,
                                            bandwidth,
                                            firstCandleDate,
                                            lastCandleDate,
                                        );
                                    }
                                } else {
                                    zoomBase.handlePanning(
                                        event.sourceEvent,
                                        scaleData,
                                        firstCandleDate,
                                        lastCandleDate,
                                    );
                                }

                                render();
                                setCursorStyleTrigger(true);

                                if (rescale) {
                                    if (!isCondensedModeEnabled) {
                                        changeScale(true);
                                    }
                                    render();
                                } else {
                                    let domain = undefined;
                                    if (
                                        event.sourceEvent.type === 'touchmove'
                                    ) {
                                        domain = zoomBase.handlePanningYMobile(
                                            event.sourceEvent,
                                            scaleData,
                                            previousTouch,
                                        );
                                    } else {
                                        domain = zoomBase.handlePanningY(
                                            event.sourceEvent,
                                            scaleData,
                                        );
                                    }

                                    if (domain) {
                                        setYaxisDomain(domain[0], domain[1]);
                                    }
                                }

                                clickedForLine = true;
                                setPrevLastCandleTime(lastCandleData.time);

                                render();
                            }
                        }

                        newDomains().then(() => {
                            // mobile
                            if (event.sourceEvent.type.includes('touch')) {
                                previousTouch =
                                    event.sourceEvent.changedTouches[0];
                                if (event.sourceEvent.touches.length > 1) {
                                    previousDeltaTouch = Math.hypot(
                                        event.sourceEvent.touches[0].pageX -
                                            event.sourceEvent.touches[1].pageX,
                                        event.sourceEvent.touches[0].pageY -
                                            event.sourceEvent.touches[1].pageY,
                                    );
                                }
                            }
                        });
                    })
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    .on('end', (event: any) => {
                        setShouldResetBuffer(false);
                        if (event.sourceEvent.type !== 'wheel') {
                            setIsChartZoom(false);
                            setCursorStyleTrigger(false);
                            setChartZoomEvent('');

                            if (
                                event.sourceEvent.type.includes('touch') &&
                                zoomTimeout &&
                                event.sourceEvent.timeStamp - zoomTimeout >
                                    100 &&
                                startTouch.clientX ===
                                    event.sourceEvent.changedTouches[0]
                                        .clientX &&
                                startTouch.clientY ===
                                    event.sourceEvent.changedTouches[0].clientY
                            ) {
                                if (tabletView) {
                                    setContextmenu(true);

                                    const screenHeight = window.innerHeight;

                                    const diff =
                                        screenHeight - startTouch.clientY;

                                    setContextMenuPlacement(() => {
                                        return {
                                            top: startTouch.clientY,
                                            left: startTouch.clientX,
                                            isReversed: diff < 350,
                                        };
                                    });

                                    event.preventDefault();
                                } else {
                                    setSelectedDrawnShape(undefined);
                                    setIsShowFloatingToolbar(false);
                                    // openMobileSettingsModal();
                                }
                            }

                            if (
                                event.sourceEvent.type.includes('touch') &&
                                contextmenu
                            ) {
                                setContextmenu(false);
                            }

                            if (clickedForLine) {
                                // fires click event when zoom takes too short
                                if (
                                    zoomTimeout &&
                                    event.sourceEvent.timeStamp - zoomTimeout <
                                        1
                                ) {
                                    const {
                                        isHoverCandleOrVolumeData,
                                        nearest,
                                    } = candleOrVolumeDataHoverStatus(
                                        event.sourceEvent.offsetX,
                                        event.sourceEvent.offsetY,
                                    );
                                    selectedDateEvent(
                                        isHoverCandleOrVolumeData,
                                        nearest,
                                    );
                                }
                            }

                            showLatestActive();

                            props.setShowTooltip(true);
                        }
                    })
                    .filter((event) => {
                        if (tabletView && mainCanvasBoundingClientRect) {
                            const { offsetX, offsetY } =
                                getXandYLocationForChart(
                                    event,
                                    mainCanvasBoundingClientRect,
                                );

                            drawnShapesHoverStatus(offsetX, offsetY);
                        } else {
                            setSelectedDrawnShape(undefined);
                        }

                        if (event.type.includes('touch')) {
                            const canvas = d3
                                .select(d3CanvasMain.current)
                                .select('canvas')
                                .node() as HTMLCanvasElement;

                            const rectCanvas = canvas.getBoundingClientRect();

                            const lineBuffer =
                                (scaleData?.yScale.domain()[1] -
                                    scaleData?.yScale.domain()[0]) /
                                15;

                            const eventPoint =
                                event.targetTouches[0].clientY -
                                rectCanvas?.top;

                            const eventPointX =
                                event.targetTouches[0].clientX -
                                rectCanvas.left;

                            const mousePlacement =
                                scaleData?.yScale.invert(eventPoint);

                            const maxLiqPixelPercent = mobileView
                                ? 80 / 100
                                : 92 / 100;
                            const isHoverLiquidity =
                                rectCanvas.width * maxLiqPixelPercent >=
                                eventPointX;

                            const limitLineValue = limit;

                            const minRangeValue = ranges.filter(
                                (target: lineValue) => target.name === 'Min',
                            )[0].value;
                            const maxRangeValue = ranges.filter(
                                (target: lineValue) => target.name === 'Max',
                            )[0].value;

                            const isOnLimit =
                                location.pathname.includes('/limit') &&
                                mousePlacement < limitLineValue + lineBuffer &&
                                mousePlacement > limitLineValue - lineBuffer;

                            const isOnRangeMin =
                                (location.pathname.includes('pool') ||
                                    location.pathname.includes('reposition')) &&
                                mousePlacement < minRangeValue + lineBuffer &&
                                mousePlacement > minRangeValue - lineBuffer;

                            const isOnRangeMax =
                                (location.pathname.includes('pool') ||
                                    location.pathname.includes('reposition')) &&
                                mousePlacement < maxRangeValue + lineBuffer &&
                                mousePlacement > maxRangeValue - lineBuffer;

                            return (
                                !isOnLimit &&
                                !isOnRangeMin &&
                                !isOnRangeMax &&
                                isHoverLiquidity
                            );
                        } else {
                            return !canUserDragRange && !canUserDragLimit;
                        }
                    });

                setMainZoom(() => zoom);
            }
        }
    }, [
        firstCandleData,
        lastCandleData,
        rescale,
        location,
        diffHashSigScaleData(scaleData),
        showLatest,
        liquidityData,
        simpleRangeWidth,
        ranges,
        limit,
        isLineDrag,
        minTickForLimit,
        maxTickForLimit,
        canUserDragRange,
        canUserDragLimit,
        unparsedCandleData,
        period,
        advancedMode,
        isChartZoom,
        zoomBase,
        contextmenu,
    ]);

    useEffect(() => {
        if (!isChartZoom) {
            render();
        }
    }, [diffHashSigScaleData(scaleData)]);

    useEffect(() => {
        renderCanvasArray([d3CanvasMain]);
        render();
    }, []);

    useEffect(() => {
        IS_LOCAL_ENV && console.debug('timeframe changed');
        showLatestActive();
    }, [period]);

    const showLatestActive = () => {
        const today = new Date();

        if (today !== undefined && scaleData !== undefined) {
            if (
                today &&
                (scaleData?.xScale.domain()[1] < today.getTime() ||
                    scaleData?.xScale.domain()[0] > today.getTime())
            ) {
                setShowLatest(() => true);
            } else if (
                !(scaleData?.xScale.domain()[1] < today.getTime()) &&
                !(scaleData?.xScale.domain()[0] > today.getTime())
            ) {
                setShowLatest(() => false);
            }
        }
    };

    // when the auto button is clicked, the chart is auto scale
    useEffect(() => {
        if (scaleData !== undefined && liquidityData !== undefined) {
            if (rescale) {
                changeScale(false);
            }
        }
    }, [rescale]);

    // set default limit tick
    useEffect(() => {
        if (limitTick && Math.abs(limitTick) === Infinity)
            setLimitTick(undefined);
    }, []);

    // calculate range value for denom
    useEffect(() => {
        if (
            !advancedMode &&
            simpleRangeWidth === 100 &&
            currentPoolPriceTick !== undefined
        ) {
            const lowTick = currentPoolPriceTick - simpleRangeWidth * 100;
            const highTick = currentPoolPriceTick + simpleRangeWidth * 100;

            const pinnedDisplayPrices = getPinnedPriceValuesFromTicks(
                isDenomBase,
                baseTokenDecimals,
                quoteTokenDecimals,
                lowTick,
                highTick,
                gridSize,
            );

            const low = 0;
            const high = parseFloat(
                pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
            );
            setRanges(() => {
                const newTargets = [
                    {
                        name: 'Min',
                        value: low,
                    },
                    {
                        name: 'Max',
                        value: high,
                    },
                ];

                return newTargets;
            });
        }
    }, [denomInBase]);

    const setAdvancedLines = () => {
        if (minPrice !== undefined && maxPrice !== undefined) {
            setRanges(() => {
                const newTargets = [
                    {
                        name: 'Min',
                        value: minPrice,
                    },
                    {
                        name: 'Max',
                        value: maxPrice,
                    },
                ];

                return newTargets;
            });

            setChartTriggeredBy('none');
        }
    };

    useEffect(() => {
        if (
            (location.pathname.includes('pool') ||
                location.pathname.includes('reposition')) &&
            advancedMode
        ) {
            if (chartTriggeredBy === '' || rescaleRangeBoundariesWithSlider) {
                setAdvancedLines();
            }
        }
    }, [
        location.pathname,
        denomInBase,
        minPrice,
        maxPrice,
        rescaleRangeBoundariesWithSlider,
        advancedMode,
        chartTriggeredBy,
    ]);

    useEffect(() => {
        if (
            !(
                advancedMode &&
                scaleData &&
                liquidityData &&
                denomInBase === boundaries
            )
        ) {
            setBoundaries(denomInBase);
        }
    }, [
        advancedMode,
        ranges,
        liquidityData?.liqBidData,
        diffHashSigScaleData(scaleData, 'y'),
    ]);

    // *** LIMIT ***
    /**
     * This function checks if the limit values trigger a position changes buy /sell .
     * If the conditions are met, it initiates a pulse animation and updates the limit direction accordingly.
     * @param limitPreviousData  limit value before the operation started
     * @param newLimitValue  limit value the operation finished
     */
    function reverseTokenForChart(
        limitPreviousData: number,
        newLimitValue: number,
    ): boolean {
        // output variable
        let needsInversion = false;
        // doesn't exist on initialization
        if (poolPriceDisplay) {
            // logic tree to determine if the limit price crosses the current pool price
            // sell => buy or buy to sell
            if (sellOrderStyle === 'order_sell') {
                // Check if new limit is below current price
                if (newLimitValue < poolPriceDisplay) {
                    needsInversion = true;
                }
            } else {
                // Check if new limit is above current price.
                if (newLimitValue > poolPriceDisplay) {
                    needsInversion = true;
                }
            }
        }
        return needsInversion;
    }

    // *** LIMIT ***
    /**
     * This function retrieves the 'noGoZoneMin' and 'noGoZoneMax' values from the 'noGoZoneBoundaries' array.
     * These values represent the minimum and maximum boundaries of a no-go zone.
     *
     * @returns {Object} An object containing 'noGoZoneMin' and 'noGoZoneMax'.
     */
    const getNoZoneData = () => {
        const noGoZoneMin = noGoZoneBoundaries[0];
        const noGoZoneMax = noGoZoneBoundaries[1];
        return { noGoZoneMin: noGoZoneMin, noGoZoneMax: noGoZoneMax };
    };

    // *** LIMIT ***
    /**
     * finds border ticks of nogozone
     * This function sets the 'minTickForLimit' and 'maxTickForLimit' values
     * tick values are calculated based on the 'low' and 'high' values provided near the no go zone.
     *
     * @param low   The low value for the calculation
     * @param high  The high value for the calculation
     */
    const setLimitTickNearNoGoZone = (low: number, high: number) => {
        const limitNonDisplay = fromDisplayPrice(
            parseFloat(low.toString()),
            baseTokenDecimals,
            quoteTokenDecimals,
            denomInBase,
        );
        const pinnedTickLower: number = pinTickLower(limitNonDisplay, gridSize);

        const tickPriceLower = tickToPrice(
            pinnedTickLower + (denomInBase ? 1 : -1) * gridSize * 2,
        );

        const displayPriceWithDenomLower = toDisplayPrice(
            tickPriceLower,
            baseTokenDecimals,
            quoteTokenDecimals,
            denomInBase,
        );

        setMinTickForLimit(displayPriceWithDenomLower);

        const limitNonDisplayMax = fromDisplayPrice(
            parseFloat(high.toString()),
            baseTokenDecimals,
            quoteTokenDecimals,
            denomInBase,
        );
        const pinnedTickUpper: number = pinTickUpper(
            limitNonDisplayMax,
            gridSize,
        );

        const tickPriceUpper = tickToPrice(
            pinnedTickUpper + (denomInBase ? -1 : 1) * gridSize * 2,
        );

        const displayPriceWithDenomUpper = toDisplayPrice(
            tickPriceUpper,
            baseTokenDecimals,
            quoteTokenDecimals,
            denomInBase,
        );

        setMaxTickForLimit(displayPriceWithDenomUpper);
    };

    // If the limit is set to no gozone, it will jump to the nearest tick
    function setLimitForNoGoZone(newLimitValue: number) {
        const { noGoZoneMin, noGoZoneMax } = getNoZoneData();

        if (newLimitValue > noGoZoneMin && newLimitValue < noGoZoneMax) {
            if (newLimitValue > noGoZoneMin) {
                if (newLimitValue < limit) {
                    newLimitValue = noGoZoneMax;
                } else {
                    newLimitValue = noGoZoneMin;
                }
            } else if (newLimitValue < noGoZoneMax) {
                if (newLimitValue > limit) {
                    newLimitValue = noGoZoneMin;
                } else {
                    newLimitValue = noGoZoneMax;
                }
            }
        }

        return newLimitValue;
    }

    // *** LİMİT ***
    // This function calculates a new limit value, and adjusts it as a corrected limit if it falls within the No-Go Zone boundaries.
    function calculateLimit(newLimitValue: number) {
        if (newLimitValue < 0) newLimitValue = 0;

        // If the calculated limit value is within "No Go Zone", it returns the limit value outside the region
        newLimitValue = setLimitForNoGoZone(newLimitValue);

        // Get data for the No-Go Zone (minimum and maximum values)
        const { noGoZoneMin, noGoZoneMax } = getNoZoneData();

        const limitNonDisplay = fromDisplayPrice(
            newLimitValue,
            baseTokenDecimals,
            quoteTokenDecimals,
            denomInBase,
        );
        // Check if the newLimitValue matches the No-Go Zone maximum or minimum
        const isNoGoneZoneMax = newLimitValue === noGoZoneMax;
        const isNoGoneZoneMin = newLimitValue === noGoZoneMin;

        let pinnedTick: number = isTokenABase
            ? pinTickLower(limitNonDisplay, gridSize)
            : pinTickUpper(limitNonDisplay, gridSize);

        // If it is equal to the minimum value of no go zone, value is rounded lower tick
        if (isNoGoneZoneMin) {
            pinnedTick = isDenomBase
                ? pinTickUpper(limitNonDisplay, gridSize)
                : pinTickLower(limitNonDisplay, gridSize);
        }

        // If it is equal to the max value of no go zone, value is rounded upper tick
        if (isNoGoneZoneMax) {
            pinnedTick = isDenomBase
                ? pinTickLower(limitNonDisplay, gridSize)
                : pinTickUpper(limitNonDisplay, gridSize);
        }

        const tickPrice = tickToPrice(pinnedTick);

        const displayPriceWithDenom = toDisplayPrice(
            tickPrice,
            baseTokenDecimals,
            quoteTokenDecimals,
            denomInBase,
        );
        newLimitValue = displayPriceWithDenom;

        // Update newLimitValue if it's outside the No-Go Zone
        if (!(newLimitValue > noGoZoneMin && newLimitValue < noGoZoneMax)) {
            setLimit(() => {
                return newLimitValue;
            });
        }
        return newLimitValue;
    }

    // dragRange
    useEffect(() => {
        if (scaleData) {
            let newRangeValue: lineValue[];

            let lowLineMoved: boolean;
            let highLineMoved: boolean;

            let rangeWidthPercentage: number;

            let dragSwitched = false;
            let draggingLine: string | undefined = undefined;

            let cancelDrag = false;

            // clicking esc while dragging the line sets the line to the last value
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cancelDragEvent = (event: any) => {
                if (event.key === 'Escape') {
                    cancelDrag = true;
                    event.preventDefault();
                    event.stopPropagation();
                    document.removeEventListener('keydown', cancelDragEvent);
                }
            };

            const canvas = d3
                .select(d3CanvasMain.current)
                .select('canvas')
                .node() as HTMLCanvasElement;

            const rectCanvas = canvas.getBoundingClientRect();

            let oldRangeMinValue: number | undefined = undefined;
            let oldRangeMaxValue: number | undefined = undefined;
            const dragRange = d3
                .drag<d3.DraggedElementBaseType, unknown, d3.SubjectPosition>()
                .filter((event) => filterDragEvent(event, rectCanvas.left))
                .on('start', (event) => {
                    setCrosshairActive('none');
                    document.addEventListener('keydown', cancelDragEvent);
                    d3.select(d3CanvasMain.current).style('cursor', 'none');

                    d3.select('#y-axis-canvas').style('cursor', 'none');

                    const { offsetY: clientY } = getXandYLocationForChartDrag(
                        event,
                        rectCanvas,
                    );

                    const advancedValue = scaleData?.yScale.invert(clientY);

                    const low = ranges.filter(
                        (target: lineValue) => target.name === 'Min',
                    )[0].value;
                    const high = ranges.filter(
                        (target: lineValue) => target.name === 'Max',
                    )[0].value;

                    oldRangeMinValue = low;
                    oldRangeMaxValue = high;

                    if (draggingLine === undefined) {
                        draggingLine =
                            event.subject.name !== undefined
                                ? event.subject.name
                                : Math.abs(advancedValue - low) <
                                    Math.abs(advancedValue - high)
                                  ? 'Min'
                                  : 'Max';
                    }
                })
                .on('drag', function (event) {
                    const { offsetY } = getXandYLocationForChartDrag(
                        event,
                        rectCanvas,
                    );

                    if (
                        !cancelDrag &&
                        liquidityData &&
                        currentPoolPriceTick !== undefined
                    ) {
                        setIsLineDrag(true);
                        setCrosshairActive('none');

                        let draggedValue =
                            scaleData?.yScale.invert(offsetY) >=
                            liquidityData?.topBoundary
                                ? liquidityData?.topBoundary
                                : scaleData?.yScale.invert(offsetY);

                        draggedValue = draggedValue < 0 ? 0 : draggedValue;

                        const displayValue =
                            poolPriceDisplay !== undefined
                                ? poolPriceDisplay
                                : 0;

                        const low = ranges.filter(
                            (target: lineValue) => target.name === 'Min',
                        )[0].value;
                        const high = ranges.filter(
                            (target: lineValue) => target.name === 'Max',
                        )[0].value;

                        const lineToBeSet =
                            draggedValue > displayValue ? 'Max' : 'Min';

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        let pinnedDisplayPrices: any;

                        if (
                            !advancedMode ||
                            location.pathname.includes('reposition')
                        ) {
                            if (
                                draggedValue === 0 ||
                                draggedValue === liquidityData?.topBoundary
                            ) {
                                const minValue =
                                    draggedValue === 0
                                        ? 0
                                        : draggedValue <
                                            liquidityData?.lowBoundary
                                          ? draggedValue
                                          : 0;

                                setRanges((prevState) => {
                                    const newTargets = [...prevState];

                                    newTargets.filter(
                                        (target: lineValue) =>
                                            target.name === 'Min',
                                    )[0].value = minValue;

                                    newTargets.filter(
                                        (target: lineValue) =>
                                            target.name === 'Max',
                                    )[0].value = liquidityData?.topBoundary;

                                    newRangeValue = newTargets;

                                    return newTargets;
                                });
                            } else {
                                if (lineToBeSet === 'Max') {
                                    const pinnedTick =
                                        getPinnedTickFromDisplayPrice(
                                            isDenomBase,
                                            baseTokenDecimals,
                                            quoteTokenDecimals,
                                            false, // isMinPrice
                                            draggedValue.toString(),
                                            gridSize,
                                        );

                                    rangeWidthPercentage = roundToNearestPreset(
                                        Math.abs(
                                            pinnedTick - currentPoolPriceTick,
                                        ) / 100,
                                    );

                                    const offset = rangeWidthPercentage * 100;

                                    const lowTick =
                                        currentPoolPriceTick - offset;
                                    const highTick =
                                        currentPoolPriceTick + offset;

                                    pinnedDisplayPrices =
                                        getPinnedPriceValuesFromTicks(
                                            denomInBase,
                                            baseTokenDecimals,
                                            quoteTokenDecimals,
                                            lowTick,
                                            highTick,
                                            gridSize,
                                        );
                                } else {
                                    const pinnedTick =
                                        getPinnedTickFromDisplayPrice(
                                            isDenomBase,
                                            baseTokenDecimals,
                                            quoteTokenDecimals,
                                            true, // isMinPrice
                                            draggedValue.toString(),
                                            gridSize,
                                        );

                                    rangeWidthPercentage = roundToNearestPreset(
                                        Math.abs(
                                            currentPoolPriceTick - pinnedTick,
                                        ) / 100,
                                    );

                                    const offset = rangeWidthPercentage * 100;

                                    const lowTick =
                                        currentPoolPriceTick - offset;
                                    const highTick =
                                        currentPoolPriceTick + offset;

                                    pinnedDisplayPrices =
                                        getPinnedPriceValuesFromTicks(
                                            denomInBase,
                                            baseTokenDecimals,
                                            quoteTokenDecimals,
                                            lowTick,
                                            highTick,
                                            gridSize,
                                        );
                                }

                                if (pinnedDisplayPrices !== undefined) {
                                    setRanges((prevState) => {
                                        const newTargets = [...prevState];

                                        newTargets.filter(
                                            (target: lineValue) =>
                                                target.name === 'Min',
                                        )[0].value = Number(
                                            pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
                                        );
                                        newTargets.filter(
                                            (target: lineValue) =>
                                                target.name === 'Max',
                                        )[0].value = Number(
                                            pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
                                        );

                                        newRangeValue = newTargets;
                                        return newTargets;
                                    });
                                }
                            }
                        } else {
                            const advancedValue =
                                scaleData?.yScale.invert(offsetY);
                            highLineMoved = draggingLine === 'Max';
                            lowLineMoved = draggingLine === 'Min';

                            let pinnedMaxPriceDisplayTruncated = high;
                            let pinnedMinPriceDisplayTruncated = low;

                            if (advancedValue >= 0) {
                                if (draggingLine === 'Max') {
                                    if (advancedValue < low) {
                                        pinnedDisplayPrices =
                                            getPinnedPriceValuesFromDisplayPrices(
                                                denomInBase,
                                                baseTokenDecimals,
                                                quoteTokenDecimals,
                                                high.toString(),
                                                advancedValue.toString(),
                                                gridSize,
                                            );
                                    } else {
                                        pinnedDisplayPrices =
                                            getPinnedPriceValuesFromDisplayPrices(
                                                denomInBase,
                                                baseTokenDecimals,
                                                quoteTokenDecimals,
                                                low.toString(),
                                                advancedValue.toString(),
                                                gridSize,
                                            );
                                    }
                                } else {
                                    pinnedDisplayPrices =
                                        getPinnedPriceValuesFromDisplayPrices(
                                            denomInBase,
                                            baseTokenDecimals,
                                            quoteTokenDecimals,
                                            advancedValue.toString(),
                                            high.toString(),
                                            gridSize,
                                        );
                                }

                                pinnedMaxPriceDisplayTruncated = Number(
                                    pinnedDisplayPrices.pinnedMaxPriceDisplay,
                                );
                                pinnedMinPriceDisplayTruncated = Number(
                                    pinnedDisplayPrices.pinnedMinPriceDisplay,
                                );
                            }
                            // to:do fix when advanced is fixed AdvancedPepe
                            setRanges((prevState) => {
                                const newTargets = [...prevState];
                                if (draggingLine === 'Max') {
                                    if (
                                        dragSwitched ||
                                        pinnedMaxPriceDisplayTruncated <
                                            pinnedMinPriceDisplayTruncated
                                    ) {
                                        newTargets.filter(
                                            (target: lineValue) =>
                                                target.name === 'Min',
                                        )[0].value =
                                            pinnedMaxPriceDisplayTruncated;

                                        dragSwitched = true;
                                        highLineMoved = false;
                                        lowLineMoved = true;
                                    } else {
                                        newTargets.filter(
                                            (target: lineValue) =>
                                                target.name === 'Max',
                                        )[0].value =
                                            pinnedMaxPriceDisplayTruncated;
                                    }
                                } else {
                                    if (
                                        dragSwitched ||
                                        pinnedMinPriceDisplayTruncated >
                                            pinnedMaxPriceDisplayTruncated
                                    ) {
                                        newTargets.filter(
                                            (target: lineValue) =>
                                                target.name === 'Max',
                                        )[0].value =
                                            pinnedMinPriceDisplayTruncated;

                                        dragSwitched = true;
                                        highLineMoved = true;
                                        lowLineMoved = false;
                                    } else {
                                        newTargets.filter(
                                            (target: lineValue) =>
                                                target.name === 'Min',
                                        )[0].value =
                                            pinnedMinPriceDisplayTruncated;
                                    }
                                }

                                newRangeValue = newTargets;

                                return newTargets;
                            });
                        }
                    } else {
                        if (
                            oldRangeMinValue !== undefined &&
                            oldRangeMaxValue !== undefined
                        ) {
                            setRanges([
                                {
                                    name: 'Min',
                                    value: oldRangeMinValue,
                                },
                                {
                                    name: 'Max',
                                    value: oldRangeMaxValue,
                                },
                            ]);
                        }
                    }
                })
                .on('end', () => {
                    setIsLineDrag(false);

                    if (!cancelDrag) {
                        if (
                            (!advancedMode ||
                                location.pathname.includes('reposition')) &&
                            rangeWidthPercentage
                        ) {
                            setSimpleRangeWidth(rangeWidthPercentage);
                        }

                        onBlurRange(
                            newRangeValue,
                            highLineMoved,
                            lowLineMoved,
                            dragSwitched,
                        );
                        dragSwitched = false;
                    } else {
                        if (
                            oldRangeMinValue !== undefined &&
                            oldRangeMaxValue !== undefined
                        ) {
                            setRanges([
                                {
                                    name: 'Min',
                                    value: oldRangeMinValue,
                                },
                                {
                                    name: 'Max',
                                    value: oldRangeMaxValue,
                                },
                            ]);
                        }
                    }
                    d3.select(d3CanvasMain.current).style('cursor', 'default');

                    d3.select('#y-axis-canvas').style('cursor', 'default');

                    setCrosshairActive('none');
                });

            setDragRange(() => {
                return dragRange;
            });
        }
    }, [
        poolPriceDisplay,
        location,
        advancedMode,
        ranges,
        limit,
        minPrice,
        maxPrice,
        minTickForLimit,
        maxTickForLimit,
        simpleRangeWidth,
        liquidityData?.topBoundary,
        liquidityData?.lowBoundary,
        scaleData,
        isDenomBase,
        baseTokenDecimals,
        quoteTokenDecimals,
        currentPoolPriceTick,
        denomInBase,
        isTokenABase,
        gridSize,
        rescale,
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function filterDragEvent(event: any, leftPositin: number) {
        const checkMainCanvas =
            event.target.offsetParent.id === mainCanvasElementId;
        if (event.type.includes('touch') && checkMainCanvas) {
            const eventPointX = event.targetTouches[0].clientX - leftPositin;

            const canvas = d3
                .select(d3CanvasMain.current)
                .select('canvas')
                .node() as HTMLCanvasElement;

            const rectCanvas = canvas.getBoundingClientRect();
            const maxLiqPixelPercent = mobileView ? 9 / 10 : 4 / 5;
            const isHoverLiquidity =
                rectCanvas.width * maxLiqPixelPercent >= eventPointX;
            return isHoverLiquidity;
        }

        return true;
    }
    // dragLimit
    useEffect(() => {
        const canvas = d3
            .select(d3CanvasMain.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const rectCanvas = canvas.getBoundingClientRect();
        let offsetY = 0;
        let movementY = 0;
        let newLimitValue: number | undefined;
        let tempNewLimitValue: number | undefined;

        let tempMovementY = 0;
        let cancelDrag = false;
        let oldLimitValue: number | undefined = undefined;
        // clicking esc while dragging the line sets the line to the last value
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cancelDragEvent = (event: any) => {
            if (event.key === 'Escape') {
                cancelDrag = true;
                event.preventDefault();
                event.stopPropagation();
                document.removeEventListener('keydown', cancelDragEvent);
            }
        };
        const dragLimit = d3
            .drag<d3.DraggedElementBaseType, unknown, d3.SubjectPosition>()
            .filter((event) => filterDragEvent(event, rectCanvas.left))
            .on('start', (event) => {
                // When the drag starts:
                // hide the cursor
                d3.select(d3CanvasMain.current).style('cursor', 'none');
                // hide the cursor over the y-axis canvas.
                d3.select('#y-axis-canvas').style('cursor', 'none');

                // add a keydown event listener to cancel the drag.
                document.addEventListener('keydown', cancelDragEvent);

                // Store the initial value of the limit for potential cancellation.
                oldLimitValue = limit;
                newLimitValue = limit;
                tempNewLimitValue = limit;
                if (
                    typeof TouchEvent !== 'undefined' &&
                    event.sourceEvent instanceof TouchEvent
                ) {
                    tempMovementY =
                        event.sourceEvent.touches[0].clientY - rectCanvas?.top;
                }
            })
            .on('drag', function (event) {
                (async () => {
                    // Indicate that line is dragging
                    setIsLineDrag(true);
                    if (
                        typeof TouchEvent !== 'undefined' &&
                        event.sourceEvent instanceof TouchEvent
                    ) {
                        offsetY =
                            event.sourceEvent.touches[0].clientY -
                            rectCanvas?.top;

                        movementY = offsetY - tempMovementY;
                    } else {
                        offsetY = event.sourceEvent.clientY - rectCanvas?.top;

                        movementY = event.sourceEvent.movementY;
                        movementY = event.sourceEvent.movementY;
                    }
                    if (!cancelDrag) {
                        // to hide the crosshair when dragging the line set the crosshairActive to 'none'.
                        setCrosshairActive('none');

                        // // Calculate the new limit value based on the Y-coordinate.
                        if (tempNewLimitValue !== undefined) {
                            tempNewLimitValue = scaleData?.yScale.invert(
                                scaleData?.yScale(tempNewLimitValue) +
                                    movementY,
                            );

                            // Perform calculations based on the new limit value
                            if (tempNewLimitValue) {
                                newLimitValue =
                                    calculateLimit(tempNewLimitValue);
                            }
                        }
                    } else {
                        // If the drag is canceled, restore the previous limit value.
                        if (oldLimitValue !== undefined) {
                            setLimit(() => {
                                return oldLimitValue as number;
                            });
                        }
                    }
                })().then(() => {
                    if (
                        typeof TouchEvent !== 'undefined' &&
                        event.sourceEvent instanceof TouchEvent
                    ) {
                        tempMovementY =
                            event.sourceEvent.touches[0].clientY -
                            rectCanvas?.top;
                    }
                });
            })
            .on('end', () => {
                tempMovementY = 0;
                setIsLineDrag(false);
                // If the drag is not canceled
                if (!cancelDrag) {
                    // Change the cursor to 'row-resize'
                    d3.select(d3Container.current).style(
                        'cursor',
                        'row-resize',
                    );
                    if (
                        oldLimitValue !== undefined &&
                        newLimitValue !== undefined
                    ) {
                        onBlurLimitRate(oldLimitValue, newLimitValue);
                    }
                } else {
                    if (oldLimitValue !== undefined) {
                        setLimit(() => {
                            return oldLimitValue as number;
                        });
                    }
                }

                // Restore default cursor styles
                d3.select(d3CanvasMain.current).style('cursor', 'default');
                d3.select('#y-axis-canvas').style('cursor', 'default');
                setIsLineDrag(false);
            });

        setDragLimit(() => {
            return dragLimit;
        });
    }, [
        poolPriceDisplay,
        location,
        advancedMode,
        limit,
        minPrice,
        maxPrice,
        minTickForLimit,
        maxTickForLimit,
        scaleData,
        isDenomBase,
        baseTokenDecimals,
        quoteTokenDecimals,
        currentPoolPriceTick,
        denomInBase,
        isTokenABase,
        gridSize,
        rescale,
    ]);

    useEffect(() => {
        if (mainZoom && d3CanvasMain.current) {
            d3.select<Element, unknown>(d3CanvasMain.current)
                .call(mainZoom)
                .on('wheel.zoom', null);
            if (location.pathname.includes('market')) {
                d3.select(d3CanvasMain.current).on('.drag', null);
            }
            if (
                location.pathname.includes('pool') ||
                location.pathname.includes('reposition')
            ) {
                if (dragRange && !isLineDrag) {
                    d3.select<d3.DraggedElementBaseType, unknown>(
                        d3CanvasMain.current,
                    ).call(dragRange);
                }
            }
            if (location.pathname.includes('/limit')) {
                if (dragLimit && !isLineDrag) {
                    d3.select<d3.DraggedElementBaseType, unknown>(
                        d3CanvasMain.current,
                    ).call(dragLimit);
                }
            }
            renderCanvasArray([d3CanvasMain]);
        }
    }, [location.pathname, mainZoom, dragLimit, dragRange, isLineDrag]);

    // create market line and liquidity tooltip
    useEffect(() => {
        if (scaleData !== undefined) {
            const marketLine = d3fc
                .annotationCanvasLine()
                .value((d: number) => d)
                .xScale(scaleData?.xScale)
                .yScale(scaleData?.yScale);

            marketLine.decorate((context: CanvasRenderingContext2D) => {
                context.strokeStyle = 'var(--text2)';
                context.lineWidth = 0.5;
                context.fillStyle = 'transparent';
            });

            if (
                d3.select(d3Container.current).select('.liqTooltip').node() ===
                null
            ) {
                const liqTooltip = d3
                    .select(d3Container.current)
                    .append('div')
                    .attr('class', 'liqTooltip')
                    .style('visibility', 'hidden');

                setLiqTooltip(() => {
                    return liqTooltip;
                });
            }

            setMarketLine(() => {
                return marketLine;
            });
        }
    }, [
        scaleData,
        liquidityDepthScale,
        liquidityScale,
        isUserConnected,
        isDenomBase,
    ]);

    async function setXScaleDefault() {
        if (scaleData) {
            const localInitialDisplayCandleCount =
                getInitialDisplayCandleCount(mobileView);
            const nowDate = Date.now();

            const snapDiff = nowDate % (period * 1000);
            const snappedTime = nowDate + (period * 1000 - snapDiff);

            const liqBuffer =
                liqMode === 'none'
                    ? 0.95
                    : mobileView
                      ? xAxisMobileBuffer
                      : xAxisBuffer;

            const centerX = snappedTime;
            const diff =
                (localInitialDisplayCandleCount * period * 1000) / liqBuffer;

            setPrevLastCandleTime(snappedTime / 1000);

            if (scaleData) {
                scaleData.xScale.discontinuityProvider(
                    d3fc.discontinuityRange(...[]),
                );
            }

            setChartResetStatus({
                isResetChart: true,
            });
            timeGaps.forEach((obj) => (obj.isAddedPixel = false));

            const canvasDiv = d3.select(d3CanvasMain.current);

            const canvas = canvasDiv
                .select('canvas')
                .node() as HTMLCanvasElement;

            const currentRange = [0, canvas.getBoundingClientRect().width];
            const currentDomain = [
                centerX - diff * liqBuffer,
                centerX + diff * (1 - liqBuffer),
            ];

            const targetValue = Date.now();
            const targetPixel = currentRange[1] * (1 - liqBuffer);

            const newDomainMin =
                targetValue -
                ((targetPixel - currentRange[1]) /
                    (currentRange[0] - currentRange[1])) *
                    (currentDomain[1] - currentDomain[0]);
            const newDomainMax =
                targetValue +
                ((currentRange[0] - targetPixel) /
                    (currentRange[0] - currentRange[1])) *
                    (currentDomain[1] - currentDomain[0]);
            const domain = [newDomainMin, newDomainMax];

            scaleData?.xScale.domain([domain[0], domain[1]]);
            scaleData?.drawingLinearxScale.domain([domain[0], domain[1]]);
        }
    }

    function fetchCandleForResetOrLatest(isReset = false) {
        const nowDate = Date.now();
        if (isReset) {
            const localCandleDomain = {
                lastCandleDate: candleDomains.lastCandleDate,
                domainBoundry: candleDomains.domainBoundry,
                isAbortedRequest: true,
                isResetRequest: isReset,
                isCondensedFetching: candleDomains.isCondensedFetching,
            };

            setCandleDomains(localCandleDomain);
        } else {
            if ((reset || latest) && scaleData) {
                const lastCandleDataTime =
                    lastCandleData?.time * 1000 - period * 1000;
                const minDomain = Math.floor(scaleData?.xScale.domain()[0]);
                const candleDomain = {
                    lastCandleDate: nowDate,
                    domainBoundry:
                        lastCandleDataTime > minDomain
                            ? minDomain
                            : lastCandleDataTime,
                    isAbortedRequest: false,
                    isResetRequest: isReset,
                    isCondensedFetching: candleDomains.isCondensedFetching,
                };

                if (!isReset) {
                    let maxTime: number | undefined = undefined;
                    for (let i = 0; i < unparsedData.candles.length - 1; i++) {
                        if (
                            unparsedData.candles[i].time -
                                unparsedData.candles[i + 1].time >
                            period
                        ) {
                            maxTime = unparsedData.candles[i].time * 1000;
                        }
                    }
                    if (maxTime && unparsedData) {
                        const localCandles = unparsedData.candles.filter(
                            (i) =>
                                maxTime === undefined ||
                                i.time * 1000 >= maxTime,
                        );
                        const localCandleData = {
                            ...unparsedData,
                            candles: localCandles,
                        };

                        setCandleData(localCandleData);
                    }
                }
                setCandleDomains(candleDomain);
            }
        }
    }
    async function resetFunc(isReset = false) {
        if (scaleData) {
            setBandwidth(defaultCandleBandwith);
            setXScaleDefault();
            fetchCandleForResetOrLatest(isReset);
            setIsChangeScaleChart(false);
            changeScale(false);
        }
    }

    // when click reset chart should be auto scale
    useEffect(() => {
        if (
            scaleData !== undefined &&
            reset &&
            poolPriceDisplay !== undefined
        ) {
            resetFunc();
            setReset(false);
            setShowLatest(false);
            setShouldResetBuffer(true);
        }
    }, [reset, minTickForLimit, maxTickForLimit]);

    // when click latest
    useEffect(() => {
        if (scaleData !== undefined && latest) {
            if (rescale) {
                resetFunc();
            } else {
                setXScaleDefault();
                fetchCandleForResetOrLatest();

                const targetValue = poolPriceDisplay;
                const targetPixel = scaleData.yScale.range()[0] / 2;

                const currentRange = scaleData?.yScale.range();
                const currentDomain = scaleData?.yScale.domain();

                const newDomainMin =
                    targetValue -
                    ((targetPixel - currentRange[1]) /
                        (currentRange[0] - currentRange[1])) *
                        (currentDomain[1] - currentDomain[0]);
                const newDomainMax =
                    targetValue +
                    ((currentRange[0] - targetPixel) /
                        (currentRange[0] - currentRange[1])) *
                        (currentDomain[1] - currentDomain[0]);
                const domain = [newDomainMin, newDomainMax];

                setYaxisDomain(domain[0], domain[1]);
                render();
            }

            setLatest(false);
            setShowLatest(false);
        }
    }, [
        latest,
        denomInBase,
        poolPriceDisplay,
        rescale,
        location.pathname,
        liqMode,
    ]);

    const onClickRange = async (event: PointerEvent) => {
        if (scaleData && liquidityData && currentPoolPriceTick !== undefined) {
            let newRangeValue: lineValue[];

            const low = ranges.filter(
                (target: lineValue) => target.name === 'Min',
            )[0].value;
            const high = ranges.filter(
                (target: lineValue) => target.name === 'Max',
            )[0].value;

            let clickedValue =
                scaleData?.yScale.invert(d3.pointer(event)[1]) >=
                liquidityData?.topBoundary
                    ? liquidityData?.topBoundary
                    : scaleData?.yScale.invert(d3.pointer(event)[1]);

            clickedValue = clickedValue < 0 ? 0.01 : clickedValue;

            const displayValue =
                poolPriceDisplay !== undefined ? poolPriceDisplay : 0;

            let lineToBeSet: string;

            if (low < displayValue && high < displayValue) {
                lineToBeSet =
                    Math.abs(clickedValue - high) < Math.abs(clickedValue - low)
                        ? 'Max'
                        : 'Min';
            } else {
                lineToBeSet = clickedValue > displayValue ? 'Max' : 'Min';
            }

            if (!advancedMode || location.pathname.includes('reposition')) {
                let rangeWidthPercentage;
                let tickValue;
                if (
                    clickedValue === 0 ||
                    clickedValue === liquidityData?.topBoundary ||
                    clickedValue < liquidityData?.lowBoundary
                ) {
                    rangeWidthPercentage = 100;
                    setRanges((prevState) => {
                        const newTargets = [...prevState];

                        newTargets.filter(
                            (target: lineValue) => target.name === 'Min',
                        )[0].value = 0;

                        newTargets.filter(
                            (target: lineValue) => target.name === 'Max',
                        )[0].value = liquidityData?.topBoundary;

                        newRangeValue = newTargets;

                        return newTargets;
                    });
                } else {
                    if (lineToBeSet === 'Max') {
                        tickValue = getPinnedTickFromDisplayPrice(
                            isDenomBase,
                            baseTokenDecimals,
                            quoteTokenDecimals,
                            false, // isMinPrice
                            clickedValue.toString(),
                            gridSize,
                        );

                        rangeWidthPercentage = roundToNearestPreset(
                            Math.abs(tickValue - currentPoolPriceTick) / 100,
                        );
                    } else {
                        tickValue = getPinnedTickFromDisplayPrice(
                            isDenomBase,
                            baseTokenDecimals,
                            quoteTokenDecimals,
                            true, // isMinPrice
                            clickedValue.toString(),
                            gridSize,
                        );

                        rangeWidthPercentage = roundToNearestPreset(
                            Math.abs(currentPoolPriceTick - tickValue) / 100,
                        );
                    }
                }

                if (event.pointerType === 'touch') {
                    const lowTick =
                        currentPoolPriceTick - rangeWidthPercentage * 100;
                    const highTick =
                        currentPoolPriceTick + rangeWidthPercentage * 100;

                    const pinnedDisplayPrices = getPinnedPriceValuesFromTicks(
                        isDenomBase,
                        baseTokenDecimals,
                        quoteTokenDecimals,
                        lowTick,
                        highTick,
                        gridSize,
                    );

                    setMaxPrice(
                        parseFloat(
                            pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
                        ),
                    );
                    setMinPrice(
                        parseFloat(
                            pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
                        ),
                    );
                }

                setSimpleRangeWidth(rangeWidthPercentage);
            } else {
                const value =
                    scaleData?.yScale.invert(event.offsetY) < 0
                        ? 0.1
                        : scaleData?.yScale.invert(event.offsetY);

                let pinnedDisplayPrices: {
                    pinnedMinPriceDisplay: string;
                    pinnedMaxPriceDisplay: string;
                    pinnedMinPriceDisplayTruncated: string;
                    pinnedMaxPriceDisplayTruncated: string;
                    pinnedLowTick: number;
                    pinnedHighTick: number;
                    pinnedMinPriceNonDisplay: number;
                    pinnedMaxPriceNonDisplay: number;
                };

                if (lineToBeSet === 'Max') {
                    pinnedDisplayPrices = getPinnedPriceValuesFromDisplayPrices(
                        denomInBase,
                        baseTokenDecimals,
                        quoteTokenDecimals,
                        low.toString(),
                        value.toString(),
                        gridSize,
                    );
                } else {
                    pinnedDisplayPrices = getPinnedPriceValuesFromDisplayPrices(
                        denomInBase,
                        baseTokenDecimals,
                        quoteTokenDecimals,
                        value.toString(),
                        high.toString(),
                        gridSize,
                    );
                }

                const pinnedMaxPriceDisplayTruncated = parseFloat(
                    pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
                );
                const pinnedMinPriceDisplayTruncated = parseFloat(
                    pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
                );

                (async () => {
                    setRanges((prevState) => {
                        const newTargets = [...prevState];

                        if (lineToBeSet === 'Max') {
                            newTargets.filter(
                                (target: lineValue) => target.name === 'Max',
                            )[0].value = isScientific
                                ? Number(
                                      pinnedDisplayPrices.pinnedMaxPriceDisplay,
                                  )
                                : pinnedMaxPriceDisplayTruncated;
                        } else {
                            newTargets.filter(
                                (target: lineValue) => target.name === 'Min',
                            )[0].value = isScientific
                                ? Number(
                                      pinnedDisplayPrices.pinnedMinPriceDisplay,
                                  )
                                : pinnedMinPriceDisplayTruncated;
                        }

                        newRangeValue = newTargets;

                        return newTargets;
                    });
                })().then(() => {
                    onBlurRange(
                        newRangeValue,
                        lineToBeSet === 'Max',
                        lineToBeSet === 'Min',
                        false,
                    );
                });
            }
        }
    };

    useEffect(() => {
        if (scaleData !== undefined) {
            const crosshairVerticalCanvas = d3fc
                .annotationCanvasLine()
                .orient('vertical')
                .value((d: crosshair) => d.x)
                .xScale(scaleData?.xScale)
                .yScale(scaleData?.yScale)
                .label('');

            crosshairVerticalCanvas.decorate(
                (context: CanvasRenderingContext2D) => {
                    context.strokeStyle = 'rgba(235, 235, 255)';
                    context.lineWidth = 0.3;
                    context.fillStyle = 'transparent';
                },
            );

            setCrosshairVerticalCanvas(() => {
                return crosshairVerticalCanvas;
            });

            const crosshairHorizontal = d3fc
                .annotationCanvasLine()
                .value((d: crosshair) => d.y)
                .xScale(scaleData?.xScale)
                .yScale(scaleData?.yScale);

            crosshairHorizontal.decorate(
                (context: CanvasRenderingContext2D) => {
                    context.strokeStyle = 'rgba(235, 235, 255)';
                    context.lineWidth = 0.3;
                    context.fillStyle = 'transparent';
                },
            );

            setCrosshairHorizontal(() => {
                return crosshairHorizontal;
            });

            if (
                d3
                    .select(d3Container.current)
                    .select('.xAxisTooltip')
                    .node() === null
            ) {
                const xAxisTooltip = d3
                    .select(d3Container.current)
                    .append('div')
                    .attr('class', 'xAxisTooltip')
                    .style('z-index', '2')
                    .style('visibility', 'hidden');

                setXaxisTooltip(() => {
                    return xAxisTooltip;
                });
            }
        }
    }, [scaleData]);

    useEffect(() => {
        if (d3CanvasMain) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const canvasDiv = d3.select(d3CanvasMain.current) as any;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resizeObserver = new ResizeObserver(() => {
                const canvas = canvasDiv
                    .select('canvas')
                    .node() as HTMLCanvasElement;
                setMainCanvasBoundingClientRect(canvas.getBoundingClientRect());
                render();
            });

            resizeObserver.observe(canvasDiv.node());

            return () => resizeObserver.unobserve(canvasDiv.node());
        }
    }, [handleDocumentEvent]);

    useEffect(() => {
        if (d3Container) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const canvasDiv = d3.select(d3Container.current) as any;
            const resizeObserver = new ResizeObserver(() => {
                const chartRect = canvasDiv.node().getBoundingClientRect();
                if (chartRect.height !== 0) {
                    setChartContainerOptions(chartRect);
                }
            });

            resizeObserver.observe(canvasDiv.node());

            return () => resizeObserver.unobserve(canvasDiv.node());
        }
    }, [handleDocumentEvent]);

    useEffect(() => {
        const canvas = d3
            .select(d3CanvasCrosshair.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

        if (crosshairHorizontal && crosshairVerticalCanvas) {
            d3.select(d3CanvasCrosshair.current)
                .on('draw', () => {
                    setCanvasResolution(canvas);
                    ctx.setLineDash([4, 2]);
                    crosshairVerticalCanvas(crosshairData);
                    if (crosshairActive === 'chart') {
                        crosshairHorizontal(crosshairData);
                    }
                })
                .on('measure', (event: CustomEvent) => {
                    scaleData?.xScale.range([0, event.detail.width]);
                    scaleData?.drawingLinearxScale.range([
                        0,
                        event.detail.width,
                    ]);
                    scaleData?.yScale.range([event.detail.height, 0]);
                    ctx.setLineDash([4, 2]);
                    crosshairVerticalCanvas.context(ctx);
                    if (crosshairActive === 'chart') {
                        crosshairHorizontal.context(ctx);
                    }
                });
        }
    }, [
        crosshairData,
        crosshairHorizontal,
        crosshairActive,
        crosshairVerticalCanvas,
    ]);

    const circleSeries = createCircle(
        scaleData?.drawingLinearxScale,
        scaleData?.yScale,
        50,
        0.5,
        denomInBase,
    );

    const selectedCircleSeries = createCircle(
        scaleData?.drawingLinearxScale,
        scaleData?.yScale,
        70,
        0.5,
        denomInBase,
        true,
    );

    useEffect(() => {
        const canvas = d3
            .select(d3CanvasMain.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        const canvasSize = canvas.getBoundingClientRect();

        if (scaleData && lineSeries) {
            const rayLine = createAnnotationLineSeries(
                scaleData?.drawingLinearxScale.copy(),
                scaleData?.yScale,
                denomInBase,
            );

            const bandArea = createBandArea(
                scaleData?.drawingLinearxScale.copy(),
                scaleData?.yScale,
                denomInBase,
            );

            d3.select(d3CanvasMain.current)
                .on('draw', () => {
                    setCanvasResolution(canvas);

                    drawnShapeHistory?.forEach((item) => {
                        if (item.pool) {
                            const isShapeInCurrentPool =
                                tokenA.address ===
                                    (isTokenABase === item.pool.isTokenABase
                                        ? item.pool.tokenA
                                        : item.pool.tokenB) &&
                                tokenB.address ===
                                    (isTokenABase === item.pool.isTokenABase
                                        ? item.pool.tokenB
                                        : item.pool.tokenA);

                            if (isShapeInCurrentPool) {
                                if (
                                    item.type === 'Brush' ||
                                    item.type === 'Angle'
                                ) {
                                    if (ctx) ctx.setLineDash(item.line.dash);
                                    lineSeries.decorate(
                                        (context: CanvasRenderingContext2D) => {
                                            context.strokeStyle =
                                                item.line.color;
                                            context.lineWidth =
                                                item.line.lineWidth;
                                        },
                                    );

                                    lineSeries(item?.data);
                                    if (ctx) ctx.setLineDash([0, 0]);
                                }

                                if (
                                    item.type === 'Rect' ||
                                    item.type === 'DPRange'
                                ) {
                                    const range = [
                                        scaleData?.drawingLinearxScale(
                                            item.data[0].x,
                                        ),
                                        scaleData?.drawingLinearxScale(
                                            item.data[1].x,
                                        ),
                                    ];

                                    bandArea.xScale().range(range);

                                    if (item.background.active) {
                                        const checkDenom =
                                            item.data[0].denomInBase ===
                                            denomInBase;
                                        const bandData = {
                                            fromValue: checkDenom
                                                ? item.data[0].y
                                                : 1 / item.data[0].y,
                                            toValue: checkDenom
                                                ? item.data[1].y
                                                : 1 / item.data[1].y,
                                            denomInBase: denomInBase,
                                        } as bandLineData;

                                        if (item.background) {
                                            bandArea.decorate(
                                                (
                                                    context: CanvasRenderingContext2D,
                                                ) => {
                                                    context.fillStyle =
                                                        item.background.color;
                                                },
                                            );
                                        }

                                        bandArea([bandData]);
                                    }

                                    if (item.border.active) {
                                        const lineOfBand =
                                            createPointsOfBandLine(item.data);

                                        lineOfBand?.forEach((line) => {
                                            if (ctx)
                                                ctx.setLineDash(
                                                    item.border.dash,
                                                );
                                            lineSeries.decorate(
                                                (
                                                    context: CanvasRenderingContext2D,
                                                ) => {
                                                    context.strokeStyle =
                                                        item.border.color;
                                                    context.lineWidth =
                                                        item.border.lineWidth;
                                                },
                                            );
                                            lineSeries(line);

                                            if (item.type === 'Rect')
                                                if (
                                                    (hoveredDrawnShape &&
                                                        hoveredDrawnShape.data
                                                            .time ===
                                                            item.time) ||
                                                    (selectedDrawnShape &&
                                                        selectedDrawnShape.data
                                                            .time === item.time)
                                                ) {
                                                    line.forEach(
                                                        (element, _index) => {
                                                            const selectedCircleIsActive =
                                                                hoveredDrawnShape &&
                                                                hoveredDrawnShape.selectedCircle &&
                                                                hoveredDrawnShape
                                                                    .selectedCircle
                                                                    .x ===
                                                                    element.x &&
                                                                Number(
                                                                    element.y.toFixed(
                                                                        12,
                                                                    ),
                                                                ) ===
                                                                    (element.denomInBase ===
                                                                    denomInBase
                                                                        ? Number(
                                                                              hoveredDrawnShape?.selectedCircle.y.toFixed(
                                                                                  12,
                                                                              ),
                                                                          )
                                                                        : Number(
                                                                              (
                                                                                  1 /
                                                                                  hoveredDrawnShape
                                                                                      ?.selectedCircle
                                                                                      .y
                                                                              ).toFixed(
                                                                                  12,
                                                                              ),
                                                                          ));

                                                            if (
                                                                selectedCircleIsActive
                                                            ) {
                                                                if (
                                                                    !isUpdatingShape
                                                                ) {
                                                                    selectedCircleSeries(
                                                                        [
                                                                            element,
                                                                        ],
                                                                    );
                                                                }
                                                            } else {
                                                                if (ctx)
                                                                    ctx.setLineDash(
                                                                        [0, 0],
                                                                    );
                                                                circleSeries([
                                                                    element,
                                                                ]);
                                                            }
                                                        },
                                                    );
                                                }
                                        });
                                    }

                                    if (
                                        item.type === 'Rect' &&
                                        item.line.active
                                    ) {
                                        if (ctx)
                                            ctx.setLineDash(item.line.dash);
                                        lineSeries.decorate(
                                            (
                                                context: CanvasRenderingContext2D,
                                            ) => {
                                                context.strokeStyle =
                                                    item.line.color;
                                                context.lineWidth =
                                                    item.line.lineWidth;
                                            },
                                        );
                                        lineSeries(item.data);
                                    }

                                    if (item.type === 'DPRange') {
                                        const lineOfDPRange =
                                            createPointsOfDPRangeLine(
                                                item.data,
                                                scaleData.drawingLinearxScale,
                                            );

                                        lineOfDPRange?.forEach((line) => {
                                            if (ctx)
                                                ctx.setLineDash(item.line.dash);
                                            lineSeries.decorate(
                                                (
                                                    context: CanvasRenderingContext2D,
                                                ) => {
                                                    context.strokeStyle =
                                                        item.line.color;
                                                    context.lineWidth =
                                                        item.line.lineWidth;
                                                },
                                            );
                                            lineSeries(line);
                                        });

                                        const firstPointYAxisData =
                                            item.data[0].denomInBase ===
                                            denomInBase
                                                ? item.data[0].y
                                                : 1 / item.data[0].y;
                                        const secondPointYAxisData =
                                            item.data[1].denomInBase ===
                                            denomInBase
                                                ? item.data[1].y
                                                : 1 / item.data[1].y;

                                        const filtered =
                                            unparsedCandleData.filter(
                                                (data: CandleDataIF) =>
                                                    data.time * 1000 >=
                                                        Math.min(
                                                            item.data[0].x,
                                                            item.data[1].x,
                                                        ) &&
                                                    data.time * 1000 <=
                                                        Math.max(
                                                            item.data[0].x,
                                                            item.data[1].x,
                                                        ),
                                            );

                                        const totalVolumeCovered =
                                            filtered.reduce(
                                                (sum, obj) =>
                                                    sum + obj.volumeUSD,
                                                0,
                                            );

                                        const height = Math.abs(
                                            scaleData.yScale(
                                                firstPointYAxisData,
                                            ) -
                                                scaleData.yScale(
                                                    secondPointYAxisData,
                                                ),
                                        );

                                        const width = Math.abs(
                                            scaleData.drawingLinearxScale(
                                                item.data[0].x,
                                            ) -
                                                scaleData.drawingLinearxScale(
                                                    item.data[1].x,
                                                ),
                                        );

                                        const lengthAsDate =
                                            (item.data[0].x > item.data[1].x
                                                ? '-'
                                                : '') +
                                            formatTimeDifference(
                                                new Date(
                                                    Math.min(
                                                        item.data[1].x,
                                                        item.data[0].x,
                                                    ),
                                                ),
                                                new Date(
                                                    Math.max(
                                                        item.data[1].x,
                                                        item.data[0].x,
                                                    ),
                                                ),
                                            );

                                        const heightAsPrice =
                                            secondPointYAxisData -
                                            firstPointYAxisData;

                                        const heightAsPercentage = (
                                            (Number(heightAsPrice) /
                                                Math.min(
                                                    firstPointYAxisData,
                                                    secondPointYAxisData,
                                                )) *
                                            100
                                        ).toFixed(2);

                                        const infoLabelHeight = 66;
                                        const infoLabelWidth = 195;

                                        const diff =
                                            Math.abs(
                                                scaleData.drawingLinearxScale(
                                                    item.data[0].x,
                                                ) -
                                                    scaleData.drawingLinearxScale(
                                                        item.data[1].x,
                                                    ),
                                            ) / 2;

                                        const infoLabelXAxisData =
                                            scaleData.drawingLinearxScale(
                                                Math.min(
                                                    item.data[0].x,
                                                    item.data[1].x,
                                                ),
                                            ) + diff;

                                        const yAxisLabelPlacement =
                                            scaleData.yScale(
                                                firstPointYAxisData,
                                            ) <
                                            scaleData.yScale(
                                                secondPointYAxisData,
                                            )
                                                ? scaleData.yScale(
                                                      firstPointYAxisData,
                                                  ) > canvas.height
                                                    ? scaleData.yScale(
                                                          secondPointYAxisData,
                                                      ) + 15
                                                    : Math.min(
                                                          scaleData.yScale(
                                                              secondPointYAxisData,
                                                          ) + 15,
                                                          canvasSize.height -
                                                              (infoLabelHeight +
                                                                  5),
                                                      )
                                                : scaleData.yScale(
                                                        firstPointYAxisData,
                                                    ) < 5
                                                  ? scaleData.yScale(
                                                        secondPointYAxisData,
                                                    ) -
                                                    (infoLabelHeight + 15)
                                                  : Math.max(
                                                        scaleData.yScale(
                                                            secondPointYAxisData,
                                                        ) -
                                                            (infoLabelHeight +
                                                                15),
                                                        5,
                                                    );

                                        const arrowArray =
                                            createArrowPointsOfDPRangeLine(
                                                item.data,
                                                scaleData,
                                                denomInBase,
                                                height > 30 && width > 30
                                                    ? 10
                                                    : 5,
                                            );

                                        arrowArray.forEach((arrow) => {
                                            lineSeries(arrow);
                                        });

                                        if (ctx) {
                                            ctx.beginPath();
                                            ctx.fillStyle = 'rgb(34,44,58)';
                                            ctx.fillRect(
                                                infoLabelXAxisData -
                                                    infoLabelWidth / 2,
                                                yAxisLabelPlacement,
                                                infoLabelWidth,
                                                infoLabelHeight,
                                            );
                                            ctx.fillStyle =
                                                'rgba(210,210,210,1)';
                                            ctx.font = '13.5px Lexend Deca';
                                            ctx.textAlign = 'center';
                                            ctx.textBaseline = 'middle';

                                            const maxPrice =
                                                secondPointYAxisData *
                                                Math.pow(
                                                    10,
                                                    baseTokenDecimals -
                                                        quoteTokenDecimals,
                                                );

                                            const minPrice =
                                                firstPointYAxisData *
                                                Math.pow(
                                                    10,
                                                    baseTokenDecimals -
                                                        quoteTokenDecimals,
                                                );

                                            const dpRangeTickPrice =
                                                maxPrice && minPrice
                                                    ? Math.floor(
                                                          Math.log(maxPrice) /
                                                              Math.log(1.0001),
                                                      ) -
                                                      Math.floor(
                                                          Math.log(minPrice) /
                                                              Math.log(1.0001),
                                                      )
                                                    : 0;

                                            ctx.fillText(
                                                getDollarPrice(heightAsPrice)
                                                    .formattedValue +
                                                    ' ' +
                                                    ' (' +
                                                    heightAsPercentage.toString() +
                                                    '%)  ' +
                                                    dpRangeTickPrice,

                                                infoLabelXAxisData,
                                                yAxisLabelPlacement + 16,
                                            );
                                            const min = Math.min(
                                                item.data[0].x,
                                                item.data[1].x,
                                            );
                                            const max = Math.max(
                                                item.data[0].x,
                                                item.data[1].x,
                                            );
                                            const showCandleCount =
                                                getCandleCount(
                                                    scaleData.drawingLinearxScale,
                                                    unparsedCandleData,
                                                    [min, max],
                                                    period,
                                                    isCondensedModeEnabled,
                                                );
                                            ctx.fillText(
                                                showCandleCount +
                                                    ' bars,  ' +
                                                    lengthAsDate,

                                                infoLabelXAxisData,
                                                yAxisLabelPlacement + 33,
                                            );
                                            ctx.fillText(
                                                'Vol ' +
                                                    formatDollarAmountAxis(
                                                        totalVolumeCovered,
                                                    ).replace('$', ''),

                                                infoLabelXAxisData,
                                                yAxisLabelPlacement + 50,
                                            );
                                        }
                                    }

                                    if (
                                        (hoveredDrawnShape &&
                                            hoveredDrawnShape.data.time ===
                                                item.time) ||
                                        (selectedDrawnShape &&
                                            selectedDrawnShape.data.time ===
                                                item.time)
                                    ) {
                                        item.data.forEach((element, _index) => {
                                            const selectedCircleIsActive =
                                                hoveredDrawnShape &&
                                                hoveredDrawnShape.selectedCircle &&
                                                hoveredDrawnShape.selectedCircle
                                                    .x === element.x &&
                                                Number(
                                                    element.y.toFixed(12),
                                                ) ===
                                                    (element.denomInBase ===
                                                    denomInBase
                                                        ? Number(
                                                              hoveredDrawnShape?.selectedCircle.y.toFixed(
                                                                  12,
                                                              ),
                                                          )
                                                        : Number(
                                                              (
                                                                  1 /
                                                                  hoveredDrawnShape
                                                                      ?.selectedCircle
                                                                      .y
                                                              ).toFixed(12),
                                                          ));

                                            if (selectedCircleIsActive) {
                                                if (!isUpdatingShape) {
                                                    selectedCircleSeries([
                                                        element,
                                                    ]);
                                                }
                                            } else {
                                                if (ctx)
                                                    ctx.setLineDash([0, 0]);
                                                circleSeries([element]);
                                            }
                                        });
                                    }
                                }

                                if (item.type === 'Ray') {
                                    rayLine
                                        .xScale()
                                        .domain(
                                            scaleData.drawingLinearxScale.domain(),
                                        );

                                    rayLine
                                        .yScale()
                                        .domain(scaleData.yScale.domain());

                                    const range = [
                                        scaleData.drawingLinearxScale(
                                            item.data[0].x,
                                        ),
                                        scaleData.drawingLinearxScale.range()[1],
                                    ];

                                    rayLine.xScale().range(range);

                                    if (ctx) ctx.setLineDash(item.line.dash);

                                    rayLine.decorate(
                                        (context: CanvasRenderingContext2D) => {
                                            context.strokeStyle =
                                                item.line.color;
                                            context.lineWidth =
                                                item.line.lineWidth;
                                        },
                                    );

                                    rayLine([
                                        {
                                            denomInBase:
                                                item.data[0].denomInBase,
                                            y: item.data[0].y,
                                        },
                                    ]);
                                    if (
                                        (hoveredDrawnShape &&
                                            hoveredDrawnShape.data.time ===
                                                item.time) ||
                                        (selectedDrawnShape &&
                                            selectedDrawnShape.data.time ===
                                                item.time)
                                    ) {
                                        if (
                                            hoveredDrawnShape &&
                                            hoveredDrawnShape.selectedCircle &&
                                            hoveredDrawnShape.selectedCircle
                                                .x === item.data[0].x &&
                                            Number(
                                                item.data[0].y.toFixed(12),
                                            ) ===
                                                (item.data[0].denomInBase ===
                                                denomInBase
                                                    ? Number(
                                                          hoveredDrawnShape?.selectedCircle.y.toFixed(
                                                              12,
                                                          ),
                                                      )
                                                    : Number(
                                                          (
                                                              1 /
                                                              hoveredDrawnShape
                                                                  ?.selectedCircle
                                                                  .y
                                                          ).toFixed(12),
                                                      ))
                                        ) {
                                            if (!isUpdatingShape) {
                                                selectedCircleSeries([
                                                    item.data[0],
                                                ]);
                                            }
                                        } else {
                                            if (ctx) ctx.setLineDash([0, 0]);
                                            circleSeries([
                                                {
                                                    denomInBase:
                                                        item.data[0]
                                                            .denomInBase,
                                                    y: item.data[0].y,
                                                    x: item.data[0].x,
                                                },
                                            ]);
                                        }
                                    }
                                }

                                if (
                                    item.type === 'FibRetracement' &&
                                    annotationLineSeries
                                ) {
                                    const data = structuredClone(item.data);

                                    if (item.reverse) {
                                        [data[0], data[1]] = [data[1], data[0]];
                                    }

                                    const range = [
                                        item.extendLeft
                                            ? scaleData.drawingLinearxScale.range()[0]
                                            : scaleData?.drawingLinearxScale(
                                                  Math.min(
                                                      item.data[0].x,
                                                      item.data[1].x,
                                                  ),
                                              ),
                                        item.extendRight
                                            ? scaleData.drawingLinearxScale.range()[1]
                                            : scaleData?.drawingLinearxScale(
                                                  Math.max(
                                                      item.data[0].x,
                                                      item.data[1].x,
                                                  ),
                                              ),
                                    ];

                                    bandArea.xScale().range(range);

                                    annotationLineSeries.xScale().range(range);

                                    const fibLineData = calculateFibRetracement(
                                        data,
                                        item.extraData,
                                        denomInBase,
                                    );

                                    const bandAreaData =
                                        calculateFibRetracementBandAreas(
                                            data,
                                            item.extraData,
                                            denomInBase,
                                        );

                                    bandAreaData.forEach((bandData) => {
                                        bandArea.decorate(
                                            (
                                                context: CanvasRenderingContext2D,
                                            ) => {
                                                context.fillStyle =
                                                    bandData.areaColor.toString();
                                            },
                                        );

                                        bandArea([bandData]);
                                    });

                                    fibLineData.forEach((lineData) => {
                                        const level =
                                            lineData[0].denomInBase ===
                                            denomInBase
                                                ? lineData[0].y
                                                : 1 / lineData[0].y;

                                        const priceLevel =
                                            level < 1
                                                ? formatSubscript(level)
                                                : level.toFixed(2).toString();

                                        const lineLabel =
                                            lineData[0].level +
                                            ' (' +
                                            priceLevel +
                                            ')';

                                        const lineMeasures =
                                            ctx?.measureText(lineLabel);

                                        if (
                                            lineMeasures &&
                                            (item.extendLeft ||
                                                item.extendRight) &&
                                            item.labelAlignment === 'Middle' &&
                                            ctx
                                        ) {
                                            const bufferLeft =
                                                item.extendLeft &&
                                                item.labelPlacement === 'Left'
                                                    ? lineMeasures.width + 15
                                                    : 0;

                                            const bufferRight =
                                                canvasSize.width -
                                                (item.extendRight &&
                                                item.labelPlacement === 'Right'
                                                    ? lineMeasures.width + 15
                                                    : 0);

                                            ctx.save();
                                            ctx.beginPath();

                                            ctx.rect(
                                                bufferLeft,
                                                0,
                                                bufferRight,
                                                canvasSize.height,
                                            );

                                            ctx.clip();
                                        }

                                        if (
                                            item.labelPlacement === 'Center' &&
                                            item.labelAlignment === 'Middle' &&
                                            lineMeasures &&
                                            ctx
                                        ) {
                                            const buffer =
                                                scaleData.drawingLinearxScale(
                                                    Math.min(
                                                        lineData[0].x,
                                                        lineData[1].x,
                                                    ) +
                                                        Math.abs(
                                                            lineData[0].x -
                                                                lineData[1].x,
                                                        ) /
                                                            2,
                                                );

                                            ctx.save();
                                            ctx.beginPath();

                                            ctx.rect(
                                                0,
                                                0,
                                                buffer -
                                                    lineMeasures.width / 2 -
                                                    5,
                                                canvasSize.height,
                                            );
                                            ctx.rect(
                                                buffer +
                                                    lineMeasures.width / 2 +
                                                    5,
                                                0,
                                                canvasSize.width,
                                                canvasSize.height,
                                            );

                                            ctx.clip();
                                        }

                                        annotationLineSeries.decorate(
                                            (
                                                context: CanvasRenderingContext2D,
                                            ) => {
                                                context.strokeStyle =
                                                    lineData[0].lineColor;

                                                context.lineWidth = 1.5;
                                            },
                                        );

                                        annotationLineSeries(lineData);

                                        ctx?.restore();

                                        const textColor = lineData[0].lineColor;

                                        let alignment;
                                        const textBaseline =
                                            item.labelAlignment === 'Top'
                                                ? 'bottom'
                                                : item.labelAlignment ===
                                                    'Bottom'
                                                  ? 'top'
                                                  : (item.labelAlignment.toLowerCase() as CanvasTextBaseline);

                                        if (item.labelPlacement === 'Center') {
                                            alignment = 'center';
                                        } else {
                                            if (item.extendLeft) {
                                                alignment =
                                                    item.extendRight &&
                                                    item.labelPlacement ===
                                                        'Right'
                                                        ? 'right'
                                                        : 'left';
                                            } else if (
                                                item.extendRight ||
                                                item.labelPlacement === 'Left'
                                            ) {
                                                alignment = 'right';
                                            } else {
                                                alignment = 'left';
                                            }
                                        }

                                        if (ctx) {
                                            ((ctx.fillStyle = textColor),
                                                (ctx.font =
                                                    '12px Lexend Deca'));
                                            ctx.textAlign =
                                                alignment as CanvasTextAlign;
                                            ctx.textBaseline = textBaseline;

                                            let location: number = Math.min(
                                                lineData[0].x,
                                                lineData[1].x,
                                            );

                                            if (
                                                item.labelPlacement === 'Center'
                                            ) {
                                                location =
                                                    Math.min(
                                                        lineData[0].x,
                                                        lineData[1].x,
                                                    ) +
                                                    Math.abs(
                                                        lineData[0].x -
                                                            lineData[1].x,
                                                    ) /
                                                        2;
                                            } else {
                                                if (item.extendLeft) {
                                                    if (
                                                        item.labelPlacement ===
                                                        'Left'
                                                    ) {
                                                        location =
                                                            scaleData.drawingLinearxScale.domain()[0];
                                                    } else if (
                                                        item.labelPlacement ===
                                                        'Right'
                                                    ) {
                                                        if (item.extendRight) {
                                                            location =
                                                                scaleData.drawingLinearxScale.domain()[1];
                                                        } else {
                                                            location = Math.max(
                                                                lineData[0].x,
                                                                lineData[1].x,
                                                            );
                                                        }
                                                    }
                                                } else if (item.extendRight) {
                                                    location =
                                                        item.labelPlacement ===
                                                        'Left'
                                                            ? Math.min(
                                                                  lineData[0].x,
                                                                  lineData[1].x,
                                                              )
                                                            : scaleData.drawingLinearxScale.domain()[1];
                                                } else {
                                                    location =
                                                        item.labelPlacement ===
                                                        'Left'
                                                            ? Math.min(
                                                                  lineData[0].x,
                                                                  lineData[1].x,
                                                              )
                                                            : Math.max(
                                                                  lineData[0].x,
                                                                  lineData[1].x,
                                                              );
                                                }
                                            }

                                            const linePlacement =
                                                scaleData.drawingLinearxScale(
                                                    location,
                                                ) +
                                                (alignment === 'right'
                                                    ? -10
                                                    : alignment === 'left'
                                                      ? +10
                                                      : 0);

                                            ctx.fillText(
                                                lineLabel,
                                                linePlacement,
                                                scaleData.yScale(
                                                    denomInBase ===
                                                        lineData[0].denomInBase
                                                        ? lineData[0].y
                                                        : 1 / lineData[0].y,
                                                ) +
                                                    (item.labelAlignment.toLowerCase() ===
                                                    'bottom'
                                                        ? 5
                                                        : item.labelAlignment.toLowerCase() ===
                                                            'top'
                                                          ? -5
                                                          : 0),
                                            );
                                        }
                                    });

                                    if (item.line.active) {
                                        if (ctx)
                                            ctx.setLineDash(item.line.dash);
                                        lineSeries.decorate(
                                            (
                                                context: CanvasRenderingContext2D,
                                            ) => {
                                                context.strokeStyle =
                                                    item.line.color;
                                                context.lineWidth =
                                                    item.line.lineWidth;
                                            },
                                        );
                                        lineSeries(data);
                                    }

                                    if (ctx) ctx.setLineDash([0, 0]);
                                }

                                if (
                                    item.type === 'Brush' ||
                                    item.type === 'Angle' ||
                                    item.type === 'FibRetracement'
                                ) {
                                    if (
                                        (hoveredDrawnShape &&
                                            hoveredDrawnShape.data.time ===
                                                item.time) ||
                                        (selectedDrawnShape &&
                                            selectedDrawnShape.data.time ===
                                                item.time)
                                    ) {
                                        item.data.forEach((element) => {
                                            if (
                                                hoveredDrawnShape &&
                                                hoveredDrawnShape.selectedCircle &&
                                                hoveredDrawnShape.selectedCircle
                                                    .x === element.x &&
                                                Number(
                                                    element.y.toFixed(12),
                                                ) ===
                                                    (element.denomInBase ===
                                                    denomInBase
                                                        ? Number(
                                                              hoveredDrawnShape?.selectedCircle.y.toFixed(
                                                                  12,
                                                              ),
                                                          )
                                                        : Number(
                                                              (
                                                                  1 /
                                                                  hoveredDrawnShape
                                                                      ?.selectedCircle
                                                                      .y
                                                              ).toFixed(12),
                                                          ))
                                            ) {
                                                if (!isUpdatingShape) {
                                                    selectedCircleSeries([
                                                        element,
                                                    ]);
                                                }
                                            } else {
                                                circleSeries([element]);
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    });

                    setIsShapeEdited(false);
                })
                .on('measure', () => {
                    bandArea.context(ctx);
                    rayLine.context(ctx);
                    lineSeries.context(ctx);
                    annotationLineSeries.context(ctx);
                    circleSeries.context(ctx);
                    selectedCircleSeries.context(ctx);
                });

            render();
        }
    }, [
        diffHashSig(drawnShapeHistory),
        lineSeries,
        annotationLineSeries,
        hoveredDrawnShape,
        selectedDrawnShape,
        isUpdatingShape,
        denomInBase,
        period,
        isShapeEdited,
        getDollarPrice,
        bandwidth,
        // anglePointSeries,
    ]);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleKeyDown = function (event: any) {
            const isCtrlPressed = event.ctrlKey || event.metaKey;
            if (isCtrlPressed && event.key === 'z') {
                undo();
                setSelectedDrawnShape(undefined);
            } else if (isCtrlPressed && event.key === 'y') {
                redo();
                setSelectedDrawnShape(undefined);
            }
            if (event.key === 'Escape') {
                setSelectedDrawnShape(undefined);
                setActiveDrawingType('Cross');
            }

            if (
                isCtrlPressed &&
                (activeDrawingType !== 'Cross' || isDragActive)
            ) {
                isMagnetActive.value = !isMagnetActiveLocal;
            }
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleKeyUp = function (event: any) {
            if (
                (event.key === 'Control' || event.key === 'Meta') &&
                (activeDrawingType !== 'Cross' || isDragActive)
            ) {
                isMagnetActive.value = isMagnetActiveLocal;
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [
        undo,
        redo,
        drawActionStack,
        undoStack,
        activeDrawingType,
        isDragActive,
        isMagnetActiveLocal,
    ]);
    useEffect(() => {
        const visibilitychange = function () {
            render();
        };

        document.addEventListener('visibilitychange', visibilitychange);

        return () => {
            document.removeEventListener('visibilitychange', visibilitychange);
        };
    }, []);

    useEffect(() => {
        const canvas = d3
            .select(d3CanvasMarketLine.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

        if (marketLine) {
            d3.select(d3CanvasMarketLine.current)
                .on('draw', () => {
                    setCanvasResolution(canvas);
                    ctx.setLineDash([5, 3]);
                    marketLine([chartPoolPrice]);
                })
                .on('measure', (event: CustomEvent) => {
                    scaleData?.xScale.range([0, event.detail.width]);
                    scaleData?.drawingLinearxScale.range([
                        0,
                        event.detail.width,
                    ]);
                    scaleData?.yScale.range([event.detail.height, 0]);
                    ctx.setLineDash([5, 3]);
                    marketLine.context(ctx);
                });
        }
        renderCanvasArray([d3CanvasMarketLine]);
    }, [chartPoolPrice, marketLine]);

    useEffect(() => {
        if (currentPoolPriceTick === undefined) return;
        const noGoZoneBoundaries = noGoZone(
            currentPoolPriceTick,
            baseTokenDecimals,
            quoteTokenDecimals,
            gridSize,
        );
        setNoGoZoneBoundaries(() => {
            return noGoZoneBoundaries;
        });
    }, [
        currentPoolPriceTick,
        baseTokenDecimals,
        quoteTokenDecimals,
        gridSize,
        isDenomBase,
    ]);

    const noGoZone = (
        poolPriceTick: number,
        baseTokenDecimals: number,
        quoteTokenDecimals: number,
        gridSize: number,
    ) => {
        const lowTickNoGoZone =
            pinTickToTickLower(poolPriceTick, gridSize) - gridSize;
        const highTickNoGoZone =
            pinTickToTickUpper(poolPriceTick, gridSize) + gridSize;
        const lowTickNonDisplayPrice = tickToPrice(lowTickNoGoZone);
        const highTickNonDisplayPrice = tickToPrice(highTickNoGoZone);
        const lowTickDisplayPrice = isDenomBase
            ? toDisplayPrice(
                  highTickNonDisplayPrice,
                  baseTokenDecimals,
                  quoteTokenDecimals,
                  isDenomBase,
              )
            : toDisplayPrice(
                  lowTickNonDisplayPrice,
                  baseTokenDecimals,
                  quoteTokenDecimals,
                  isDenomBase,
              );
        const highTickDisplayPrice = isDenomBase
            ? toDisplayPrice(
                  lowTickNonDisplayPrice,
                  baseTokenDecimals,
                  quoteTokenDecimals,
                  isDenomBase,
              )
            : toDisplayPrice(
                  highTickNonDisplayPrice,
                  baseTokenDecimals,
                  quoteTokenDecimals,
                  isDenomBase,
              );

        setLimitTickNearNoGoZone(lowTickDisplayPrice, highTickDisplayPrice);
        return [lowTickDisplayPrice, highTickDisplayPrice];
    };

    const getYAxisBoundary = (isTriggeredByZoom: boolean) => {
        let minYBoundary = undefined;
        let maxYBoundary = undefined;
        if (scaleData) {
            if (
                unparsedCandleData !== undefined &&
                !isTriggeredByZoom &&
                poolPriceWithoutDenom
            ) {
                const placeHolderPrice = denomInBase
                    ? 1 / poolPriceWithoutDenom
                    : poolPriceWithoutDenom;

                const filteredMin = d3.min(visibleCandleData, (d) =>
                    denomInBase
                        ? d.invMaxPriceExclMEVDecimalCorrected
                        : d.minPriceExclMEVDecimalCorrected,
                );

                const filteredMax = d3.max(visibleCandleData, (d) =>
                    denomInBase
                        ? d.invMinPriceExclMEVDecimalCorrected
                        : d.maxPriceExclMEVDecimalCorrected,
                );

                if (filteredMin && filteredMax) {
                    minYBoundary = Math.min(placeHolderPrice, filteredMin);
                    maxYBoundary = Math.max(placeHolderPrice, filteredMax);
                }
            }
        }

        return { minYBoundary: minYBoundary, maxYBoundary: maxYBoundary };
    };

    function changeScaleSwap(isTriggeredByZoom: boolean) {
        if (scaleData && poolPriceWithoutDenom && rescale) {
            const placeHolderPrice = denomInBase
                ? 1 / poolPriceWithoutDenom
                : poolPriceWithoutDenom;

            const { minYBoundary, maxYBoundary } =
                getYAxisBoundary(isTriggeredByZoom);

            if (maxYBoundary !== undefined && minYBoundary !== undefined) {
                const diffBoundary = Math.abs(maxYBoundary - minYBoundary);
                const buffer = diffBoundary
                    ? diffBoundary / 6
                    : minYBoundary / 2;
                const domain = [
                    Math.min(minYBoundary, maxYBoundary, placeHolderPrice) -
                        buffer,
                    Math.max(minYBoundary, maxYBoundary, placeHolderPrice) +
                        buffer / 2,
                ];

                setYaxisDomain(domain[0], domain[1]);
            }
        }

        render();
    }

    function changeScaleLimit(isTriggeredByZoom: boolean) {
        if (scaleData && chartPoolPrice && rescale) {
            const { minYBoundary, maxYBoundary } =
                getYAxisBoundary(isTriggeredByZoom);

            if (maxYBoundary !== undefined && minYBoundary !== undefined) {
                const value = limit;
                const low = Math.min(
                    minYBoundary,
                    value,
                    minTickForLimit,
                    chartPoolPrice,
                );

                const high = Math.max(
                    maxYBoundary,
                    value,
                    maxTickForLimit,
                    chartPoolPrice,
                );

                const bufferForLimit = Math.abs((low - high) / 6);
                if (value > 0 && Math.abs(value) !== Infinity) {
                    const domain = [
                        Math.min(low, high) - bufferForLimit,
                        Math.max(low, high) + bufferForLimit / 2,
                    ];

                    setYaxisDomain(domain[0], domain[1]);
                }
            }
        }

        render();
    }

    function changeScaleRangeOrReposition(isTriggeredByZoom: boolean) {
        if (scaleData && rescale && currentPoolPriceTick !== undefined) {
            const min = minPrice;
            const max = maxPrice;

            if (!chartPoolPrice) {
                scaleData.yScale.domain(
                    scaleData.priceRange(visibleCandleData),
                );
            }

            const { minYBoundary, maxYBoundary } =
                getYAxisBoundary(isTriggeredByZoom);

            if (
                maxYBoundary !== undefined &&
                chartPoolPrice &&
                minYBoundary !== undefined
            ) {
                if (simpleRangeWidth !== 100 || advancedMode) {
                    if (minPrice && maxPrice) {
                        ranges[0] = { name: 'Min', value: minPrice };
                        ranges[1] = { name: 'Max', value: maxPrice };

                        const low = Math.min(
                            min,
                            max,
                            minYBoundary,
                            chartPoolPrice,
                        );

                        const high = Math.max(
                            min,
                            max,
                            maxYBoundary,
                            chartPoolPrice,
                        );

                        const bufferForRange = Math.abs((low - high) / 6);

                        const domain = [
                            Math.min(low, high) - bufferForRange,
                            Math.max(low, high) + bufferForRange / 2,
                        ];

                        setYaxisDomain(domain[0], domain[1]);
                    } else {
                        changeScaleSwap(isTriggeredByZoom);
                    }
                } else {
                    const lowTick =
                        currentPoolPriceTick - simpleRangeWidth * 100;
                    const highTick =
                        currentPoolPriceTick + simpleRangeWidth * 100;

                    const pinnedDisplayPrices = getPinnedPriceValuesFromTicks(
                        isDenomBase,
                        baseTokenDecimals,
                        quoteTokenDecimals,
                        lowTick,
                        highTick,
                        gridSize,
                    );

                    const low = 0;
                    const high = parseFloat(
                        pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
                    );

                    const bufferForRange = Math.abs((low - high) / 90);

                    const domain = [
                        Math.min(low, high) - bufferForRange,
                        Math.max(low, high) + bufferForRange / 2,
                    ];

                    setYaxisDomain(domain[0], domain[1]);
                }
            }
        }

        render();
    }

    function changeScale(isTriggeredByZoom: boolean) {
        if (location.pathname.includes('limit')) {
            changeScaleLimit(isTriggeredByZoom);
        } else if (
            location.pathname.includes('pool') ||
            location.pathname.includes('reposition')
        ) {
            changeScaleRangeOrReposition(isTriggeredByZoom);
        } else {
            changeScaleSwap(isTriggeredByZoom);
        }
    }

    useEffect(() => {
        if (
            rescale &&
            !isLineDrag &&
            prevPeriod === period &&
            candleTimeInSeconds === period
        ) {
            changeScale(false);
        }
    }, [
        period,
        diffHashSigChart(visibleCandleData),
        prevPeriod === period,
        candleTimeInSeconds === period,
        denomInBase,
    ]);

    useEffect(() => {
        if (location.pathname.includes('/market')) {
            changeScaleSwap(false);
        }
    }, [isDenomBase, poolPriceWithoutDenom, location.pathname]);

    // autoScaleF
    useEffect(() => {
        if (!isLineDrag) {
            if (
                location.pathname.includes('pool') ||
                location.pathname.includes('reposition')
            ) {
                changeScaleRangeOrReposition(false);
            }
        }
    }, [
        location.pathname.includes('pool') ||
            location.pathname.includes('reposition'),
        chartPoolPrice,
        isLineDrag,
        minPrice,
        maxPrice,
        advancedMode,
        simpleRangeWidth,
    ]);

    useEffect(() => {
        if (!isLineDrag && location.pathname.includes('limit')) {
            changeScaleLimit(false);
        }
    }, [location.pathname.includes('limit'), limit, isLineDrag]);

    function setYaxisDomain(minDomain: number, maxDomain: number) {
        if (scaleData) {
            if (
                minDomain === maxDomain ||
                minDomain === poolPriceDisplay ||
                maxDomain === poolPriceDisplay
            ) {
                const delta = minDomain / 8;
                const tempMinDomain = minDomain - delta;
                const tempMaxDomain = minDomain + delta;

                scaleData.yScale.domain([tempMinDomain, tempMaxDomain]);
            } else {
                scaleData.yScale.domain([minDomain, maxDomain]);
            }
        }
    }

    const mouseLeaveCanvas = () => {
        if (crosshairActive !== 'none') {
            setCrosshairActive('none');
        }
        setXaxisActiveTooltip('');
    };

    // mousemove
    useEffect(() => {
        if (!isChartZoom) {
            d3.select(d3CanvasMain.current).on(
                'mousemove',
                function (event: MouseEvent<HTMLDivElement>) {
                    mousemove(event);
                },
                { passive: true },
            );

            d3.select(d3CanvasMain.current).on(
                'touchmove',
                function (event: MouseEvent<HTMLDivElement>) {
                    mousemove(event);
                },
                { passive: true },
            );
        }
    }, [
        diffHashSigChart(visibleCandleData),
        lastCandleData,
        mainCanvasBoundingClientRect,
        selectedDate,
        bandwidth,
        isChartZoom,
        diffHashSig(drawnShapeHistory),
        isLineDrag,
        period,
        tokenA,
        tokenB,
        showSwap,
        showHistorical,
        isCondensedModeEnabled,
        diffHashSig(filteredTransactionalData),
    ]);

    useEffect(() => {
        if (selectedDrawnShape) {
            setIsShowFloatingToolbar(true);
        }
    }, [selectedDrawnShape]);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handleDocumentClick = (event: any) => {
            setHandleDocumentEvent(event);
            clickOutsideChartHandler(event);

            if (
                d3Container.current &&
                !d3Container.current.contains(event.target) &&
                event.target.id !== 'trade_chart_full_screen_button'
            ) {
                setIsShowFloatingToolbar(false);
            }
            render();
        };

        document.addEventListener('click', handleDocumentClick);

        return () => {
            document.removeEventListener('click', handleDocumentClick);
        };
    }, [chartSettingsRef]);

    // mouseleave
    useEffect(() => {
        d3.select(d3CanvasMain.current).on(
            'mouseleave',
            (event: MouseEvent<HTMLDivElement>) => {
                if (!isChartZoom) {
                    mouseLeaveCanvas();
                    setChartMousemoveEvent(undefined);
                    setMouseLeaveEvent(event);
                }
            },
        );

        d3.select(d3CanvasMain.current).on(
            'touchend',
            (event: MouseEvent<HTMLDivElement>) => {
                if (!isChartZoom) {
                    mouseLeaveCanvas();
                    setChartMousemoveEvent(undefined);
                    setMouseLeaveEvent(event);
                }
            },
        );
    }, [isChartZoom]);

    // mouseenter
    useEffect(() => {
        const mouseEnterCanvas = () => {
            props.setShowTooltip(true);
        };

        d3.select(d3CanvasMain.current).on('mouseenter', () => {
            if (!isChartZoom) {
                mouseEnterCanvas();
            }
        });
    }, [isChartZoom]);

    /**
     * This useEffect block handles various interactions with the chart canvas based on user actions and context.
     * It includes logic for handling clicks on the canvas, mouseleave events, and chart rendering.
     */
    useEffect(() => {
        if (scaleData !== undefined) {
            // Define the 'onClickCanvas' event handler for canvas clicks
            const onClickCanvas = (event: PointerEvent) => {
                // If the candle or volume click
                const offsetX = event.offsetX;
                const offsetY = event.offsetY;

                if (event.pointerType !== 'touch') {
                    if (shouldDisableChartSettings) {
                        setContextmenu(false);
                    } else {
                        setCloseOutherChartSetting(true);
                    }
                }

                let isOrderHistorySelected = undefined;
                if (showSwap || showHistorical || showLiquidity) {
                    isOrderHistorySelected = orderHistoryHoverStatus(
                        event.offsetX,
                        event.offsetY,
                        true,
                    );
                }

                if (
                    isOrderHistorySelected === undefined ||
                    isOrderHistorySelected.order === undefined
                ) {
                    const { isHoverCandleOrVolumeData, nearest } =
                        candleOrVolumeDataHoverStatus(offsetX, offsetY);

                    selectedDateEvent(isHoverCandleOrVolumeData, nearest);

                    if (selectedDrawnShape) {
                        setSelectedDrawnShape(undefined);
                    }
                    if (hoveredDrawnShape) {
                        setHoveredDrawnShape(undefined);
                    }
                    // Check if the location pathname includes 'pool' or 'reposition' and handle the click event.

                    if (
                        (location.pathname.includes('pool') ||
                            location.pathname.includes('reposition')) &&
                        scaleData !== undefined &&
                        !isHoverCandleOrVolumeData
                    ) {
                        onClickRange(event);
                    }

                    // Check if the location pathname includes '/limit' and handle the click event.
                    if (
                        location.pathname.includes('/limit') &&
                        scaleData !== undefined &&
                        !isHoverCandleOrVolumeData
                    ) {
                        let newLimitValue = scaleData?.yScale.invert(
                            event.offsetY,
                        );

                        if (newLimitValue < 0) newLimitValue = 0;

                        const { noGoZoneMin, noGoZoneMax } = getNoZoneData();

                        if (
                            !(
                                newLimitValue > noGoZoneMin &&
                                newLimitValue < noGoZoneMax
                            )
                        ) {
                            onBlurLimitRate(limit, newLimitValue);
                        }
                    }

                    setSelectedOrderTooltipPlacement(() => undefined);
                }
            };

            d3.select(d3CanvasMain.current).on(
                'click',
                (event: PointerEvent) => {
                    onClickCanvas(event);
                },
            );

            d3.select(d3CanvasMain.current).on(
                'contextmenu',
                (event: PointerEvent) => {
                    if (mobileView) {
                        event.preventDefault();
                        setSelectedDrawnShape(undefined);
                        setIsShowFloatingToolbar(false);
                        // openMobileSettingsModal();
                    } else {
                        if (!event.shiftKey) {
                            event.preventDefault();

                            const screenHeight = window.innerHeight;

                            const diff = screenHeight - event.clientY;

                            setContextMenuPlacement({
                                top: event.clientY,
                                left: event.clientX,
                                isReversed: diff < 350,
                            });

                            setContextmenu(true);
                        } else {
                            setContextmenu(false);
                        }
                    }
                },
            );

            d3.select(d3Container.current).on(
                'mouseleave',
                (event: MouseEvent<HTMLDivElement>) => {
                    if (!isChartZoom) {
                        setCrosshairActive('none');
                        setMouseLeaveEvent(event);
                        setChartMousemoveEvent(undefined);
                        if (lastCandleData) {
                            setsubChartValues((prevState: SubChartValue[]) => {
                                const newData = [...prevState];

                                newData.filter(
                                    (target: SubChartValue) =>
                                        target.name === 'tvl',
                                )[0].value = lastCandleData
                                    ? lastCandleData.tvlData.tvl
                                    : undefined;

                                newData.filter(
                                    (target: SubChartValue) =>
                                        target.name === 'feeRate',
                                )[0].value = lastCandleData
                                    ? lastCandleData.averageLiquidityFee
                                    : undefined;
                                return newData;
                            });
                        }

                        if (selectedDate === undefined) {
                            props.setShowTooltip(false);
                        }
                    }
                },
            );
        }
    }, [
        denomInBase,
        selectedDate,
        isSidebarOpen,
        liqMode,
        location.pathname,
        isChartZoom,
        limit,
        ranges,
        liquidityScale,
        liquidityDepthScale,
        isLineDrag,
        lastCandleData,
        advancedMode,
        showVolume,
        xAxisActiveTooltip,
        timeOfEndCandle,
        bandwidth,
        liquidityData,
        hoveredDrawnShape,
        isSelectedOrderHistory,
        selectedOrderHistory,
        showSwap,
        showHistorical,
        showLiquidity,
    ]);

    function checkLineLocation(
        element: lineData[],
        mouseX: number,
        mouseY: number,
        denomInBase: boolean,
    ) {
        const startX = element[0].x;
        const startY =
            element[0].denomInBase === denomInBase
                ? element[0].y
                : 1 / element[0].y;
        const endX = element[1].x;
        const endY =
            element[1].denomInBase === denomInBase
                ? element[1].y
                : 1 / element[1].y;

        if (scaleData) {
            const threshold = 10;
            const distance = distanceToLine(
                mouseX,
                mouseY,
                scaleData.drawingLinearxScale(startX),
                scaleData.yScale(startY),
                scaleData.drawingLinearxScale(endX),
                scaleData.yScale(endY),
            );

            return distance < threshold;
        }

        return false;
    }

    function checkRectLocation(
        element: lineData[],
        mouseX: number,
        mouseY: number,
        isDenomPrices: boolean,
    ) {
        let isOverLine = false;

        if (scaleData) {
            const threshold = 10;

            const denomStartY =
                element[0].denomInBase === denomInBase || isDenomPrices
                    ? element[0].y
                    : 1 / element[0].y;
            const denomEndY =
                element[0].denomInBase === denomInBase || isDenomPrices
                    ? element[1].y
                    : 1 / element[1].y;

            const startY = Math.min(denomStartY, denomEndY);
            const endY = Math.max(denomStartY, denomEndY);

            const startX = Math.min(element[0].x, element[1].x);
            const endX = Math.max(element[0].x, element[1].x);

            if (
                mouseX > scaleData.drawingLinearxScale(startX) - threshold &&
                mouseX < scaleData.drawingLinearxScale(endX) + threshold &&
                mouseY < scaleData.yScale(startY) + threshold &&
                mouseY > scaleData.yScale(endY) - threshold
            ) {
                isOverLine = true;
            }
        }

        return isOverLine;
    }

    function checkRayLineLocation(
        element: lineData[],
        mouseX: number,
        mouseY: number,
        denomInBase: boolean,
    ) {
        if (scaleData) {
            const startX = element[0].x;
            const startY =
                element[0].denomInBase === denomInBase
                    ? element[0].y
                    : 1 / element[0].y;
            const endX = scaleData.drawingLinearxScale.domain()[1];
            const endY =
                element[0].denomInBase === denomInBase
                    ? element[0].y
                    : 1 / element[0].y;

            const threshold = 10;
            const distance = distanceToLine(
                mouseX,
                mouseY,
                scaleData.drawingLinearxScale(startX),
                scaleData.yScale(startY),
                scaleData.drawingLinearxScale(endX),
                scaleData.yScale(endY),
            );

            return distance < threshold;
        }

        return false;
    }

    function checkSwapLoation(
        element: lineData[],
        mouseX: number,
        mouseY: number,
        diameter: number,
        isTriangle = false,
    ) {
        if (scaleData && circleScale) {
            const startX = scaleData.xScale(element[0].x);
            const startY = scaleData.yScale(element[0].y);

            const circleDiameter = Math.sqrt(
                (isTriangle ? 1000 : circleScale(diameter)) / Math.PI,
            );

            let distance = false;

            if (
                startX < mouseX + circleDiameter &&
                startY < mouseY + circleDiameter &&
                startX > mouseX - circleDiameter &&
                startY > mouseY - circleDiameter
            ) {
                distance = true;
            }

            return distance;
        }

        return false;
    }

    function checkFibonacciLocation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extraData: any,
        mouseX: number,
        mouseY: number,
        denomInBase: boolean,
        extendLeft: boolean,
        extendRight: boolean,
    ) {
        if (scaleData) {
            const fibLineData = calculateFibRetracement(
                data,
                extraData,
                denomInBase,
            );

            const startX = extendLeft
                ? scaleData.drawingLinearxScale.domain()[0]
                : fibLineData[0][0].x;
            const endX = extendRight
                ? scaleData.drawingLinearxScale.domain()[1]
                : fibLineData[0][1].x;
            const tempStartXLocation = scaleData.drawingLinearxScale(startX);
            const tempEndXLocation = scaleData.drawingLinearxScale(endX);

            const threshold = 10;

            const startXLocation = Math.min(
                tempStartXLocation,
                tempEndXLocation,
            );
            const endXLocation = Math.max(tempStartXLocation, tempEndXLocation);

            let startY = Number.MAX_VALUE;
            let endY = Number.MIN_VALUE;

            for (const items of fibLineData) {
                for (const item of items) {
                    startY = Math.min(startY, item.y);
                    endY = Math.max(endY, item.y);
                }
            }

            startY = data[0].denomInBase === denomInBase ? startY : 1 / startY;
            endY = data[0].denomInBase === denomInBase ? endY : 1 / endY;

            const tempStartYLocation = scaleData.yScale(startY);
            const tempEndYLocation = scaleData.yScale(endY);

            const startYLocation = Math.min(
                tempStartYLocation,
                tempEndYLocation,
            );
            const endYLocation = Math.max(tempStartYLocation, tempEndYLocation);

            const isIncludeX =
                startXLocation - threshold < mouseX &&
                mouseX < endXLocation + threshold;

            const isIncludeY =
                startYLocation - threshold < mouseY &&
                mouseY < endYLocation + threshold;

            return isIncludeX && isIncludeY;
        }
    }

    const drawnShapesHoverStatus = (mouseX: number, mouseY: number) => {
        let resElement = undefined;

        drawnShapeHistory.forEach((element) => {
            const isShapeInCurrentPool =
                tokenA.address ===
                    (isTokenABase === element.pool.isTokenABase
                        ? element.pool.tokenA
                        : element.pool.tokenB) &&
                tokenB.address ===
                    (isTokenABase === element.pool.isTokenABase
                        ? element.pool.tokenB
                        : element.pool.tokenA);

            if (isShapeInCurrentPool) {
                if (element.type === 'FibRetracement') {
                    const data = structuredClone(element.data);

                    if (element.reverse) {
                        [data[0], data[1]] = [data[1], data[0]];
                    }

                    if (
                        checkFibonacciLocation(
                            data,
                            element.extraData,
                            mouseX,
                            mouseY,
                            denomInBase,
                            element.extendLeft,
                            element.extendRight,
                        )
                    ) {
                        resElement = element;
                    }
                }

                if (element.type === 'Brush' || element.type === 'Angle') {
                    const lineData: Array<lineData[]> = [];
                    lineData.push(element.data);

                    lineData.forEach((line) => {
                        if (
                            checkLineLocation(line, mouseX, mouseY, denomInBase)
                        ) {
                            resElement = element;
                        }
                    });
                }

                if (element.type === 'Rect' || element.type === 'DPRange') {
                    if (element.type === 'DPRange' && scaleData) {
                        const endY =
                            element.data[1].denomInBase === denomInBase
                                ? element.data[1].y
                                : 1 / element.data[1].y;
                        const startY =
                            element.data[0].denomInBase === denomInBase
                                ? element.data[0].y
                                : 1 / element.data[0].y;

                        const dpRangeTooltipData: lineData[] = [
                            {
                                x: scaleData.drawingLinearxScale.invert(
                                    scaleData.drawingLinearxScale(
                                        Math.min(
                                            element.data[0].x,
                                            element.data[1].x,
                                        ) +
                                            Math.abs(
                                                element.data[0].x -
                                                    element.data[1].x,
                                            ) /
                                                2,
                                    ) - 90,
                                ),
                                y: scaleData.yScale.invert(
                                    scaleData.yScale(endY) +
                                        (endY > startY ? -15 : 15),
                                ),
                                denomInBase: element.data[0].denomInBase,
                            },
                            {
                                x: scaleData.drawingLinearxScale.invert(
                                    scaleData.drawingLinearxScale(
                                        Math.min(
                                            element.data[0].x,
                                            element.data[1].x,
                                        ) +
                                            Math.abs(
                                                element.data[0].x -
                                                    element.data[1].x,
                                            ) /
                                                2,
                                    ) + 90,
                                ),
                                y: scaleData.yScale.invert(
                                    scaleData.yScale(endY) +
                                        (endY > startY ? -80 : 80),
                                ),
                                denomInBase: element.data[1].denomInBase,
                            },
                        ];

                        if (
                            checkRectLocation(
                                dpRangeTooltipData,
                                mouseX,
                                mouseY,
                                true,
                            )
                        ) {
                            resElement = element;
                        }
                    }
                    if (
                        checkRectLocation(element.data, mouseX, mouseY, false)
                    ) {
                        resElement = element;
                    }
                }

                if (element.type === 'Ray') {
                    if (
                        checkRayLineLocation(
                            element.data,
                            mouseX,
                            mouseY,
                            denomInBase,
                        )
                    ) {
                        resElement = element;
                    }
                }
            }
        });

        if (resElement && scaleData) {
            const selectedCircle = checkCircleLocation(
                resElement,
                mouseX,
                mouseY,
                scaleData,
                denomInBase,
            );

            setHoveredDrawnShape({
                data: resElement,
                selectedCircle: selectedCircle,
            });

            setIsDragActive(true);
        } else {
            setIsDragActive(false);
            setHoveredDrawnShape(undefined);
        }
    };

    useEffect(() => {
        if (userTransactionData) {
            const domainRight = d3.max(
                userTransactionData.filter(
                    (transaction) =>
                        (transaction.entityType === 'limitOrder' ||
                            transaction.entityType === 'swap') &&
                        transaction.totalValueUSD > 0,
                ),
                (data) => data.totalValueUSD,
            );

            const domainLeft = d3.min(
                userTransactionData.filter(
                    (transaction) =>
                        (transaction.entityType === 'limitOrder' ||
                            transaction.entityType === 'swap') &&
                        transaction.totalValueUSD > 0,
                ),
                (data) => data.totalValueUSD,
            );

            const swapData = userTransactionData.filter(
                (transaction) =>
                    (transaction.entityType === 'limitOrder' ||
                        transaction.entityType === 'swap') &&
                    transaction.totalValueUSD > 0,
            );

            if (domainRight && domainLeft) {
                const scale = d3
                    .scaleLinear()
                    .range([750, 3000])
                    .domain([
                        swapData.length > 3 ? domainLeft : 0,
                        domainRight,
                    ]);

                setCircleScale(() => {
                    return scale;
                });
            }
        }
    }, [userTransactionData, denomInBase]);

    const handleCardClick = (id: string, type: string): void => {
        setSelectedDate(undefined);
        setOutsideControl(true);
        setShowAllData(false);

        if (type === 'historicalLiq') {
            setCurrentPositionActive(id);
            setSelectedOutsideTab(2);
        } else if (type === 'limitSwapLine') {
            setCurrentLimitOrderActive(id);
            setSelectedOutsideTab(1);
        } else if (['claimableLimit', 'swap'].includes(type)) {
            setCurrentTxActiveInTransactions(id);
            setSelectedOutsideTab(0);
        }
    };

    useEffect(() => {
        if (!hoverOHTooltip) {
            setHoveredOrderHistory(undefined);
            setIsHoveredOrderHistory(false);
        }
    }, [hoverOHTooltip]);

    const orderHistoryHoverStatus = (
        mouseX: number,
        mouseY: number,
        onClick: boolean,
    ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let resElement: any = undefined;

        if (scaleData) {
            if (userPositionsByPool) {
                userPositionsByPool.positions.forEach((position) => {
                    if (
                        (position.positionLiq === 0 && showHistorical) ||
                        (position.positionLiq > 0 && showLiquidity)
                    ) {
                        const rectLocation = [
                            {
                                x: position?.timeFirstMint * 1000,
                                y: denomInBase
                                    ? position.bidTickInvPriceDecimalCorrected
                                    : position.bidTickPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                            {
                                x:
                                    position.positionLiq > 0
                                        ? new Date().getTime() +
                                          5 * 86400 * 1000
                                        : position?.latestUpdateTime * 1000,
                                y: denomInBase
                                    ? position.askTickInvPriceDecimalCorrected
                                    : position.askTickPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                        ];

                        if (
                            checkRectLocation(
                                rectLocation,
                                mouseX,
                                mouseY,
                                denomInBase,
                            )
                        ) {
                            resElement = {
                                id: position.positionId,
                                type:
                                    position.positionLiq === 0
                                        ? 'historical'
                                        : 'historicalLiq',
                                order: position,
                                totalValueUSD: position.totalValueUSD,
                                tokenFlowDecimalCorrected: 0,
                                mergedIds: [
                                    {
                                        hash: position.positionId,
                                        type: 'historical',
                                    },
                                ],
                            };
                        }
                    }
                });
            }

            if (userLimitOrdersByPool && showLiquidity && userTransactionData) {
                const userLimitOrderHistory = userTransactionData.filter(
                    (transaction) =>
                        transaction.entityType === 'limitOrder' &&
                        transaction.changeType === 'mint',
                );

                const processLimitOrder = (entity: LimitOrderIF) => {
                    const mintedInTick = userLimitOrderHistory.filter(
                        (his) =>
                            his.isBuy === entity.isBid &&
                            his.bidTick === entity.bidTick &&
                            his.askTick === entity.askTick,
                    );

                    if (mintedInTick?.length > 0) {
                        return mintedInTick;
                    }
                };

                userLimitOrdersByPool.limitOrders.forEach((limitOrder) => {
                    if (limitOrder.claimableLiq === 0) {
                        const mergedIds: Array<{ hash: string; type: string }> =
                            [];

                        const mintedInTick = processLimitOrder(limitOrder);

                        mintedInTick?.forEach((mint) => {
                            const isIn = mergedIds.find(
                                (id) => id.hash === mint.txHash,
                            );

                            if (isIn === undefined) {
                                mergedIds.push({
                                    hash: mint.txHash,
                                    type: mint.entityType,
                                });
                            }
                        });

                        const tokenFlowDecimalCorrected = limitOrder.isBid
                            ? denomInBase
                                ? limitOrder.originalPositionLiqBaseDecimalCorrected
                                : limitOrder.expectedPositionLiqQuoteDecimalCorrected
                            : denomInBase
                              ? limitOrder.expectedPositionLiqBaseDecimalCorrected
                              : limitOrder.originalPositionLiqQuoteDecimalCorrected;

                        const swapOrderData = [
                            {
                                x: limitOrder.timeFirstMint * 1000,
                                y: denomInBase
                                    ? limitOrder.invLimitPriceDecimalCorrected
                                    : limitOrder.limitPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                        ];

                        if (
                            checkSwapLoation(
                                swapOrderData,
                                mouseX,
                                mouseY,
                                limitOrder.totalValueUSD,
                                true,
                            )
                        ) {
                            resElement = {
                                id: limitOrder.limitOrderId,
                                type: 'limitSwapLine',
                                order: limitOrder,
                                totalValueUSD: limitOrder.totalValueUSD,
                                tokenFlowDecimalCorrected:
                                    tokenFlowDecimalCorrected,
                                mergedIds: mergedIds,
                            };
                        }

                        const line = [
                            ...swapOrderData,
                            {
                                x: new Date().getTime() + 5 * 86400 * 1000,
                                y: denomInBase
                                    ? limitOrder.invLimitPriceDecimalCorrected
                                    : limitOrder.limitPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                        ];

                        if (
                            checkLineLocation(line, mouseX, mouseY, denomInBase)
                        ) {
                            resElement = {
                                id: limitOrder.limitOrderId,
                                type: 'limitSwapLine',
                                order: limitOrder,
                                totalValueUSD: limitOrder.totalValueUSD,
                                tokenFlowDecimalCorrected:
                                    tokenFlowDecimalCorrected,
                                mergedIds: mergedIds,
                            };
                        }
                    }
                });
            }

            if (filteredTransactionalData && showSwap && userTransactionData) {
                filteredTransactionalData.forEach((element) => {
                    if (showSwap) {
                        const swapOrderData = [
                            {
                                x: element.order.txTime * 1000,
                                y: denomInBase
                                    ? element.order.swapInvPriceDecimalCorrected
                                    : element.order.swapPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                        ];

                        if (
                            checkSwapLoation(
                                swapOrderData,
                                mouseX,
                                mouseY,
                                element.totalValueUSD,
                            )
                        ) {
                            resElement = {
                                id: element.order.txId,
                                type: element.order.entityType,
                                order: element,
                                totalValueUSD: element.totalValueUSD,
                                tokenFlowDecimalCorrected:
                                    element.tokenFlowDecimalCorrected,
                                mergedIds: element.mergedIds,
                            };
                        }
                    }
                });
            }

            if (filteredLimitTxData && userTransactionData && showSwap) {
                filteredLimitTxData.forEach((element) => {
                    const swapOrderData = [
                        {
                            x: element.order.crossTime * 1000,
                            y: denomInBase
                                ? element.order.invLimitPriceDecimalCorrected
                                : element.order.limitPriceDecimalCorrected,
                            denomInBase: denomInBase,
                        },
                    ];

                    if (
                        checkSwapLoation(
                            swapOrderData,
                            mouseX,
                            mouseY,
                            element.totalValueUSD,
                        )
                    ) {
                        resElement = {
                            id: element.order.limitOrderId,
                            type: 'claimableLimit',
                            order: element,
                            totalValueUSD: element.totalValueUSD,
                            tokenFlowDecimalCorrected:
                                element.tokenFlowDecimalCorrected,
                            mergedIds: element.mergedIds,
                        };
                    }
                });
            }

            if (resElement && scaleData) {
                setHoveredOrderHistory(() => {
                    return resElement;
                });
                setIsHoveredOrderHistory(true);
                setHoverOHTooltip(true);
            } else {
                setHoveredOrderTooltipPlacement(() => undefined);
                setHoveredOrderHistory(() => undefined);
                setIsHoveredOrderHistory(false);
                setHoverOHTooltip(false);
            }

            if (onClick && scaleData) {
                if (resElement) {
                    const shouldSelect = selectedOrderHistory
                        ? resElement.id !== selectedOrderHistory?.id
                        : true;

                    shouldSelect &&
                        handleCardClick(resElement.id, resElement.type);

                    setSelectedOrderHistory(() => {
                        return shouldSelect ? resElement : undefined;
                    });

                    setIsSelectedOrderHistory(() => {
                        !shouldSelect && setCurrentTxActiveInTransactions('');
                        return shouldSelect;
                    });
                } else {
                    setCurrentTxActiveInTransactions('');
                    setSelectedOrderHistory(undefined);
                    setIsSelectedOrderHistory(false);
                }
            }

            return { order: resElement, isClicked: onClick };
        }
        return undefined;
    };

    const candleOrVolumeDataHoverStatus = (mouseX: number, mouseY: number) => {
        const lastDate = scaleData?.xScale.invert(
            mouseX + bandwidth / 2,
        ) as number;
        const startDate = scaleData?.xScale.invert(
            mouseX - bandwidth / 2,
        ) as number;

        let avaregeHeight = 1;
        const filtered: Array<CandleDataIF> = [];
        let longestValue = 0;

        const xmin = scaleData?.xScale.domain()[0] as number;
        const xmax = scaleData?.xScale.domain()[1] as number;

        visibleCandleData.map((d: CandleDataChart) => {
            avaregeHeight =
                avaregeHeight +
                Math.abs(
                    (denomInBase
                        ? d.invPriceCloseExclMEVDecimalCorrected
                        : d.priceCloseExclMEVDecimalCorrected) -
                        (denomInBase
                            ? d.invPriceOpenExclMEVDecimalCorrected
                            : d.priceOpenExclMEVDecimalCorrected),
                );

            if (d.time * 1000 >= xmin && d.time * 1000 <= xmax) {
                if (d.volumeUSD > longestValue) {
                    longestValue = d.volumeUSD;
                }

                (d.isShowData || !isCondensedModeEnabled) && filtered.push(d);
            }
        });

        const minHeight = avaregeHeight / visibleCandleData.length;

        longestValue = longestValue / 2;

        const nearest = snapForCandle(mouseX, filtered);

        const dateControl =
            nearest?.time * 1000 > startDate && nearest?.time * 1000 < lastDate;

        const tempFilterData = filtered.filter(
            (item) => item.time === nearest?.time,
        );

        const yValue = scaleData?.yScale.invert(mouseY) as number;
        const selectedVolumeDataValue = nearest?.volumeUSD;
        const volumeHeight = mainCanvasBoundingClientRect
            ? mainCanvasBoundingClientRect.height / 10
            : 0;

        const isSelectedVolume =
            selectedVolumeDataValue &&
            showVolume &&
            mainCanvasBoundingClientRect
                ? mainCanvasBoundingClientRect.height -
                      mouseY -
                      volumeHeight * 0.5 <=
                  volumeHeight
                    ? true
                    : false
                : false;

        let close = denomInBase
            ? nearest?.invMinPriceExclMEVDecimalCorrected
            : nearest?.minPriceExclMEVDecimalCorrected;

        let open = denomInBase
            ? nearest?.invMaxPriceExclMEVDecimalCorrected
            : nearest?.maxPriceExclMEVDecimalCorrected;

        if (tempFilterData.length > 1) {
            close = d3.max(tempFilterData, (d: CandleDataIF) =>
                denomInBase
                    ? d?.invMinPriceExclMEVDecimalCorrected
                    : d?.minPriceExclMEVDecimalCorrected,
            ) as number;

            open = d3.min(tempFilterData, (d: CandleDataIF) =>
                denomInBase
                    ? d?.invMaxPriceExclMEVDecimalCorrected
                    : d?.maxPriceExclMEVDecimalCorrected,
            ) as number;
        }

        const diff = Math.abs(close - open);
        const domainMin = scaleData?.yScale.domain()[0] as number;
        const domainMax = scaleData?.yScale.domain()[1] as number;
        const scale = Math.abs(domainMax - domainMin);

        const topBoundary =
            close > open
                ? close + (minHeight - diff) / 2
                : open + (minHeight - diff) / 2;
        const botBoundary =
            open < close
                ? open - (minHeight - diff) / 2
                : close - (minHeight - diff) / 2;

        let limitTop;
        let limitBot;

        if (scale / 20 > diff) {
            if (close > open) {
                limitTop = close + scale / 20;
                limitBot = open - scale / 20;
            } else {
                limitTop = open + scale / 20;
                limitBot = close - scale / 20;
            }
        } else {
            if (close > open) {
                limitTop = close > topBoundary ? close : topBoundary;
                limitBot = open < botBoundary ? open : botBoundary;
            } else {
                limitTop = open > topBoundary ? open : topBoundary;
                limitBot = close < botBoundary ? close : botBoundary;
            }
        }

        setsubChartValues((prevState: SubChartValue[]) => {
            const newData = [...prevState];

            newData.filter(
                (target: SubChartValue) => target.name === 'tvl',
            )[0].value = nearest?.tvlData.tvl;

            newData.filter(
                (target: SubChartValue) => target.name === 'feeRate',
            )[0].value = nearest?.averageLiquidityFee;

            return newData;
        });

        if (selectedDate === undefined) {
            props.setShowTooltip(true);
            props.setCurrentData(nearest);
        }

        const checkYLocation =
            limitTop > limitBot
                ? limitTop > yValue && limitBot < yValue
                : limitTop < yValue && limitBot > yValue;

        /**
         * isHoverCandleOrVolumeData : mouse over candle or volume data
         * nearest : data information closest to the mouse
         */
        return {
            isHoverCandleOrVolumeData:
                nearest &&
                dateControl &&
                nearest.time !== lastCandleData?.time + period &&
                (checkYLocation || isSelectedVolume),
            nearest: nearest,
        };
    };

    const selectedDateEvent = (
        isHoverCandleOrVolumeData: boolean,
        nearest: CandleDataIF | undefined,
    ) => {
        if (isHoverCandleOrVolumeData && nearest) {
            const _selectedDate = nearest?.time * 1000;
            if (selectedDate === undefined || selectedDate !== _selectedDate) {
                setSelectedDate(_selectedDate);
            } else {
                setSelectedDate(undefined);
            }
            render();
        }
    };

    useEffect(() => {
        d3.select(d3CanvasCrosshair.current).style(
            'visibility',
            crosshairActive !== 'none' ? 'visible' : 'hidden',
        );
        renderSubchartCrCanvas();
    }, [crosshairActive]);

    const setCrossHairDataFunc = (
        nearestTime: number,
        offsetX: number,
        offsetY: number,
    ) => {
        if (scaleData) {
            const snapDiff =
                scaleData?.xScale.invert(offsetX) % (period * 1000);

            const snappedTime =
                scaleData?.xScale.invert(offsetX) -
                (snapDiff > period * 1000 - snapDiff
                    ? -1 * (period * 1000 - snapDiff)
                    : snapDiff);

            const crTime =
                snappedTime <= lastCandleData.time * 1000 &&
                snappedTime >= firstCandleData.time * 1000 &&
                nearestTime
                    ? nearestTime * 1000
                    : snappedTime;

            setCrosshairActive('chart');

            setCrosshairData([
                {
                    x: crTime,
                    y: scaleData?.yScale.invert(offsetY),
                },
            ]);

            return crTime;
        }
    };

    const mousemove = (event: MouseEvent<HTMLDivElement>) => {
        if (scaleData && mainCanvasBoundingClientRect) {
            const { offsetX, offsetY } = getXandYLocationForChart(
                event,
                mainCanvasBoundingClientRect,
            );

            if (!isLineDrag) {
                setChartMousemoveEvent(event);
                const { isHoverCandleOrVolumeData, nearest } =
                    candleOrVolumeDataHoverStatus(offsetX, offsetY);

                setCrossHairDataFunc(nearest?.time, offsetX, offsetY);

                let isOrderHistorySelected = undefined;
                if (
                    (showSwap || showHistorical || showLiquidity) &&
                    !isDragActive &&
                    activeDrawingType === 'Cross'
                ) {
                    isOrderHistorySelected = orderHistoryHoverStatus(
                        offsetX,
                        offsetY,
                        false,
                    );
                }

                setIsOnCandleOrVolumeMouseLocation(
                    isOrderHistorySelected !== undefined &&
                        isOrderHistorySelected.order !== undefined
                        ? true
                        : isHoverCandleOrVolumeData,
                );

                drawnShapesHoverStatus(offsetX, offsetY);
            }
        }
    };

    useEffect(() => {
        renderCanvasArray([d3CanvasCrosshair]);
    }, [crosshairData]);

    useEffect(() => {
        if (xAxisTooltip && scaleData) {
            xAxisTooltip.html('<p> 🥚 Beginning of Historical Data </p>');

            xAxisTooltip.style(
                'visibility',
                xAxisActiveTooltip === 'egg' ? 'visible' : 'hidden',
            );

            if (timeOfEndCandle) {
                relocateTooltip(xAxisTooltip, timeOfEndCandle);
            }
        }
    }, [
        xAxisTooltip,
        xAxisActiveTooltip,
        timeOfEndCandle,
        mainCanvasBoundingClientRect,
        xAxisHeightPixel,
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const relocateTooltip = (tooltip: any, data: number) => {
        if (tooltip && scaleData) {
            const width = tooltip.style('width').split('p')[0] / 2;
            const height = tooltip.style('height').split('p')[0];

            const labelTopPlacement = height > 30 ? 15 : 0;

            const xAxisNode = d3.select(d3XaxisRef.current).node();
            const xAxisTop = xAxisNode?.getBoundingClientRect().top;
            tooltip
                .style(
                    'top',
                    (xAxisTop && mainCanvasBoundingClientRect
                        ? xAxisTop -
                          mainCanvasBoundingClientRect.top -
                          labelTopPlacement
                        : 0) -
                        xAxisHeightPixel +
                        'px',
                )
                .style('left', scaleData.xScale(data) - width / 1.5 + 'px');
        }
    };
    useEffect(() => {
        if (scaleData && scaleData?.xScale) {
            const minYBoundary = d3.min(visibleCandleData, (d) => d.volumeUSD);
            const maxYBoundary = d3.max(visibleCandleData, (d) => d.volumeUSD);
            if (minYBoundary !== undefined && maxYBoundary !== undefined) {
                const domain = [0, maxYBoundary];
                scaleData?.volumeScale.domain(domain);
            }
        }
    }, [
        diffHashSigScaleData(scaleData, 'x'),
        diffHashSigChart(visibleCandleData),
        reset,
        latest,
    ]);

    // Candle transactions
    useEffect(() => {
        if (selectedDate !== undefined) {
            const candle = visibleCandleData.find(
                (candle: CandleDataIF) => candle.time * 1000 === selectedDate,
            );

            if (candle !== undefined) {
                props.changeState(true, candle);
            }
        } else {
            props.changeState(false, undefined);
        }
        render();
    }, [selectedDate, visibleCandleData]);

    const onBlurRange = (
        range: lineValue[],
        highLineMoved: boolean,
        lowLineMoved: boolean,
        isLinesSwitched: boolean,
    ) => {
        if (range !== undefined) {
            const low = range.filter(
                (target: lineValue) => target.name === 'Min',
            )[0].value;
            const high = range.filter(
                (target: lineValue) => target.name === 'Max',
            )[0].value;

            setMinPrice(low > high ? high : low);
            setMaxPrice(low > high ? low : high);

            if (lowLineMoved) {
                setChartTriggeredBy('low_line');
            } else if (highLineMoved) {
                setChartTriggeredBy('high_line');
            }
            setIsLinesSwitched(isLinesSwitched);
        }
    };

    // hook to generate navigation actions with pre-loaded path
    const linkGenLimit: linkGenMethodsIF = useLinkGen('limit');

    /**
     *  This method updates the global limitTick value according to local limit value
     *  and It trigger sell or buy changes if necessary
     * @param limitPreviousData  limit value before the operation started
     * @param newLimitValue  limit value the operation finished
     */
    const onBlurLimitRate = (
        limitPreviousData: number,
        newLimitValue: number,
    ): void => {
        if (newLimitValue === undefined) return;

        const limitNonDisplay = fromDisplayPrice(
            newLimitValue,
            baseTokenDecimals,
            quoteTokenDecimals,
            denomInBase,
        );
        const pinnedTick: number = isTokenABase
            ? pinTickLower(limitNonDisplay, gridSize)
            : pinTickUpper(limitNonDisplay, gridSize);

        setLimitTick(pinnedTick);

        // if user moves limit price to other side of the current price
        // ... then redirect to new URL params (to reverse the token
        // ... pair; else just update the `limitTick` value in the URL
        reverseTokenForChart(limitPreviousData, newLimitValue)
            ? (() => {
                  setIsTokenAPrimary((isTokenAPrimary) => !isTokenAPrimary);
                  linkGenLimit.redirect({
                      chain: chainId,
                      tokenA: tokenB.address,
                      tokenB: tokenA.address,
                      limitTick: pinnedTick,
                  });
              })()
            : updateURL({ update: [['limitTick', pinnedTick]] });

        const tickPrice = tickToPrice(pinnedTick);

        const tickDispPrice = toDisplayPrice(
            tickPrice,
            baseTokenDecimals,
            quoteTokenDecimals,
        );
        if (!tickDispPrice) {
            setLimit(() => {
                return newLimitValue;
            });
        } else {
            const displayPriceWithDenom = denomInBase
                ? 1 / tickDispPrice
                : tickDispPrice;
            newLimitValue = displayPriceWithDenom;
            setLimit(() => {
                return newLimitValue;
            });
        }
    };

    useEffect(() => {
        if (scaleData) {
            const lineSeries = createLinearLineSeries(
                scaleData?.drawingLinearxScale,
                scaleData?.yScale,
                denomInBase,
            );

            setLineSeries(() => lineSeries);

            const annotationLineSeries = createAnnotationLineSeries(
                scaleData?.drawingLinearxScale.copy(),
                scaleData?.yScale,
                denomInBase,
            );

            annotationLineSeries.decorate(
                (context: CanvasRenderingContext2D) => {
                    context.fillStyle = 'transparent';
                },
            );

            setAnnotationLineSeries(() => annotationLineSeries);
        }
    }, [scaleData, denomInBase]);

    const rangeCanvasProps = {
        scaleData: scaleData,
        tokenA: tokenA,
        tokenB: tokenB,
        isDenomBase: isDenomBase,
        rescale: rescale,
        currentPoolPriceTick: currentPoolPriceTick,
        poolPriceDisplay: poolPriceDisplay,
        changeScale: changeScale,
        isTokenABase: isTokenABase,
        chainId: chainId,
        topBoundary: liquidityData?.topBoundary,
        d3Container: d3Container,
        period: period,
        ranges: ranges,
        setRanges: setRanges,
        liqMode: liqMode,
        liqTransitionPointforCurve: liquidityData
            ? liquidityData?.liqTransitionPointforCurve
            : poolPriceDisplay,
        liqTransitionPointforDepth: liquidityData
            ? liquidityData?.liqTransitionPointforDepth
            : poolPriceDisplay,
    };

    const limitCanvasProps = {
        scaleData,
        isDenomBase,
        period,
        isUserConnected,
        setLimit,
        limit,
        poolPriceDisplay,
        sellOrderStyle,
        checkLimitOrder,
        setCheckLimitOrder,
    };

    const yAxisCanvasProps = {
        scaleData,
        chartPoolPrice,
        liqMode,
        liqTransitionPointforCurve: liquidityData
            ? liquidityData?.liqTransitionPointforCurve
            : poolPriceDisplay,
        liqTransitionPointforDepth: liquidityData
            ? liquidityData?.liqTransitionPointforDepth
            : poolPriceDisplay,
        ranges,
        limit,
        isAmbientOrAdvanced: simpleRangeWidth !== 100 || advancedMode,
        checkLimitOrder,
        sellOrderStyle,
        crosshairActive,
        crosshairData,
        reset,
        isLineDrag,
        setRescale,
        render,
        liquidityData,
        dragRange,
        dragLimit,
        setCrosshairActive,
        denomInBase,
        setYaxisWidth,
        yAxisWidth,
        simpleRangeWidth,
        poolPriceDisplay,
        isChartZoom,
        selectedDrawnShape,
        isUpdatingShape,
    };

    const isShapeOverlaps = (
        tempLeft: number,
        tempTop: number,
        selectedLeft: number,
        selectedTop: number,
    ) => {
        const isOverLeft =
            isSelectedOrderHistory &&
            selectedOrderTooltipPlacement &&
            ((tempLeft + 75 <= selectedLeft + 75 &&
                tempLeft + 75 >= selectedLeft - 75) ||
                (tempLeft - 75 <= selectedLeft + 75 &&
                    tempLeft - 75 >= selectedLeft - 75));

        const isOverTop =
            isSelectedOrderHistory &&
            selectedOrderTooltipPlacement &&
            ((selectedTop - 35 <= tempTop + 35 &&
                selectedTop - 35 >= tempTop - 35) ||
                (selectedTop + 35 >= tempTop - 35 &&
                    selectedTop + 35 <= tempTop + 35));

        return { isOverLeft, isOverTop };
    };

    const calculateOrderHistoryTooltipPlacements = (scaleData: scaleData) => {
        if (scaleData) {
            const scale = d3.scaleLinear().range([60, 75]).domain([1000, 3000]);

            const canvas = d3
                .select(d3CanvasMain.current)
                .select('canvas')
                .node() as HTMLCanvasElement;

            const rectCanvas = canvas.getBoundingClientRect();
            const canvasRightEnd = rectCanvas.right;
            const canvasLeftEnd = rectCanvas.left;

            if (isHoveredOrderHistory && hoveredOrderHistory) {
                if (
                    circleScale &&
                    showSwap &&
                    (hoveredOrderHistory.type === 'swap' ||
                        hoveredOrderHistory.type === 'limitOrder')
                ) {
                    setHoveredOrderTooltipPlacement(() => {
                        const top = scaleData.yScale(
                            denomInBase
                                ? hoveredOrderHistory.order.order
                                      .swapInvPriceDecimalCorrected
                                : hoveredOrderHistory.order.order
                                      .swapPriceDecimalCorrected,
                        );

                        let left =
                            scaleData?.xScale(
                                hoveredOrderHistory.order.order.txTime * 1000,
                            ) +
                            scale(
                                circleScale(hoveredOrderHistory.totalValueUSD),
                            );

                        let isOnLeftSide = false;
                        if (
                            isSelectedOrderHistory &&
                            selectedOrderTooltipPlacement
                        ) {
                            const { isOverLeft, isOverTop } = isShapeOverlaps(
                                left,
                                top,
                                selectedOrderTooltipPlacement.left,
                                selectedOrderTooltipPlacement.top,
                            );

                            isOnLeftSide = !!(isOverLeft && isOverTop);

                            left =
                                scaleData?.xScale(
                                    hoveredOrderHistory.order.order.txTime *
                                        1000,
                                ) +
                                (isOverLeft && isOverTop
                                    ? -scale(
                                          circleScale(
                                              hoveredOrderHistory.totalValueUSD,
                                          ),
                                      ) +
                                      (circleScale(
                                          hoveredOrderHistory.totalValueUSD,
                                      ) < 1500
                                          ? -105
                                          : -90)
                                    : +scale(
                                          circleScale(
                                              hoveredOrderHistory.totalValueUSD,
                                          ),
                                      ));
                        }

                        return {
                            top,
                            left,
                            isOnLeftSide,
                        };
                    });
                }

                if (
                    circleScale &&
                    showSwap &&
                    hoveredOrderHistory.type === 'claimableLimit'
                ) {
                    setHoveredOrderTooltipPlacement(() => {
                        const top = scaleData.yScale(
                            denomInBase
                                ? hoveredOrderHistory.order.order
                                      .invLimitPriceDecimalCorrected
                                : hoveredOrderHistory.order.order
                                      .limitPriceDecimalCorrected,
                        );

                        let left =
                            scaleData?.xScale(
                                hoveredOrderHistory.order.order.crossTime *
                                    1000,
                            ) +
                            scale(
                                circleScale(hoveredOrderHistory.totalValueUSD),
                            );

                        let isOnLeftSide = false;
                        if (
                            isSelectedOrderHistory &&
                            selectedOrderTooltipPlacement
                        ) {
                            const { isOverLeft, isOverTop } = isShapeOverlaps(
                                left,
                                top,
                                selectedOrderTooltipPlacement.left,
                                selectedOrderTooltipPlacement.top,
                            );

                            isOnLeftSide = !!(isOverLeft && isOverTop);

                            left =
                                scaleData?.xScale(
                                    hoveredOrderHistory.order.order.crossTime *
                                        1000,
                                ) +
                                (isOverLeft && isOverTop
                                    ? -scale(
                                          circleScale(
                                              hoveredOrderHistory.totalValueUSD,
                                          ),
                                      ) +
                                      (circleScale(
                                          hoveredOrderHistory.totalValueUSD,
                                      ) < 1500
                                          ? -105
                                          : -90)
                                    : +scale(
                                          circleScale(
                                              hoveredOrderHistory.totalValueUSD,
                                          ),
                                      ));
                        }

                        return {
                            top,
                            left,
                            isOnLeftSide,
                        };
                    });
                }

                if (
                    (hoveredOrderHistory.type === 'historical' ||
                        hoveredOrderHistory.type === 'historicalLiq') &&
                    (showHistorical || showLiquidity)
                ) {
                    const minPrice = denomInBase
                        ? hoveredOrderHistory.order
                              .bidTickInvPriceDecimalCorrected
                        : hoveredOrderHistory.order
                              .bidTickPriceDecimalCorrected;

                    const maxPrice = denomInBase
                        ? hoveredOrderHistory.order
                              .askTickInvPriceDecimalCorrected
                        : hoveredOrderHistory.order
                              .askTickPriceDecimalCorrected;

                    const diff = Math.abs(maxPrice - minPrice) / 2;

                    const pricePlacement = minPrice + diff;

                    setHoveredOrderTooltipPlacement(() => {
                        let top = scaleData.yScale(pricePlacement);

                        const latestTime =
                            hoveredOrderHistory.type === 'historicalLiq'
                                ? new Date().getTime() + 5 * 86400 * 1000
                                : hoveredOrderHistory.order.latestUpdateTime *
                                  1000;

                        const left = scaleData?.xScale(latestTime);

                        if (
                            isSelectedOrderHistory &&
                            selectedOrderTooltipPlacement
                        ) {
                            const { isOverLeft, isOverTop } = isShapeOverlaps(
                                left,
                                top,
                                selectedOrderTooltipPlacement.left,
                                selectedOrderTooltipPlacement.top,
                            );

                            if (isOverLeft && isOverTop) {
                                const direction =
                                    selectedOrderTooltipPlacement.top - top < 0
                                        ? -1
                                        : 1;

                                const diff =
                                    90 -
                                    Math.abs(
                                        selectedOrderTooltipPlacement.top - top,
                                    );

                                top = top - diff * direction;
                            }
                        }

                        const leftPlacement =
                            left > canvasRightEnd
                                ? canvasRightEnd - 150
                                : left < canvasLeftEnd
                                  ? canvasLeftEnd + 50
                                  : left;

                        return {
                            top: top < 0 ? 10 : top,
                            left: leftPlacement,
                            isOnLeftSide: false,
                        };
                    });
                }

                if (
                    hoveredOrderHistory.type === 'limitSwapLine' &&
                    circleScale &&
                    showLiquidity
                ) {
                    setHoveredOrderTooltipPlacement(() => {
                        const top = scaleData.yScale(
                            denomInBase
                                ? hoveredOrderHistory.order
                                      .invLimitPriceDecimalCorrected
                                : hoveredOrderHistory.order
                                      .limitPriceDecimalCorrected,
                        );

                        const time =
                            hoveredOrderHistory.order.claimableLiq === 0
                                ? hoveredOrderHistory.order.timeFirstMint
                                : hoveredOrderHistory.order.crossTime;

                        if (hoveredOrderHistory.order.claimableLiq === 0) {
                            const left = scaleData?.xScale(time * 1000) + 55;

                            let topPlacement = top;

                            if (
                                isSelectedOrderHistory &&
                                selectedOrderTooltipPlacement
                            ) {
                                const { isOverLeft, isOverTop } =
                                    isShapeOverlaps(
                                        left,
                                        top,
                                        selectedOrderTooltipPlacement.left,
                                        selectedOrderTooltipPlacement.top,
                                    );

                                if (isOverLeft && isOverTop) {
                                    const direction =
                                        selectedOrderTooltipPlacement.top -
                                            top <
                                        0
                                            ? -1
                                            : 1;

                                    const diff =
                                        90 -
                                        Math.abs(
                                            selectedOrderTooltipPlacement.top -
                                                top,
                                        );

                                    topPlacement = top - diff * direction;
                                }
                            }

                            return {
                                top: topPlacement,
                                left: left > 50 ? left : 50,
                                isOnLeftSide: false,
                            };
                        }
                    });
                }
            }

            if (isSelectedOrderHistory && selectedOrderHistory) {
                if (
                    (selectedOrderHistory.type === 'swap' ||
                        selectedOrderHistory.type === 'limitOrder') &&
                    circleScale &&
                    showSwap
                ) {
                    setSelectedOrderTooltipPlacement(() => {
                        const top = scaleData.yScale(
                            denomInBase
                                ? selectedOrderHistory.order.order
                                      .swapInvPriceDecimalCorrected
                                : selectedOrderHistory.order.order
                                      .swapPriceDecimalCorrected,
                        );
                        const left =
                            scaleData?.xScale(
                                selectedOrderHistory.order.order.txTime * 1000,
                            ) +
                            scale(
                                circleScale(selectedOrderHistory.totalValueUSD),
                            );

                        return { top, left, isOnLeftSide: false };
                    });
                }

                if (
                    selectedOrderHistory.type === 'claimableLimit' &&
                    circleScale &&
                    showSwap
                ) {
                    setSelectedOrderTooltipPlacement(() => {
                        const top = scaleData.yScale(
                            denomInBase
                                ? selectedOrderHistory.order.order
                                      .invLimitPriceDecimalCorrected
                                : selectedOrderHistory.order.order
                                      .limitPriceDecimalCorrected,
                        );
                        const left =
                            scaleData?.xScale(
                                selectedOrderHistory.order.order.crossTime *
                                    1000,
                            ) +
                            scale(
                                circleScale(selectedOrderHistory.totalValueUSD),
                            );

                        return { top, left, isOnLeftSide: false };
                    });
                }

                if (
                    selectedOrderHistory.type === 'limitSwapLine' &&
                    circleScale &&
                    showLiquidity
                ) {
                    setSelectedOrderTooltipPlacement(() => {
                        const top = scaleData.yScale(
                            denomInBase
                                ? selectedOrderHistory.order
                                      .invLimitPriceDecimalCorrected
                                : selectedOrderHistory.order
                                      .limitPriceDecimalCorrected,
                        );

                        const time =
                            selectedOrderHistory.order.claimableLiq === 0
                                ? selectedOrderHistory.order.timeFirstMint
                                : selectedOrderHistory.order.crossTime;

                        const distance =
                            selectedOrderHistory.order.claimableLiq > 0
                                ? scale(
                                      circleScale(
                                          selectedOrderHistory.totalValueUSD,
                                      ),
                                  )
                                : 55;

                        const left = scaleData?.xScale(time * 1000) + distance;

                        return { top, left, isOnLeftSide: false };
                    });
                }

                if (
                    (selectedOrderHistory.type === 'historical' &&
                        showHistorical) ||
                    (selectedOrderHistory.type === 'historicalLiq' &&
                        showLiquidity)
                ) {
                    const minPrice = denomInBase
                        ? selectedOrderHistory.order
                              .bidTickInvPriceDecimalCorrected
                        : selectedOrderHistory.order
                              .bidTickPriceDecimalCorrected;

                    const maxPrice = denomInBase
                        ? selectedOrderHistory.order
                              .askTickInvPriceDecimalCorrected
                        : selectedOrderHistory.order
                              .askTickPriceDecimalCorrected;

                    const diff = Math.abs(maxPrice - minPrice) / 2;

                    const pricePlacement = minPrice + diff;

                    setSelectedOrderTooltipPlacement(() => {
                        const top = scaleData.yScale(pricePlacement);

                        const latestTime =
                            selectedOrderHistory.type === 'historicalLiq'
                                ? new Date().getTime() + 5 * 86400 * 1000
                                : selectedOrderHistory.order.latestUpdateTime *
                                  1000;

                        const left = scaleData?.xScale(latestTime);

                        return {
                            top: top < 0 ? 10 : top,
                            left:
                                left > canvasRightEnd
                                    ? canvasRightEnd - 150
                                    : left,
                            isOnLeftSide: false,
                        };
                    });
                }
            }
        }
    };

    useEffect(() => {
        if (scaleData) calculateOrderHistoryTooltipPlacements(scaleData);
    }, [
        isSelectedOrderHistory,
        isHoveredOrderHistory,
        diffHashSig(selectedOrderHistory),
        diffHashSig(hoveredOrderHistory),
        diffHashSigScaleData(scaleData),
        reset,
        denomInBase,
        showHistorical,
        showLiquidity,
        showSwap,
    ]);

    useEffect(() => {
        if (lastCandleData) {
            setsubChartValues((prevState: SubChartValue[]) => {
                const newData = [...prevState];

                newData.filter(
                    (target: SubChartValue) => target.name === 'tvl',
                )[0].value = lastCandleData
                    ? lastCandleData.tvlData.tvl
                    : undefined;

                newData.filter(
                    (target: SubChartValue) => target.name === 'feeRate',
                )[0].value = lastCandleData
                    ? lastCandleData.averageLiquidityFee
                    : undefined;
                return newData;
            });
        }
    }, [reset]);

    return (
        <div
            ref={d3Container}
            className='main_layout_chart'
            data-testid={'chart'}
            id={'chartContainer'}
            style={{
                gridColumnStart: 1,
                gridColumnEnd: 1,
                gridRowStart: 1,
                gridRowEnd: 3,
                paddingLeft: toolbarWidth + 'px',
            }}
        >
            <d3fc-group
                id='d3fc_group'
                auto-resize
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gridTemplateRows: '1fr 0.1fr auto auto auto',
                }}
            >
                <CandleChart
                    chartItemStates={props.chartItemStates}
                    data={unparsedCandleData}
                    denomInBase={denomInBase}
                    lastCandleData={lastCandleData}
                    period={period}
                    scaleData={scaleData}
                    selectedDate={selectedDate}
                    showLatest={showLatest}
                    setBandwidth={setBandwidth}
                    prevlastCandleTime={prevlastCandleTime}
                    setPrevLastCandleTime={setPrevLastCandleTime}
                    isDiscontinuityScaleEnabled={isCondensedModeEnabled}
                    visibleDateForCandle={visibleDateForCandle}
                    chartThemeColors={chartThemeColors}
                />

                <VolumeBarCanvas
                    scaleData={scaleData}
                    volumeData={unparsedCandleData}
                    denomInBase={denomInBase}
                    selectedDate={selectedDate}
                    showVolume={showVolume}
                    visibleDateForCandle={visibleDateForCandle}
                    chartThemeColors={chartThemeColors}
                />

                {liquidityScale && liquidityData && (
                    <LiquidityChart
                        liqMode={liqMode}
                        liquidityData={liquidityData}
                        liquidityScale={liquidityScale}
                        scaleData={scaleData}
                        liquidityDepthScale={liquidityDepthScale}
                        ranges={ranges}
                        chartMousemoveEvent={chartMousemoveEvent}
                        liqTooltip={liqTooltip}
                        mouseLeaveEvent={mouseLeaveEvent}
                        isActiveDragOrZoom={isChartZoom || isLineDrag}
                        mainCanvasBoundingClientRect={
                            mainCanvasBoundingClientRect
                        }
                        chartThemeColors={chartThemeColors}
                        render={render}
                        colorChangeTrigger={colorChangeTrigger}
                        setColorChangeTrigger={setColorChangeTrigger}
                    />
                )}

                {((showSwap && circleScale) ||
                    showLiquidity ||
                    showHistorical) &&
                    scaleData && (
                        <OrderHistoryCanvas
                            scaleData={scaleData}
                            denomInBase={denomInBase}
                            showSwap={showSwap}
                            showLiquidity={showLiquidity}
                            showHistorical={showHistorical}
                            hoveredOrderHistory={hoveredOrderHistory}
                            isHoveredOrderHistory={isHoveredOrderHistory}
                            drawSettings={drawSettings}
                            filteredTransactionalData={
                                filteredTransactionalData
                            }
                            filteredLimitTxData={filteredLimitTxData}
                            circleScale={circleScale}
                            isSelectedOrderHistory={isSelectedOrderHistory}
                            selectedOrderHistory={selectedOrderHistory}
                            chartThemeColors={chartThemeColors}
                        />
                    )}

                <d3fc-canvas
                    ref={d3CanvasCrosshair}
                    className='cr-canvas'
                ></d3fc-canvas>
                <d3fc-canvas
                    ref={d3CanvasMarketLine}
                    className='market-line-canvas'
                ></d3fc-canvas>

                <RangeLinesChart {...rangeCanvasProps} />

                <LimitLineChart {...limitCanvasProps} />

                <d3fc-canvas
                    ref={d3CanvasMain}
                    className='main-canvas'
                    id={mainCanvasElementId}
                ></d3fc-canvas>

                {activeDrawingType !== 'Cross' && scaleData && (
                    <DrawCanvas
                        scaleData={scaleData}
                        setDrawnShapeHistory={setDrawnShapeHistory}
                        setCrossHairDataFunc={setCrossHairDataFunc}
                        activeDrawingType={activeDrawingType}
                        setActiveDrawingType={setActiveDrawingType}
                        setSelectedDrawnShape={setSelectedDrawnShape}
                        denomInBase={denomInBase}
                        addDrawActionStack={addDrawActionStack}
                        period={period}
                        crosshairData={crosshairData}
                        snapForCandle={snapForCandle}
                        visibleCandleData={
                            unparsedData.candles as Array<CandleDataChart>
                        }
                        render={render}
                        zoomBase={zoomBase}
                        setIsChartZoom={setIsChartZoom}
                        isChartZoom={isChartZoom}
                        lastCandleData={lastCandleData}
                        firstCandleData={firstCandleData}
                        isMagnetActive={isMagnetActive}
                        drawSettings={drawSettings}
                        quoteTokenDecimals={quoteTokenDecimals}
                        baseTokenDecimals={baseTokenDecimals}
                        setIsUpdatingShape={setIsUpdatingShape}
                        bandwidth={bandwidth}
                    />
                )}

                {isDragActive && scaleData && (
                    <DragCanvas
                        scaleData={scaleData}
                        canUserDragDrawnShape={canUserDragDrawnShape}
                        hoveredDrawnShape={hoveredDrawnShape}
                        drawnShapeHistory={drawnShapeHistory}
                        render={render}
                        mousemove={mousemove}
                        setCrosshairActive={setCrosshairActive}
                        setSelectedDrawnShape={setSelectedDrawnShape}
                        setIsUpdatingShape={setIsUpdatingShape}
                        denomInBase={denomInBase}
                        addDrawActionStack={addDrawActionStack}
                        snapForCandle={snapForCandle}
                        visibleCandleData={visibleCandleData}
                        zoomBase={zoomBase}
                        setIsChartZoom={setIsChartZoom}
                        isChartZoom={isChartZoom}
                        lastCandleData={lastCandleData}
                        firstCandleData={firstCandleData}
                        setIsDragActive={setIsDragActive}
                        period={period}
                        setContextmenu={setContextmenu}
                        setContextMenuPlacement={setContextMenuPlacement}
                        setIsShowFloatingToolbar={setIsShowFloatingToolbar}
                    />
                )}
                <YAxisCanvas {...yAxisCanvasProps} />
                {showFeeRate && (
                    <>
                        <hr />
                        <FeeRateChart
                            feeData={visibleCandleData.sort(
                                (a, b) => b.time - a.time,
                            )}
                            period={period}
                            crosshairForSubChart={crosshairData}
                            setCrosshairData={setCrosshairData}
                            subChartValues={subChartValues}
                            scaleData={scaleData}
                            render={render}
                            yAxisWidth={yAxisWidth}
                            setCrossHairLocation={candleOrVolumeDataHoverStatus}
                            setCrosshairActive={setCrosshairActive}
                            crosshairActive={crosshairActive}
                            setShowTooltip={props.setShowTooltip}
                            xAxisActiveTooltip={xAxisActiveTooltip}
                            zoomBase={zoomBase}
                            mainZoom={mainZoom}
                            setIsChartZoom={setIsChartZoom}
                            isChartZoom={isChartZoom}
                            lastCandleData={lastCandleData}
                            firstCandleData={firstCandleData}
                            chartThemeColors={chartThemeColors}
                            colorChangeTrigger={colorChangeTrigger}
                            setColorChangeTrigger={setColorChangeTrigger}
                            setContextmenu={setContextmenu}
                            setContextMenuPlacement={setContextMenuPlacement}
                        />
                    </>
                )}

                {showTvl && (
                    <>
                        <hr />
                        <TvlChart
                            tvlData={visibleCandleData.sort(
                                (a, b) => b.time - a.time,
                            )}
                            period={period}
                            crosshairForSubChart={crosshairData}
                            setCrosshairData={setCrosshairData}
                            scaleData={scaleData}
                            subChartValues={subChartValues}
                            render={render}
                            yAxisWidth={yAxisWidth}
                            setCrossHairLocation={candleOrVolumeDataHoverStatus}
                            setCrosshairActive={setCrosshairActive}
                            crosshairActive={crosshairActive}
                            setShowTooltip={props.setShowTooltip}
                            xAxisActiveTooltip={xAxisActiveTooltip}
                            mainZoom={mainZoom}
                            lastCandleData={lastCandleData}
                            firstCandleData={firstCandleData}
                            isChartZoom={isChartZoom}
                            zoomBase={zoomBase}
                            setIsChartZoom={setIsChartZoom}
                            chartThemeColors={chartThemeColors}
                            colorChangeTrigger={colorChangeTrigger}
                            setColorChangeTrigger={setColorChangeTrigger}
                            setContextmenu={setContextmenu}
                            setContextMenuPlacement={setContextMenuPlacement}
                        />
                    </>
                )}

                <div className='xAxis'>
                    <hr />

                    <XAxisCanvas
                        changeScale={changeScale}
                        crosshairActive={crosshairActive}
                        crosshairData={crosshairData}
                        firstCandleData={firstCandleData}
                        isLineDrag={isLineDrag}
                        lastCandleData={lastCandleData}
                        mouseLeaveCanvas={mouseLeaveCanvas}
                        period={period}
                        render={render}
                        scaleData={scaleData}
                        reset={reset}
                        setCrosshairActive={setCrosshairActive}
                        setXaxisActiveTooltip={setXaxisActiveTooltip}
                        showLatestActive={showLatestActive}
                        zoomBase={zoomBase}
                        isChartZoom={isChartZoom}
                        isToolbarOpen={isToolbarOpen}
                        selectedDrawnShape={selectedDrawnShape}
                        d3Xaxis={d3XaxisRef}
                        isUpdatingShape={isUpdatingShape}
                        timeGaps={timeGaps}
                        isDiscontinuityScaleEnabled={isCondensedModeEnabled}
                        bandwidth={bandwidth}
                    />
                </div>
            </d3fc-group>
            {isShowFloatingToolbar && (
                <FloatingToolbar
                    selectedDrawnShape={selectedDrawnShape}
                    mainCanvasBoundingClientRect={mainCanvasBoundingClientRect}
                    setDrawnShapeHistory={setDrawnShapeHistory}
                    setSelectedDrawnShape={setSelectedDrawnShape}
                    setIsDragActive={setIsDragActive}
                    deleteItem={deleteItem}
                    setIsShapeEdited={setIsShapeEdited}
                    addDrawActionStack={addDrawActionStack}
                    drawnShapeHistory={drawnShapeHistory}
                    chartThemeColors={chartThemeColors}
                    setHoveredDrawnShape={setHoveredDrawnShape}
                />
            )}

            {scaleData &&
                (showSwap || showLiquidity || showHistorical) &&
                hoveredOrderHistory &&
                hoveredOrderHistory.id !== selectedOrderHistory?.id &&
                hoveredOrderTooltipPlacement && (
                    <OrderHistoryTooltip
                        hoveredOrderHistory={hoveredOrderHistory}
                        isHoveredOrderHistory={isHoveredOrderHistory}
                        denomInBase={denomInBase}
                        hoveredOrderTooltipPlacement={
                            hoveredOrderTooltipPlacement
                        }
                        handleCardClick={handleCardClick}
                        setSelectedOrderHistory={setSelectedOrderHistory}
                        setIsSelectedOrderHistory={setIsSelectedOrderHistory}
                        pointerEvents={
                            !isDragActive && activeDrawingType === 'Cross'
                        }
                        setHoverOHTooltip={setHoverOHTooltip}
                    />
                )}

            {scaleData &&
                selectedOrderHistory &&
                ((showSwap &&
                    (selectedOrderHistory.type === 'swap' ||
                        selectedOrderHistory.type === 'limitOrder' ||
                        selectedOrderHistory.type === 'claimableLimit')) ||
                    (showLiquidity &&
                        (selectedOrderHistory.type === 'limitSwapLine' ||
                            selectedOrderHistory.type === 'historicalLiq')) ||
                    (showHistorical &&
                        selectedOrderHistory.type === 'historical')) &&
                selectedOrderTooltipPlacement && (
                    <OrderHistoryTooltip
                        hoveredOrderHistory={selectedOrderHistory}
                        isHoveredOrderHistory={isSelectedOrderHistory}
                        denomInBase={denomInBase}
                        hoveredOrderTooltipPlacement={
                            selectedOrderTooltipPlacement
                        }
                        handleCardClick={handleCardClick}
                        setSelectedOrderHistory={setSelectedOrderHistory}
                        setIsSelectedOrderHistory={setIsSelectedOrderHistory}
                        pointerEvents={
                            !isDragActive && activeDrawingType === 'Cross'
                        }
                        setHoverOHTooltip={setHoverOHTooltip}
                    />
                )}

            {contextmenu && contextMenuPlacement && chartThemeColors && (
                <ChartSettings
                    contextMenuPlacement={contextMenuPlacement}
                    setContextmenu={setContextmenu}
                    chartItemStates={props.chartItemStates}
                    chartThemeColors={chartThemeColors}
                    render={render}
                    isCondensedModeEnabled={isCondensedModeEnabled}
                    setIsCondensedModeEnabled={setIsCondensedModeEnabled}
                    setShouldDisableChartSettings={
                        setShouldDisableChartSettings
                    }
                    setCloseOutherChartSetting={setCloseOutherChartSetting}
                    closeOutherChartSetting={closeOutherChartSetting}
                    showLatest={showLatest}
                />
            )}
        </div>
    );
}
