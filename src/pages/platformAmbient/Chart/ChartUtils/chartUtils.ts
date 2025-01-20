// eslint-disable-next-line quotes
import * as d3 from 'd3';
import {
    DetailedHTMLProps,
    HTMLAttributes,
    MouseEvent,
    MutableRefObject,
} from 'react';
import {
    CandleDataIF,
    LiquidityRangeIF,
} from '../../../../ambient-utils/types';
import { skins } from '../../../../App/hooks/useSkin';
import { LiquidityDataLocal } from '../../Trade/TradeCharts/TradeCharts';
import {
    LS_KEY_CHART_ANNOTATIONS,
    initialDisplayCandleCount,
    initialDisplayCandleCountForMobile,
} from './chartConstants';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface IntrinsicElements {
            'd3fc-group': DetailedHTMLProps<
                HTMLAttributes<HTMLDivElement>,
                HTMLDivElement
            >;
            'd3fc-svg': DetailedHTMLProps<
                HTMLAttributes<HTMLDivElement>,
                HTMLDivElement
            >;
            'd3fc-canvas': DetailedHTMLProps<
                HTMLAttributes<HTMLCanvasElement | HTMLDivElement>,
                HTMLCanvasElement | HTMLDivElement
            >;
        }
    }
}

export type chartAnnotationData = {
    isOpenAnnotationPanel: boolean;
    drawnShapes: drawDataHistory[];
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type lineData = { x: number; y: number; denomInBase: boolean };
export type poolDataChart = {
    poolIndex: number;
    tokenA: string;
    tokenB: string;
    isTokenABase: boolean;
    denomInBase: boolean;
};

export type drawnShapeEditAttributes = {
    active: boolean;
    color: string;
    lineWidth: number;
    dash: number[];
};

export type drawDataHistory = {
    data: lineData[];
    type: string;
    time: number;
    pool: poolDataChart;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    extraData: Array<any>;
    border: drawnShapeEditAttributes;
    line: drawnShapeEditAttributes;
    background: drawnShapeEditAttributes;
    extendLeft: boolean;
    extendRight: boolean;
    labelPlacement: string;
    labelAlignment: string;
    reverse: boolean;
};

export type bandLineData = {
    fromValue: number;
    toValue: number;
    denomInBase: boolean;
};
export type selectedDrawnData = {
    data: drawDataHistory;
    selectedCircle: lineData | undefined;
};

export interface CandleDataChart extends CandleDataIF {
    isShowData: boolean;
}
export type liquidityChartData = {
    liqAskData: LiquidityDataLocal[];
    liqBidData: LiquidityDataLocal[];
    depthLiqBidData: LiquidityDataLocal[];
    depthLiqAskData: LiquidityDataLocal[];
    topBoundary: number;
    lowBoundary: number;
    liqTransitionPointforCurve: number;
    liqTransitionPointforDepth: number;
};

export type scaleData = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xScale: any;
    xScaleTime: d3.ScaleTime<number, number>;
    yScale: d3.ScaleLinear<number, number>;
    volumeScale: d3.ScaleLinear<number, number>;
    xExtent: [number, number];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    priceRange: any;
};

export type crosshair = {
    x: number | Date;
    y: number | string;
};
export type chartItemStates = {
    showTvl: boolean;
    setShowTvl: React.Dispatch<React.SetStateAction<boolean>>;
    showVolume: boolean;
    setShowVolume: React.Dispatch<React.SetStateAction<boolean>>;
    showFeeRate: boolean;
    setShowFeeRate: React.Dispatch<React.SetStateAction<boolean>>;
    liqMode: string;
    showSwap: boolean;
    setShowSwap: React.Dispatch<React.SetStateAction<boolean>>;
    showLatest: boolean;
    setShowLatest: React.Dispatch<React.SetStateAction<boolean>>;
    setLatest: React.Dispatch<React.SetStateAction<boolean>>;
    rescale: boolean;
    setRescale: React.Dispatch<React.SetStateAction<boolean>>;
    reset: boolean;
    setReset: React.Dispatch<React.SetStateAction<boolean>>;
    showLiquidity: boolean;
    showHistorical: boolean;
};

