import * as d3 from 'd3';
import * as d3fc from 'd3fc';
import {
    MouseEvent,
    memo,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
    diffHashSig,
    diffHashSigScaleData,
} from '../../../../../ambient-utils/dataLayer';
import { BrandContext } from '../../../../../contexts/BrandContext';
import { PoolContext } from '../../../../../contexts/PoolContext';
import { RangeContext } from '../../../../../contexts/RangeContext';
import {
    formatAmountChartData,
    formatPoolPriceAxis,
} from '../../../../../utils/numbers';
import {
    crosshair,
    getXandYLocationForChart,
    lineValue,
    liquidityChartData,
    renderCanvasArray,
    renderSubchartCrCanvas,
    scaleData,
    selectedDrawnData,
    setCanvasResolution,
} from '../../ChartUtils/chartUtils';
import useDollarPrice from '../../ChartUtils/getDollarPrice';
import { createRectLabel } from './YaxisUtils';
import { ChartContext } from '../../../../../contexts';

interface yAxisIF {
    scaleData: scaleData | undefined;
    chartPoolPrice: number;
    liqMode: string;
    liqTransitionPointforCurve: number;
    liqTransitionPointforDepth: number;
    ranges: Array<lineValue>;
    limit: number;
    isAmbientOrAdvanced: boolean;
    checkLimitOrder: boolean;
    sellOrderStyle: string;
    crosshairActive: string;
    crosshairData: Array<crosshair>;
    reset: boolean | undefined;
    isLineDrag: boolean | undefined;
    setRescale: React.Dispatch<React.SetStateAction<boolean>>;
    setCrosshairActive: React.Dispatch<React.SetStateAction<string>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: any;
    liquidityData: liquidityChartData | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dragRange: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dragLimit: any;
    denomInBase: boolean;
    setYaxisWidth: React.Dispatch<React.SetStateAction<string>>;
    yAxisWidth: string;
    simpleRangeWidth: number;
    poolPriceDisplay: number;
    isChartZoom: boolean;
    isUpdatingShape: boolean;
    selectedDrawnShape: selectedDrawnData | undefined;
}

type yLabel = {
    x: number;
    y: number;
    width: number;
    height: number;
};