export type lineValue = {
    name: string;
    value: number;
};

export interface SubChartValue {
    name: string;
    value: number | undefined;
}

export type zoomUtils = {
    zoom: d3.ZoomBehavior<Element, unknown>;
    xAxisZoom: d3.ZoomBehavior<Element, unknown>;
};

export type timeGapsValue = {
    range: number[];
    isAddedPixel: boolean;
};

export type orderHistory = {
    tsId: string;
    tsStart: Date;
    tsEnd: Date;
    orderPrice: number;
    orderPriceCompleted: number;
    orderType: string;
    orderDirection: string;
    orderStatus: string;
    orderDolarAmount: number;
    tokenA: string;
    tokenAAmount: number;
    tokenB: string;
    tokenBAmount: number;
};
export const isIOS = (): boolean => {
    const userAgent = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(userAgent);
};

export function setCanvasResolution(canvas: HTMLCanvasElement) {
    const ratio = window.devicePixelRatio < 1 ? 1 : window.devicePixelRatio;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    if (canvas !== null) {
        const width = canvas.width;
        const height = canvas.height;
        canvas.width = width * ratio;
        canvas.height = height * ratio;

        context.scale(ratio, ratio);
    }
}

export function renderCanvasArray(
    canvasArray: MutableRefObject<HTMLDivElement | HTMLCanvasElement | null>[],
) {
    canvasArray.forEach((canvas) => {
        if (canvas && canvas.current) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const container = d3.select(canvas.current).node() as any;
            if (container) container.requestRedraw();
        }
    });
}

export const renderSubchartCrCanvas = () => {
    const feeRateCrCanvas = d3
        .select('#fee_rate_chart')
        .select('#d3CanvasCrosshair');

    if (feeRateCrCanvas) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nd = feeRateCrCanvas.node() as any;
        if (nd) nd.requestRedraw();
    }

    const tvlCrCanvas = d3.select('#tvl_chart').select('#d3CanvasCrosshair');

    if (tvlCrCanvas) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nd = tvlCrCanvas.node() as any;
        if (nd) nd.requestRedraw();
    }

    const tvlYaxisCanvas = d3.select('#tvl_chart').select('#y-axis-canvas_tvl');

    if (tvlYaxisCanvas) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nd = tvlYaxisCanvas.node() as any;
        if (nd) nd.requestRedraw();
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function standardDeviation(arr: any, usePopulation = false) {
    const mean =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        arr.reduce((acc: any, val: any) => acc + val, 0) / arr.length;
    return Math.sqrt(
        arr
            .reduce(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (acc: any, val: any) => acc.concat((val - mean) ** 2),
                [],
            )
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .reduce((acc: any, val: any) => acc + val, 0) /
            (arr.length - (usePopulation ? 0 : 1)),
    );
}

export interface LiquidityRangeIFChart extends LiquidityRangeIF {
    isFakeData?: boolean;
}

export function formatTimeDifference(startDate: Date, endDate: Date): string {
    const timeDifference = endDate.getTime() - startDate.getTime();
    const secondsDifference = Math.floor(timeDifference / 1000);

    const days = Math.floor(secondsDifference / 86400);
    const hours = Math.floor((secondsDifference % 86400) / 3600);
    const minutes = Math.floor((secondsDifference % 3600) / 60);

    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else {
        return `${hours}h ${minutes}m`;
    }
}

export function calculateFibRetracement(
    lineData: lineData[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fibLevels: Array<any>,
) {
    const retracementIsUp = lineData[0].y > lineData[1].y;

    const pointLevel = lineData[1].y;
    const secondLevel = lineData[0].y;

    const diff = Math.abs(pointLevel - secondLevel);

    const fibLineData: Array<
        {
            x: number;
            y: number;
            denomInBase: boolean;
            lineColor: string;
            areaColor: string;
            level: number;
        }[]
    > = [];

    fibLevels.forEach((level) => {
        if (level.active) {
            fibLineData.push([
                {
                    x: lineData[0].x,
                    y:
                        pointLevel +
                        diff * level.level * (retracementIsUp ? 1 : -1),
                    denomInBase: lineData[0].denomInBase,
                    lineColor: level.lineColor,
                    areaColor: level.areaColor,
                    level: level.level,
                },
                {
                    x: lineData[1].x,
                    y:
                        pointLevel +
                        diff * level.level * (retracementIsUp ? 1 : -1),
                    denomInBase: lineData[0].denomInBase,
                    lineColor: level.lineColor,
                    areaColor: level.areaColor,
                    level: level.level,
                },
            ]);
        }
    });

    fibLineData.sort((a, b) =>
        retracementIsUp ? a[0].y - b[0].y : b[0].y - a[0].y,
    );

    return fibLineData;
}

export function calculateFibRetracementBandAreas(
    lineData: lineData[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fibLevels: Array<any>,
) {
    const retracementIsUp = lineData[0].y > lineData[1].y;

    const pointLevel = lineData[1].y;
    const secondLevel = lineData[0].y;

    const diff = Math.abs(pointLevel - secondLevel);

    const fibLineData: Array<{
        fromValue: number;
        toValue: number;
        denomInBase: boolean;
        lineColor: string;
        areaColor: string;
    }> = [];

    const activeFibLevels = fibLevels.filter((level) => level.active);

    if (activeFibLevels.length > 0) {
        activeFibLevels.reduce((prev, curr) => {
            if (curr.active) {
                fibLineData.push({
                    fromValue:
                        pointLevel +
                        diff * prev.level * (retracementIsUp ? 1 : -1),
                    toValue:
                        pointLevel +
                        diff * curr.level * (retracementIsUp ? 1 : -1),
                    denomInBase: lineData[0].denomInBase,
                    lineColor: curr.lineColor,
                    areaColor: curr.areaColor,
                });
            }

            return curr;
        });
    }

    fibLineData.sort((a, b) =>
        retracementIsUp ? a.fromValue - b.fromValue : b.fromValue - a.fromValue,
    );

    return fibLineData;
}

export function getXandYLocationForChart(
    event: MouseEvent<HTMLDivElement>,
    rect: DOMRect,
) {
    let offsetY = event.clientY - rect?.top;
    let offsetX = event.clientX - rect?.left;

    if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
        offsetY = event.targetTouches[0].clientY - rect?.top;
        offsetX = event.targetTouches[0].clientX - rect?.left;
    }

    return { offsetX: offsetX, offsetY: offsetY };
}

export function getXandYLocationForChartDrag(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    event: any,
    rect: DOMRect,
) {
    let offsetY = event.sourceEvent.clientY - rect?.top;
    let offsetX = event.sourceEvent.clientX - rect?.left;

    if (
        typeof TouchEvent !== 'undefined' &&
        event.sourceEvent instanceof TouchEvent
    ) {
        offsetY = event.sourceEvent.touches[0].clientY - rect?.top;
        offsetX = event.sourceEvent.touches[0].clientX - rect?.left;
    }

    return { offsetX: offsetX, offsetY: offsetY };
}

export function saveShapeAttiributesToLocalStorage(item: drawDataHistory) {
    const storedData = localStorage.getItem(LS_KEY_CHART_ANNOTATIONS);
    if (storedData) {
        const parseStoredData = JSON.parse(storedData);

        if (parseStoredData.defaultSettings === undefined) {
            parseStoredData.defaultSettings = {};
        }
        parseStoredData.defaultSettings[item.type] = {
            line: item.line,
            background: item.background,
            border: item.border,
            extraData: item.extraData,
            extendLeft: item.extendLeft,
            extendRight: item.extendRight,
            labelPlacement: item.labelPlacement,
            labelAlignment: item.labelAlignment,
            reverse: item.reverse,
        };

        localStorage.setItem(
            LS_KEY_CHART_ANNOTATIONS,
            JSON.stringify(parseStoredData),
        );
    }
}

export const clipCanvas = (
    x: number,
    y: number,
    width: number,
    height: number,
    canvas: HTMLCanvasElement,
) => {
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();
};

export const getInitialDisplayCandleCount = (mobileView: boolean) => {
    if (mobileView) {
        return initialDisplayCandleCountForMobile;
    }

    return initialDisplayCandleCount;
};

export const findSnapTime = (timeSeconds: number, period: number) => {
    const snapDiff = timeSeconds % (period * 1000);

    const snappedTime =
        timeSeconds -
        (snapDiff > period * 1000 - snapDiff
            ? -1 * (period * 1000 - snapDiff)
            : snapDiff);

    return snappedTime;
};

export const renderChart = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nd = d3.select('#d3fc_group').node() as any;
    if (nd) nd.requestRedraw();
};