function YAxisCanvas(props: yAxisIF) {
    const {
        scaleData,
        ranges,
        liqMode,
        chartPoolPrice,
        isAmbientOrAdvanced,
        limit,
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
        isChartZoom,
        selectedDrawnShape,
        isUpdatingShape,
    } = props;

    const d3Yaxis = useRef<HTMLInputElement | null>(null);

    const [yAxisLabels] = useState<yLabel[]>([]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [yAxis, setYaxis] = useState<any>();

    const [yAxisZoom, setYaxisZoom] =
        useState<d3.ZoomBehavior<Element, unknown>>();

    const [yAxisCanvasWidth, setYaxisCanvasWidth] = useState(70);
    const { advancedMode } = useContext(RangeContext);
    const { isTradeDollarizationEnabled } = useContext(PoolContext);

    const location = useLocation();

    const getDollarPrice = useDollarPrice();
    const { chartThemeColors } = useContext(ChartContext);

    const { platformName } = useContext(BrandContext);

    useEffect(() => {
        if (scaleData) {
            const _yAxis = d3fc.axisRight().scale(scaleData?.yScale);

            setYaxis(() => {
                return _yAxis;
            });
        }
    }, [scaleData, location]);

    function changeyAxisWidth() {
        let yTickValueLength =
            formatPoolPriceAxis(scaleData?.yScale.ticks()[0]).length - 1;
        let result = false;
        scaleData?.yScale.ticks().forEach((element: number) => {
            if (formatPoolPriceAxis(element).length > 4) {
                result = true;
                yTickValueLength =
                    yTickValueLength > formatPoolPriceAxis(element).length - 1
                        ? yTickValueLength
                        : formatPoolPriceAxis(element).length - 1;
            }
        });
        if (result) {
            if (yTickValueLength > 4 && yTickValueLength < 8) {
                setYaxisWidth('6rem');
                setYaxisCanvasWidth(70);
            }
            if (yTickValueLength >= 8) {
                setYaxisWidth('7rem');
                setYaxisCanvasWidth(85);
            }
            if (yTickValueLength >= 10) {
                setYaxisWidth('8rem');
                setYaxisCanvasWidth(100);
            }
            if (yTickValueLength >= 13) {
                setYaxisWidth('9rem');
                setYaxisCanvasWidth(117);
            }
            if (yTickValueLength >= 15) {
                setYaxisWidth('10rem');
                setYaxisCanvasWidth(134);
            }
            if (yTickValueLength >= 16) {
                setYaxisCanvasWidth(142);
            }
            if (yTickValueLength >= 17) {
                setYaxisCanvasWidth(147);
            }
            if (yTickValueLength >= 20) {
                setYaxisWidth('11rem');
                setYaxisCanvasWidth(152);
            }
        }
        if (yTickValueLength <= 4) setYaxisWidth('5rem');
    }

    const sameLocationRange = () => {
        if (scaleData) {
            const low = ranges.filter(
                (target: lineValue) => target.name === 'Min',
            )[0].value;
            const high = ranges.filter(
                (target: lineValue) => target.name === 'Max',
            )[0].value;

            if (high >= low) {
                const resultData =
                    scaleData?.yScale(low) - scaleData?.yScale(high);
                const resultLocationData = resultData < 0 ? -20 : 20;
                const isSameLocation = Math.abs(resultData) < 20;
                const sameLocationData =
                    scaleData?.yScale(high) + resultLocationData;

                return {
                    isSameLocationMin: isSameLocation,
                    sameLocationDataMin: sameLocationData,
                    isSameLocationMax: false,
                    sameLocationDataMax: 0,
                };
            } else {
                const resultData =
                    scaleData?.yScale(low) - scaleData?.yScale(high);
                const resultLocationData = resultData < 0 ? -20 : 20;
                const isSameLocation = Math.abs(resultData) < 20;
                const sameLocationData =
                    scaleData?.yScale(low) - resultLocationData;

                return {
                    isSameLocationMin: false,
                    sameLocationDataMin: 0,
                    isSameLocationMax: isSameLocation,
                    sameLocationDataMax: sameLocationData,
                };
            }
        }

        return {
            isSameLocationMin: false,
            sameLocationDataMin: 0,
            isSameLocationMax: false,
            sameLocationDataMax: 0,
        };
    };

    const sameLocationLimit = () => {
        if (scaleData) {
            const resultData =
                scaleData?.yScale(limit) - scaleData?.yScale(chartPoolPrice);
            const resultLocationData = resultData < 0 ? -20 : 20;
            const isSameLocation = Math.abs(resultData) < 20;
            const sameLocationData =
                scaleData?.yScale(chartPoolPrice) + resultLocationData;
            return {
                isSameLocation: isSameLocation,
                sameLocationData: sameLocationData,
            };
        }
        return {
            isSameLocation: false,
            sameLocationData: 0,
        };
    };

    function findSubscriptUnicodeIndex(subscript: string): number | undefined {
        const subscriptUnicodeMap: { [key: string]: number }[] = [
            { '₀': 0 },
            { '₁': 1 },
            { '₂': 2 },
            { '₃': 3 },
            { '₄': 4 },
            { '₅': 5 },
            { '₆': 6 },
            { '₇': 7 },
            { '₈': 8 },
            { '₉': 9 },
            { '₁₀': 10 },
            { '₁₁': 11 },
            { '₁₂': 12 },
            { '₁₃': 13 },
            { '₁₄': 14 },
            { '₁₅': 15 },
            { '₁₆': 16 },
            { '₁₇': 17 },
            { '₁₈': 18 },
            { '₁₉': 19 },
            { '₂₀': 20 },
        ];

        let subscriptUnicode = undefined;
        subscriptUnicodeMap.forEach((element) => {
            if (subscript.includes(Object.keys(element)[0])) {
                subscriptUnicode = Object.values(element)[0];
            }
        });

        return subscriptUnicode ? subscriptUnicode : undefined;
    }

    const prepareTickLabel = (value: number) => {
        const splitText = '0.0';
        let tick = getDollarPrice(value).formattedValue.replace(',', '');
        const tickSubString = findSubscriptUnicodeIndex(tick);
        const isScientificTick = tickSubString !== undefined;

        if (isScientificTick) {
            const textScientificArray = tick.split(splitText);
            tick = textScientificArray[1].slice(1, 4);
        }

        return { tick, tickSubString };
    };

    const drawYaxis = (
        context: CanvasRenderingContext2D,
        yScale: d3.ScaleLinear<number, number>,
        X: number,
    ) => {
        yAxisLabels.length = 0;
        const low = ranges.filter(
            (target: lineValue) => target.name === 'Min',
        )[0].value;
        const high = ranges.filter(
            (target: lineValue) => target.name === 'Max',
        )[0].value;

        const canvas = d3
            .select(d3Yaxis.current)
            .select('canvas')
            .node() as HTMLCanvasElement;

        if (canvas !== null && chartThemeColors) {
            const labelTextColor = chartThemeColors.text1.toString();
            const labelBackgroundColor =
                chartThemeColors.rangeLinesColor.toString();
            const poolPriceTextColor = chartThemeColors.dark4.toString();
            const poolPriceBackGroundColor = chartThemeColors.text1.toString();

            const height = canvas.height;
            const width = canvas.width;

            const factor = height < 500 ? 5 : height.toString().length * 2;

            context.stroke();
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillStyle = 'rgba(189,189,189,0.8)';
            context.font = '12.425px Lexend Deca';

            const yScaleTicks = yScale.ticks(factor);

            const switchFormatter =
                yScaleTicks.find((element: number) => {
                    return element > 99999;
                }) !== undefined;

            const formatTicks = switchFormatter
                ? formatPoolPriceAxis
                : formatAmountChartData;

            yScaleTicks.forEach((d: number) => {
                const splitText = d > 0 ? '0.0' : '-0.0';

                const digit = d.toString().split('.')[1]?.length;

                const value = getDollarPrice(d).formattedValue.replace(',', '');

                const subString = findSubscriptUnicodeIndex(value);

                const isScientific = subString !== undefined;

                if (isScientific) {
                    const textScientificArray = String(value).split(splitText);
                    const textScientific = textScientificArray[1].slice(1, 4);
                    const startText = isTradeDollarizationEnabled
                        ? '$' + splitText
                        : splitText;
                    const textHeight =
                        context.measureText(startText).actualBoundingBoxAscent +
                        context.measureText(startText).actualBoundingBoxDescent;

                    context.beginPath();
                    context.fillText(
                        startText,
                        X -
                            context.measureText(startText).width / 2 -
                            context.measureText(subString.toString()).width / 2,
                        yScale(d),
                    );
                    context.fillText(
                        subString.toString(),
                        X,
                        yScale(d) + textHeight / 3,
                    );

                    context.fillText(
                        textScientific,
                        X +
                            context.measureText(textScientific).width / 2 +
                            context.measureText(subString.toString()).width / 2,
                        yScale(d),
                    );
                } else {
                    context.beginPath();
                    const text = isTradeDollarizationEnabled
                        ? value
                        : formatTicks(d, digit ? digit : 2);
                    context.fillText(text, X, yScale(d));
                }
            });

            if (chartPoolPrice) {
                const { tick, tickSubString } =
                    prepareTickLabel(chartPoolPrice);

                createRectLabel(
                    context,
                    yScale(chartPoolPrice),
                    X,
                    poolPriceBackGroundColor,
                    poolPriceTextColor,
                    tick,
                    undefined,
                    yAxisCanvasWidth,
                    tickSubString,
                    isTradeDollarizationEnabled,
                );
            }
            if (location.pathname.includes('/limit')) {
                const { isSameLocation, sameLocationData } =
                    sameLocationLimit();

                const { tick, tickSubString } = prepareTickLabel(limit);

                createRectLabel(
                    context,
                    isSameLocation ? sameLocationData : yScale(limit),
                    X,
                    labelBackgroundColor,
                    labelTextColor,
                    tick,
                    undefined,
                    yAxisCanvasWidth,
                    tickSubString,
                    isTradeDollarizationEnabled,
                );

                addYaxisLabel(
                    isSameLocation ? sameLocationData : yScale(limit),
                );
            }

            if (
                location.pathname.includes('pool') ||
                location.pathname.includes('reposition')
            ) {
                const {
                    isSameLocationMin: isSameLocationMin,
                    sameLocationDataMin: sameLocationDataMin,
                    isSameLocationMax: isSameLocationMax,
                    sameLocationDataMax: sameLocationDataMax,
                } = sameLocationRange();

                if (
                    (simpleRangeWidth !== 100 || advancedMode) &&
                    !(low === 0 && high === 0)
                ) {
                    const { tick: lowTick, tickSubString: lowTickSubString } =
                        prepareTickLabel(low);

                    createRectLabel(
                        context,
                        isSameLocationMin ? sameLocationDataMin : yScale(low),
                        X,
                        labelBackgroundColor,
                        labelTextColor,
                        lowTick,
                        undefined,
                        yAxisCanvasWidth,
                        lowTickSubString,
                        isTradeDollarizationEnabled,
                    );
                    addYaxisLabel(
                        isSameLocationMin ? sameLocationDataMin : yScale(low),
                    );

                    const { tick: highTick, tickSubString: highTickSubString } =
                        prepareTickLabel(high);

                    createRectLabel(
                        context,
                        isSameLocationMax ? sameLocationDataMax : yScale(high),
                        X,
                        labelBackgroundColor,
                        labelTextColor,
                        highTick,
                        undefined,
                        yAxisCanvasWidth,
                        highTickSubString,
                        isTradeDollarizationEnabled,
                    );
                    addYaxisLabel(
                        isSameLocationMax ? sameLocationDataMax : yScale(high),
                    );
                }
            }

            if (selectedDrawnShape) {
                const shapeData = selectedDrawnShape.data;

                shapeData.data.forEach((data) => {
                    const shapeDataWithDenom =
                        data.denomInBase === denomInBase ? data.y : 1 / data.y;

                    const {
                        tick: shapePoint,
                        tickSubString: shapePointSubString,
                    } = prepareTickLabel(shapeDataWithDenom);

                    const secondPointInDenom =
                        shapeData.data[1].denomInBase === denomInBase
                            ? shapeData.data[1].y
                            : 1 / shapeData.data[1].y;
                    const firstPointInDenom =
                        shapeData.data[0].denomInBase === denomInBase
                            ? shapeData.data[0].y
                            : 1 / shapeData.data[0].y;

                    const rectHeight =
                        yScale(secondPointInDenom) - yScale(firstPointInDenom);

                    const style = getComputedStyle(canvas);
                    const downCandleBodyColor =
                        style.getPropertyValue('--accent1');

                    const d3LightFillColor = d3.color(downCandleBodyColor);

                    if (d3LightFillColor) d3LightFillColor.opacity = 0.075;

                    context.fillStyle = d3LightFillColor
                        ? d3LightFillColor.toString()
                        : 'rgba(115, 113, 252, 0.075)';

                    context.fillRect(
                        0,
                        yScale(firstPointInDenom),
                        width,
                        rectHeight,
                    );

                    createRectLabel(
                        context,
                        yScale(shapeDataWithDenom),
                        X,
                        downCandleBodyColor
                            ? downCandleBodyColor
                            : 'rgba(115, 113, 252, 1)',
                        ['futa'].includes(platformName)
                            ? 'black'
                            : 'rgb(214, 214, 214)',
                        shapePoint,
                        undefined,
                        yAxisCanvasWidth,
                        shapePointSubString,
                        isTradeDollarizationEnabled,
                    );
                });
            }

            if (crosshairActive === 'chart' && !isUpdatingShape) {
                const crosshairYValue = Number(crosshairData[0].y.toString());
                const { tick: crosshairY, tickSubString: crSubString } =
                    prepareTickLabel(crosshairYValue);

                createRectLabel(
                    context,
                    yScale(crosshairYValue),
                    X,
                    '#242F3F',
                    labelTextColor,
                    crosshairY,
                    undefined,
                    yAxisCanvasWidth,
                    crSubString,
                    isTradeDollarizationEnabled,
                );
            }

            changeyAxisWidth();
        }
    };

    useEffect(() => {
        if (!isChartZoom) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let previousTouch: any | undefined = undefined; // event
            const canvas = d3
                .select(d3Yaxis.current)
                .select('canvas')
                .node() as HTMLCanvasElement;

            const rectCanvas = canvas.getBoundingClientRect();
            let firstLocation: number;
            let newCenter: number;
            let previousDeltaTouchYaxis: number;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const startZoom = (event: any) => {
                if (event.sourceEvent.type.includes('touch') && scaleData) {
                    // mobile
                    previousTouch = event.sourceEvent.changedTouches[0];
                    firstLocation = previousTouch.pageY - rectCanvas.top;
                    newCenter = scaleData?.yScale.invert(firstLocation);

                    if (event.sourceEvent.touches.length > 1) {
                        previousDeltaTouchYaxis = Math.hypot(
                            0,
                            event.sourceEvent.touches[0].pageY -
                                event.sourceEvent.touches[1].pageY,
                        );
                        firstLocation = previousDeltaTouchYaxis;
                        newCenter = scaleData?.yScale.invert(firstLocation);
                    }
                } else {
                    firstLocation = event.sourceEvent.offsetY;
                }
            };

            const yAxisZoom = d3
                .zoom()
                .on('start', (event) => {
                    startZoom(event);
                })
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .on('zoom', async (event: any) => {
                    (async () => {
                        if (scaleData) {
                            const domainY = scaleData?.yScale.domain();
                            const center =
                                domainY[1] !== domainY[0]
                                    ? (domainY[1] + domainY[0]) / 2
                                    : domainY[0] / 2;
                            let deltaY;

                            if (event.sourceEvent.type === 'touchmove') {
                                const touch =
                                    event.sourceEvent.changedTouches[0];

                                const _currentPageY = touch.pageY;
                                const previousTouchPageY = previousTouch.pageY;
                                const _movementY =
                                    _currentPageY - previousTouchPageY;
                                deltaY = _movementY;
                            } else {
                                deltaY = event.sourceEvent.movementY / 1.5;
                                newCenter =
                                    scaleData?.yScale.invert(firstLocation);
                            }

                            const dy = event.sourceEvent.deltaY / 3;

                            const factor = Math.pow(
                                2,
                                event.sourceEvent.type === 'wheel'
                                    ? -dy * 0.003
                                    : event.sourceEvent.type === 'mousemove'
                                      ? -deltaY * 0.003
                                      : event.sourceEvent.type === 'touchmove'
                                        ? -deltaY * 0.005
                                        : 1,
                            );

                            if (
                                event.sourceEvent.type !== 'touchmove' ||
                                event.sourceEvent.touches.length === 1
                            ) {
                                const size = (domainY[1] - domainY[0]) / factor;

                                const diff = domainY[1] - domainY[0];

                                const distance =
                                    newCenter > center
                                        ? Math.abs(
                                              newCenter -
                                                  scaleData?.yScale.domain()[1],
                                          )
                                        : Math.abs(
                                              newCenter -
                                                  scaleData?.yScale.domain()[0],
                                          );
                                const diffFactor = (diff - distance) / distance;

                                const bottomDiff = size / (diffFactor + 1);
                                const topDiff = size - bottomDiff;

                                if (newCenter > center) {
                                    const domain = [
                                        newCenter - topDiff,
                                        newCenter + bottomDiff,
                                    ];
                                    scaleData?.yScale.domain(domain);
                                } else {
                                    const domain = [
                                        newCenter - bottomDiff,
                                        newCenter + topDiff,
                                    ];
                                    scaleData?.yScale.domain(domain);
                                }
                            } else if (event.sourceEvent.touches.length > 1) {
                                const touch1 = event.sourceEvent.touches[0];
                                const touch2 = event.sourceEvent.touches[1];
                                const deltaTouch = Math.hypot(
                                    0,
                                    touch1.pageY - touch2.pageY,
                                );

                                const currentDelta =
                                    scaleData?.yScale.invert(deltaTouch);
                                const delta =
                                    Math.abs(currentDelta - newCenter) * 0.03;

                                if (previousDeltaTouchYaxis > deltaTouch) {
                                    const domainMax =
                                        scaleData?.yScale.domain()[1] + delta;
                                    const domainMin =
                                        scaleData?.yScale.domain()[0] - delta;

                                    scaleData?.yScale.domain([
                                        Math.min(domainMin, domainMax),
                                        Math.max(domainMin, domainMax),
                                    ]);
                                }
                                if (previousDeltaTouchYaxis < deltaTouch) {
                                    const domainMax =
                                        scaleData?.yScale.domain()[1] -
                                        delta * 0.5;
                                    const domainMin =
                                        scaleData?.yScale.domain()[0] +
                                        delta * 0.5;

                                    if (domainMax === domainMin) {
                                        scaleData?.yScale.domain([
                                            Math.min(domainMin, domainMax) +
                                                delta,
                                            Math.max(domainMin, domainMax) -
                                                delta,
                                        ]);
                                    } else {
                                        scaleData?.yScale.domain([
                                            Math.min(domainMin, domainMax),
                                            Math.max(domainMin, domainMax),
                                        ]);
                                    }
                                }
                            }
                        }
                    })().then(() => {
                        if (event.sourceEvent.type.includes('touch')) {
                            // mobile
                            previousTouch = event.sourceEvent.changedTouches[0];

                            if (event.sourceEvent.touches.length > 1) {
                                previousDeltaTouchYaxis = Math.hypot(
                                    0,
                                    event.sourceEvent.touches[0].pageY -
                                        event.sourceEvent.touches[1].pageY,
                                );
                            }
                        }
                    });

                    setRescale(() => {
                        return false;
                    });

                    render();
                })
                .filter((event) => {
                    const isWheel = event.type === 'wheel';
                    const { offsetY } = getXandYLocationForChart(
                        event,
                        rectCanvas,
                    );

                    const isLabel =
                        yAxisLabels?.find((element: yLabel) => {
                            if (offsetY !== undefined) {
                                return (
                                    offsetY > element?.y &&
                                    offsetY < element?.y + element?.height
                                );
                            }
                            return false;
                        }) !== undefined;

                    return !isLabel || isWheel;
                });

            setYaxisZoom(() => {
                return yAxisZoom;
            });
        }
    }, [
        diffHashSigScaleData(scaleData, 'y'),
        liquidityData?.liqBidData,
        isChartZoom,
        isLineDrag,
    ]);

    useEffect(() => {
        if (yAxis && yAxisZoom && d3Yaxis.current) {
            d3.select<Element, unknown>(d3Yaxis.current)
                .call(yAxisZoom)
                .on('dblclick.zoom', null);

            if (location.pathname.includes('market')) {
                d3.select(d3Yaxis.current).on('.drag', null);
            }
            if (
                (location.pathname.includes('pool') ||
                    location.pathname.includes('reposition')) &&
                !isLineDrag
            ) {
                d3.select(d3Yaxis.current).call(dragRange);
            }
            if (location.pathname.includes('/limit') && !isLineDrag) {
                d3.select(d3Yaxis.current).call(dragLimit);
            }
            renderCanvasArray([d3Yaxis]);
        }
    }, [
        location.pathname,
        yAxisZoom,
        dragLimit,
        dragRange,
        d3.select('#range-line-canvas')?.node(),
        d3.select('#limit-line-canvas')?.node(),
    ]);

    // Axis's
    useEffect(() => {
        if (scaleData) {
            const d3YaxisCanvas = d3
                .select(d3Yaxis.current)
                .select('canvas')
                .node() as HTMLCanvasElement;

            const d3YaxisContext = d3YaxisCanvas.getContext(
                '2d',
            ) as CanvasRenderingContext2D;

            d3.select(d3Yaxis.current).on('draw', function () {
                if (yAxis && scaleData) {
                    setCanvasResolution(d3YaxisCanvas);
                    drawYaxis(
                        d3YaxisContext,
                        scaleData?.yScale,
                        d3YaxisCanvas.width / (2 * window.devicePixelRatio),
                    );
                }
            });

            renderCanvasArray([d3Yaxis]);
            renderSubchartCrCanvas();
        }
    }, [
        chartPoolPrice,
        diffHashSig(crosshairData),
        limit,
        isLineDrag,
        ranges,
        isAmbientOrAdvanced,
        yAxisCanvasWidth,
        reset,
        sellOrderStyle,
        location,
        crosshairActive,
        selectedDrawnShape,
        isUpdatingShape,
        getDollarPrice,
    ]);

    function addYaxisLabel(y: number) {
        const rect = {
            x: 0,
            y: y - 10,
            width: 70,
            height: 20,
        };
        yAxisLabels?.push(rect);
    }

    useEffect(() => {
        d3.select(d3Yaxis.current).on(
            'mousemove',
            (event: MouseEvent<HTMLDivElement>) => {
                d3.select(event.currentTarget).style('cursor', 'row-resize');
            },
        );
        d3.select(d3Yaxis.current).on('mouseover', () => {
            setCrosshairActive('none');
        });
    }, [denomInBase, liqMode, location.pathname, advancedMode]);

    return (
        <d3fc-canvas
            className='y-axis-canvas'
            id='y-axis-canvas'
            ref={d3Yaxis}
            style={{
                width: yAxisWidth,
                gridColumn: 2,
                gridRowStart: 1,
                gridRowEnd: 4,
            }}
        ></d3fc-canvas>
    );
}

export default memo(YAxisCanvas);