export function isTimeZoneStart(date: Date): boolean {
    try {
        const day = date.getDate();

        if (day === 1) {
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}

export function checkShowLatestCandle(
    period: number,
    xScale?: d3.ScaleLinear<number, number, never>,
) {
    if (xScale) {
        const xDomain = xScale.domain();
        const nowDate = Date.now();
        const snapDiff = nowDate % (period * 1000);
        const snappedTime = nowDate + (period * 1000 - snapDiff);

        const isShowLatestCandle =
            xDomain[0] < snappedTime && snappedTime < xDomain[1];

        return isShowLatestCandle;
    }
    return false;
}

export function getCandleCount(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    xScale: any,
    data: CandleDataChart[],
    domain: number[],
    period: number,
    isCondensedMode: boolean,
) {
    const min = domain[0];
    const max = domain[1];

    const filtered = data.filter(
        (data: CandleDataIF) =>
            data.time * 1000 >= min && data.time * 1000 <= max,
    );

    let dataLenght = filtered.length;

    if (filtered && dataLenght && isCondensedMode) {
        const diffMaxPixel = xScale(filtered[0].time * 1000) - xScale(max);
        const diffMinPixel =
            xScale(filtered[filtered.length - 1].time) - xScale(min);

        const maxGap = Math.floor(
            (max - filtered[0].time * 1000) / (period * 1000),
        );
        const minGap = Math.floor(
            (filtered[filtered.length - 1].time * 1000 - min) / (period * 1000),
        );
        if (maxGap > 0 && diffMaxPixel) {
            dataLenght = dataLenght + maxGap;
        }
        if (minGap > 0 && diffMinPixel) {
            dataLenght = dataLenght + minGap;
        }
    } else {
        dataLenght = Math.floor((max - min) / (period * 1000)) + 1;
    }

    return dataLenght;
}
export function roundToNearestPreset(closest: number) {
    if (closest < 1) {
        if (closest < 0.1) {
            return 0.1;
        }
        return Number(closest.toFixed(2));
    }

    if (closest > 100) {
        return 100;
    }

    return Math.floor(closest);
}

export const getCssVariable = (activeSkin: skins, variableName: string) => {
    const themeElement = document.querySelector(
        '[data-theme="' + activeSkin + '"]',
    ) as Element;

    if (!themeElement) {
        console.error(
            `theme element not found while accessing CSS variable: ${variableName}`,
        );
        return d3.rgb(128, 128, 128); // Neutral gray as fallback
    }

    const value = getComputedStyle(themeElement)
        .getPropertyValue(variableName)
        .trim();

    const res = d3.color(value);

    return res as d3.RGBColor | d3.HSLColor;
};

export const getLast15Minutes = (period: number) => {
    const currentTime = findSnapTime(Date.now(), period) - period * 1000;
    const totalTimeMs = 15 * 60 * 1000; // 15 min to ms
    const candleCount = Math.trunc(totalTimeMs / (period * 1000));
    const times = [];
    for (let index = 0; index < candleCount; index++) {
        times.push(currentTime - period * 1000 * index);
    }
    return times;
};
