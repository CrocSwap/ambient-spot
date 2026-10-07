/* eslint-disable @typescript-eslint/no-explicit-any */
import * as d3 from 'd3';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    diffHashSig,
    diffHashSigScaleData,
} from '../../../../../ambient-utils/dataLayer';
import { CandleDataIF } from '../../../../../ambient-utils/types';
import { AppStateContext } from '../../../../../contexts';
import { CandleContext } from '../../../../../contexts/CandleContext';
import { TradeDataContext } from '../../../../../contexts/TradeDataContext';
import { formatDollarAmountAxis } from '../../../../../utils/numbers';
import {
    CandleDataChart,
    bandLineData,
    calculateFibRetracement,
    calculateFibRetracementBandAreas,
    clipCanvas,
    crosshair,
    drawDataHistory,
    drawnShapeEditAttributes,
    findSnapTime,
    formatTimeDifference,
    getCandleCount,
    lineData,
    renderCanvasArray,
    scaleData,
    selectedDrawnData,
    setCanvasResolution,
} from '../../ChartUtils/chartUtils';
import { createCircle } from '../../ChartUtils/circle';
import { fibDefaultLevels } from '../../ChartUtils/drawConstants';
import useDollarPrice from '../../ChartUtils/getDollarPrice';
import {
    createArrowPointsOfDPRangeLine,
    createBandArea,
    createPointsOfBandLine,
    createPointsOfDPRangeLine,
} from './BandArea';
import {
    createAnnotationLineSeries,
    createLinearLineSeries,
} from './LinearLineSeries';

interface DrawCanvasProps {
    scaleData: scaleData;
    setDrawnShapeHistory: React.Dispatch<
        React.SetStateAction<drawDataHistory[]>
    >;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setCrossHairDataFunc: any;
    activeDrawingType: string;
    setActiveDrawingType: React.Dispatch<React.SetStateAction<string>>;
    setSelectedDrawnShape: React.Dispatch<
        React.SetStateAction<selectedDrawnData | undefined>
    >;
    denomInBase: boolean;
    addDrawActionStack: (
        item: drawDataHistory,
        isNewShape: boolean,
        type: string,
    ) => void;
    period: number;
    crosshairData: crosshair[];
    snapForCandle: (
        point: number,
        filtered: Array<CandleDataIF>,
    ) => CandleDataIF;
    visibleCandleData: CandleDataChart[];
    zoomBase: any;
    setIsChartZoom: React.Dispatch<React.SetStateAction<boolean>>;
    isChartZoom: boolean;
    firstCandleData: any;
    lastCandleData: any;
    render: any;
    isMagnetActive: { value: boolean };
    drawSettings: any;
    quoteTokenDecimals: number;
    baseTokenDecimals: number;
    setIsUpdatingShape: React.Dispatch<React.SetStateAction<boolean>>;
    bandwidth: number;
}

function DrawCanvas(props: DrawCanvasProps) {
    const d3DrawCanvas = useRef<HTMLDivElement | null>(null);
    const [lineData, setLineData] = useState<lineData[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [bandArea, setBandArea] = useState<any>();
    const {
        scaleData,
        setDrawnShapeHistory,
        setCrossHairDataFunc,
        activeDrawingType,
        setActiveDrawingType,
        setSelectedDrawnShape,
        denomInBase,
        addDrawActionStack,
        snapForCandle,
        visibleCandleData,
        zoomBase,
        setIsChartZoom,
        isChartZoom,
        firstCandleData,
        lastCandleData,
        render,
        isMagnetActive,
        drawSettings,
        quoteTokenDecimals,
        baseTokenDecimals,
        period,
        setIsUpdatingShape,
    } = props;

    const {
        activeNetwork: { poolIndex },
    } = useContext(AppStateContext);

    const { isCondensedModeEnabled } = useContext(CandleContext);

    const circleSeries = createCircle(
        scaleData?.drawingLinearxScale,
        scaleData?.yScale,
        50,
        1,
        denomInBase,
    );
    const [lineSeries, setLineSeries] = useState<any>();
    const [annotationLineSeries, setAnnotationLineSeries] = useState<any>();
    const [borderLineSeries, setBorderLineSeries] = useState<any>();

    const currentPool = useContext(TradeDataContext);
    const getDollarPrice = useDollarPrice();

    function createScaleForBandArea(x: number, x2: number) {
        const newXScale = scaleData?.drawingLinearxScale.copy();

        newXScale.range([
            scaleData?.drawingLinearxScale(x),
            scaleData?.drawingLinearxScale(x2),
        ]);

        return newXScale;
    }

    useEffect(() => {
        if (scaleData) {
            const lineSeries = createLinearLineSeries(
                scaleData?.drawingLinearxScale,
                scaleData?.yScale,
                denomInBase,
                drawSettings[activeDrawingType].line,
            );
            setLineSeries(() => lineSeries);

            const borderLineSeries = createLinearLineSeries(
                scaleData?.drawingLinearxScale,
                scaleData?.yScale,
                denomInBase,
                drawSettings[activeDrawingType].border,
            );

            setBorderLineSeries(() => borderLineSeries);

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
    }, [scaleData, denomInBase, diffHashSig(drawSettings), activeDrawingType]);

    useEffect(() => {
        if (scaleData !== undefined && !isChartZoom) {
            let wheellTimeout: NodeJS.Timeout | null = null; // Declare wheellTimeout
            const lastCandleDate = lastCandleData?.time * 1000;
            const firstCandleDate = firstCandleData?.time * 1000;
            d3.select(d3DrawCanvas.current).on(
                'wheel',
                function (event) {
                    if (wheellTimeout === null) {
                        setIsChartZoom(true);
                    }

                    zoomBase.zoomWithWheel(
                        event,
                        scaleData,
                        firstCandleDate,
                        lastCandleDate,
                    );
                    render();

                    if (wheellTimeout) {
                        clearTimeout(wheellTimeout);
                    }
                    // check wheel end
                    wheellTimeout = setTimeout(() => {
                        setIsChartZoom(false);
                    }, 200);
                },
                { passive: true },
            );
        }
    }, [diffHashSigScaleData(scaleData, 'x'), isChartZoom]);

    function getXandYvalueOfDrawnShape(offsetX: number, offsetY: number) {
        let valueY = scaleData?.yScale.invert(offsetY);

        if (isMagnetActive.value) {
            const nearest = snapForCandle(offsetX, visibleCandleData);

            if (nearest) {
                const high = denomInBase
                    ? nearest?.invMinPriceExclMEVDecimalCorrected
                    : nearest?.minPriceExclMEVDecimalCorrected;

                const low = denomInBase
                    ? nearest?.invMaxPriceExclMEVDecimalCorrected
                    : nearest?.maxPriceExclMEVDecimalCorrected;

                const open = denomInBase
                    ? nearest.invPriceOpenExclMEVDecimalCorrected
                    : nearest.priceOpenExclMEVDecimalCorrected;

                const close = denomInBase
                    ? nearest.invPriceCloseExclMEVDecimalCorrected
                    : nearest.priceCloseExclMEVDecimalCorrected;

                const highToCoordinat = scaleData.yScale(high);
                const lowToCoordinat = scaleData.yScale(low);
                const openToCoordinat = scaleData.yScale(open);
                const closeToCoordinat = scaleData.yScale(close);

                const highDiff = Math.abs(offsetY - highToCoordinat);
                const lowDiff = Math.abs(offsetY - lowToCoordinat);
                const openDiff = Math.abs(offsetY - openToCoordinat);
                const closeDiff = Math.abs(offsetY - closeToCoordinat);

                if (
                    highDiff <= 100 ||
                    lowDiff <= 100 ||
                    openDiff <= 100 ||
                    closeDiff <= 100
                ) {
                    const minDiffForYValue = Math.min(
                        openDiff,
                        closeDiff,
                        lowDiff,
                        highDiff,
                    );

                    switch (minDiffForYValue) {
                        case highDiff:
                            valueY = high;
                            break;

                        case lowDiff:
                            valueY = low;
                            break;
                        case openDiff:
                            valueY = open;
                            break;

                        case closeDiff:
                            valueY = close;
                            break;
                    }
                }
            }
        }

        const snappedTime = findSnapTime(
            scaleData?.drawingLinearxScale.invert(offsetX),
            period,
        );

        const valueX = snappedTime;

        return { valueX: valueX, valueY: valueY };
    }

    useEffect(() => {
        const canvas = d3
            .select(d3DrawCanvas.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const canvasRect = canvas.getBoundingClientRect();

        const threshold = 15;
        let cancelDraw = false;
        let isDrawing = false;
        const tempLineData: lineData[] = [];
        const localDrawSettings = drawSettings
            ? drawSettings[activeDrawingType]
            : drawSettings['defaultShapeAttributes'];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cancelDrawEvent = (event: any) => {
            if (event.key === 'Escape') {
                cancelDraw = true;
                event.preventDefault();
                event.stopPropagation();
                document.removeEventListener('keydown', cancelDrawEvent);
            }
        };

        d3.select(d3DrawCanvas.current).on(
            'touchstart',
            (event: TouchEvent) => {
                const clientX = event.targetTouches[0].clientX;
                const clientY = event.targetTouches[0].clientY;
                startDrawing(clientX, clientY);
            },
            { passive: true },
        );

        d3.select(d3DrawCanvas.current).on(
            'touchmove',
            (event: TouchEvent) => {
                const clientX = event.targetTouches[0].clientX;
                const clientY = event.targetTouches[0].clientY;
                draw(clientX, clientY);
            },
            { passive: true },
        );

        d3.select(d3DrawCanvas.current).on(
            'mousemove',
            (event: MouseEvent) => {
                draw(event.clientX, event.clientY);
            },
            { passive: true },
        );

        d3.select(d3DrawCanvas.current).on(
            'mousedown',
            (event: MouseEvent) => {
                document.addEventListener('keydown', cancelDrawEvent);

                startDrawing(event.clientX, event.clientY);
            },
            { passive: true },
        );

        const pointerUpHandler = (event: PointerEvent) => {
            endDrawing(event.clientX, event.clientY);
        };

        canvas.addEventListener('pointerup', pointerUpHandler);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function startDrawing(mouseX: number, mouseY: number) {
            isDrawing = true;
            setIsUpdatingShape(true);
            const offsetY = mouseY - canvasRect?.top;
            const offsetX = mouseX - canvasRect?.left;

            const { valueX, valueY } = getXandYvalueOfDrawnShape(
                offsetX,
                offsetY,
            );

            if (valueY > 0) {
                if (tempLineData.length > 0 || activeDrawingType === 'Ray') {
                    endDrawing(mouseX, mouseY);
                } else {
                    tempLineData.push({
                        x: valueX,
                        y: valueY,
                        denomInBase: denomInBase,
                    });
                }

                setLineData(tempLineData);
                renderCanvasArray([d3DrawCanvas]);
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function endDrawing(mouseX: number, mouseY: number) {
            if (!cancelDraw) {
                let endDraw = false;
                const offsetY = mouseY - canvasRect?.top;
                const offsetX = mouseX - canvasRect?.left;

                const { valueX, valueY } = getXandYvalueOfDrawnShape(
                    offsetX,
                    offsetY,
                );

                if (activeDrawingType !== 'Ray') {
                    const firstValueX = scaleData?.drawingLinearxScale(
                        tempLineData[0].x,
                    );
                    const firstValueY = scaleData?.yScale(tempLineData[0].y);

                    const checkThreshold = Math.hypot(
                        offsetX - firstValueX,
                        offsetY - firstValueY,
                    );

                    endDraw = checkThreshold > threshold;
                }

                if (endDraw || activeDrawingType === 'Ray') {
                    if (activeDrawingType === 'Ray') {
                        tempLineData[0] = {
                            x: valueX,
                            y: valueY,
                            denomInBase: denomInBase,
                        };
                    }

                    tempLineData[1] = {
                        x: valueX,
                        y: valueY,
                        denomInBase: denomInBase,
                    };

                    isDrawing = false;
                    setIsUpdatingShape(false);

                    setActiveDrawingType('Cross');

                    const endPoint = {
                        data: tempLineData,
                        type: activeDrawingType,
                        time: Date.now(),
                        pool: {
                            poolIndex: poolIndex,
                            tokenA: currentPool.tokenA.address,
                            tokenB: currentPool.tokenB.address,
                            isTokenABase: currentPool.isTokenABase,
                            denomInBase: currentPool.isDenomBase,
                        },
                        extendLeft: localDrawSettings.extendLeft,
                        extendRight: localDrawSettings.extendRight,
                        labelPlacement: localDrawSettings.labelPlacement,
                        labelAlignment: localDrawSettings.labelAlignment,
                        reverse: localDrawSettings.reverse,
                        line: {
                            active: localDrawSettings.line.active,
                            color: localDrawSettings.line.color,
                            lineWidth: localDrawSettings.line.lineWidth,
                            dash: localDrawSettings.line.dash,
                        } as drawnShapeEditAttributes,

                        border: {
                            active: localDrawSettings.border.active,
                            color: localDrawSettings.border.color,
                            lineWidth: localDrawSettings.border.lineWidth,
                            dash: localDrawSettings.border.dash,
                        } as drawnShapeEditAttributes,

                        background: {
                            active: localDrawSettings.background.active,
                            color: localDrawSettings.background.color,
                            lineWidth: localDrawSettings.background.lineWidth,
                            dash: localDrawSettings.background.dash,
                        } as drawnShapeEditAttributes,

                        extraData: structuredClone(localDrawSettings.extraData),
                    };

                    setDrawnShapeHistory((prevData: drawDataHistory[]) => {
                        if (tempLineData.length > 0) {
                            endPoint.time = Date.now();
                            setSelectedDrawnShape({
                                data: endPoint,
                                selectedCircle: undefined,
                            });

                            return [...prevData, endPoint];
                        }
                        return prevData;
                    });
                    addDrawActionStack(endPoint, true, 'create');
                }
            } else {
                setActiveDrawingType('Cross');
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function draw(mouseX: number, mouseY: number) {
            if (!cancelDraw) {
                const offsetY = mouseY - canvasRect?.top;
                const offsetX = mouseX - canvasRect?.left;

                const { valueX, valueY } = getXandYvalueOfDrawnShape(
                    offsetX,
                    offsetY,
                );

                setCrossHairDataFunc(valueX / 1000, offsetX, offsetY);

                if (!isDrawing || activeDrawingType === 'Ray') return;

                if (valueY > 0) {
                    const newBandScale = createScaleForBandArea(
                        tempLineData[0].x,
                        scaleData.drawingLinearxScale.invert(offsetX),
                    );

                    const bandArea = createBandArea(
                        newBandScale,
                        scaleData?.yScale,
                        denomInBase,
                        drawSettings[activeDrawingType],
                    );

                    setBandArea(() => bandArea);

                    if (tempLineData.length === 1) {
                        tempLineData.push({
                            x: valueX,
                            y: valueY,
                            denomInBase: denomInBase,
                        });
                    } else {
                        tempLineData[1] = {
                            x: valueX,
                            y: valueY,
                            denomInBase: denomInBase,
                        };
                    }

                    setSelectedDrawnShape({
                        data: {
                            data: tempLineData,
                            type: activeDrawingType,
                            time: Date.now(),
                            extendLeft: false,
                            extendRight: false,
                            labelPlacement: 'Left',
                            labelAlignment: 'Middle',
                            reverse: false,
                            pool: {
                                poolIndex: poolIndex,
                                tokenA: currentPool.tokenA.address,
                                tokenB: currentPool.tokenB.address,
                                isTokenABase: currentPool.isTokenABase,
                                denomInBase: currentPool.isDenomBase,
                            },

                            line: {
                                active: !['Rect'].includes(activeDrawingType),
                                color: 'rgba(115, 113, 252, 1)',
                                lineWidth: 1.5,
                                dash:
                                    activeDrawingType === 'FibRetracement'
                                        ? [6, 6]
                                        : [0, 0],
                            } as drawnShapeEditAttributes,

                            border: {
                                active: ['Rect'].includes(activeDrawingType),
                                color: 'rgba(115, 113, 252, 1)',
                                lineWidth: 1.5,
                                dash: [0, 0],
                            } as drawnShapeEditAttributes,

                            background: {
                                active: ['Rect', 'DPRange'].includes(
                                    activeDrawingType,
                                ),
                                color: 'rgba(115, 113, 252, 0.15)',
                                lineWidth: 1.5,
                                dash: [0, 0],
                            } as drawnShapeEditAttributes,
                            extraData: ['FibRetracement'].includes(
                                activeDrawingType,
                            )
                                ? structuredClone(fibDefaultLevels)
                                : [],
                        },
                        selectedCircle: undefined,
                    });
                }
            } else {
                setSelectedDrawnShape(undefined);
                setLineData([]);
            }

            renderCanvasArray([d3DrawCanvas]);
        }

        return () => {
            canvas.removeEventListener('pointerup', pointerUpHandler);
        };
    }, [activeDrawingType, JSON.stringify(drawSettings)]);

    // Draw
    useEffect(() => {
        const canvas = d3
            .select(d3DrawCanvas.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        if (
            lineSeries &&
            scaleData &&
            (activeDrawingType === 'Brush' || activeDrawingType === 'Angle')
        ) {
            d3.select(d3DrawCanvas.current)
                .on('draw', () => {
                    setCanvasResolution(canvas);
                    lineSeries(lineData);
                    circleSeries(lineData);

                    if (activeDrawingType === 'Angle' && lineData.length > 0) {
                        if (lineData.length > 1) {
                            const opposite = Math.abs(
                                scaleData.yScale(lineData[0].y) -
                                    scaleData.yScale(lineData[1].y),
                            );
                            const side = Math.abs(
                                scaleData.drawingLinearxScale(lineData[0].x) -
                                    scaleData.drawingLinearxScale(
                                        lineData[1].x,
                                    ),
                            );

                            const distance = opposite / side;

                            const minAngleLineLength =
                                side / 4 > 80
                                    ? Math.abs(lineData[0].x - lineData[1].x) /
                                      4
                                    : scaleData.drawingLinearxScale.invert(
                                          scaleData.drawingLinearxScale(
                                              lineData[0].x,
                                          ) + 80,
                                      ) - lineData[0].x;

                            const minAngleTextLength =
                                lineData[0].x +
                                minAngleLineLength +
                                scaleData.drawingLinearxScale.invert(
                                    scaleData.drawingLinearxScale(
                                        lineData[0].x,
                                    ) + 20,
                                ) -
                                lineData[0].x;

                            const angleLineData = [
                                {
                                    x: lineData[0].x,
                                    y: lineData[0].y,
                                    denomInBase: lineData[0].denomInBase,
                                },
                                {
                                    x: lineData[0].x + minAngleLineLength,
                                    y: lineData[0].y,
                                    denomInBase: lineData[0].denomInBase,
                                },
                            ];

                            const angle = Math.atan(distance) * (180 / Math.PI);

                            const supplement =
                                lineData[1].x > lineData[0].x
                                    ? -Math.atan(distance)
                                    : Math.PI + Math.atan(distance);

                            const arcX =
                                lineData[1].y > lineData[0].y ? supplement : 0;
                            const arcY =
                                lineData[1].y > lineData[0].y ? 0 : -supplement;

                            const radius =
                                scaleData.drawingLinearxScale(
                                    lineData[0].x + minAngleLineLength,
                                ) -
                                scaleData.drawingLinearxScale(lineData[0].x);

                            if (ctx) {
                                ctx.setLineDash([5, 3]);
                                lineSeries(angleLineData);

                                ctx.beginPath();
                                ctx.arc(
                                    scaleData.drawingLinearxScale(
                                        lineData[0].x,
                                    ),
                                    scaleData.yScale(lineData[0].y),
                                    radius,
                                    arcX,
                                    arcY,
                                );
                                ctx.stroke();

                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillStyle = 'white';
                                ctx.font = '50 12px Lexend Deca';

                                const angleDisplay =
                                    lineData[1].x > lineData[0].x
                                        ? angle
                                        : 180 - angle;

                                ctx.fillText(
                                    (lineData[1].y > lineData[0].y ? '' : '-') +
                                        angleDisplay.toFixed(0).toString() +
                                        'º',
                                    scaleData.drawingLinearxScale(
                                        minAngleTextLength,
                                    ),
                                    scaleData.yScale(lineData[0].y),
                                );

                                ctx.closePath();
                            }
                        }
                    }
                })
                .on('measure', (event: CustomEvent) => {
                    lineSeries.context(ctx);
                    circleSeries.context(ctx);
                    scaleData?.yScale.range([event.detail.height, 0]);
                });
        }
    }, [diffHashSig(lineData), lineSeries, denomInBase]);

    useEffect(() => {
        const canvas = d3
            .select(d3DrawCanvas.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        const canvasRect = canvas.getBoundingClientRect();

        if (
            scaleData &&
            lineData.length > 1 &&
            (activeDrawingType === 'Rect' || activeDrawingType === 'DPRange')
        ) {
            d3.select(d3DrawCanvas.current)
                .on('draw', () => {
                    setCanvasResolution(canvas);

                    const bandData = {
                        fromValue: lineData[0].y,
                        toValue: lineData[1].y,
                        denomInBase: denomInBase,
                    } as bandLineData;

                    const range = [
                        scaleData?.drawingLinearxScale(lineData[0].x),
                        scaleData?.drawingLinearxScale(lineData[1].x),
                    ];

                    bandArea.xScale().range(range);

                    bandArea && bandArea([bandData]);

                    if (activeDrawingType === 'Rect') {
                        const lineOfBand = createPointsOfBandLine(lineData);

                        lineOfBand?.forEach((item) => {
                            borderLineSeries(item);
                            circleSeries(item);
                        });
                        if (drawSettings[activeDrawingType].line.active) {
                            lineSeries(lineData);
                        }
                    }

                    if (activeDrawingType === 'DPRange') {
                        const lineOfBand = createPointsOfDPRangeLine(
                            lineData,
                            scaleData.drawingLinearxScale,
                        );

                        if (drawSettings[activeDrawingType].border.active) {
                            const lineOfBand = createPointsOfBandLine(lineData);

                            lineOfBand?.forEach((line) => {
                                borderLineSeries(line);
                            });
                        }
                        lineOfBand?.forEach((item) => {
                            lineSeries(item);
                        });
                        circleSeries(lineData);

                        const height = Math.abs(
                            scaleData.yScale(lineData[0].y) -
                                scaleData.yScale(lineData[1].y),
                        );
                        const width = Math.abs(
                            scaleData.drawingLinearxScale(lineData[0].x) -
                                scaleData.drawingLinearxScale(lineData[1].x),
                        );

                        const firstPointYAxisData =
                            lineData[0].denomInBase === denomInBase
                                ? lineData[0].y
                                : 1 / lineData[0].y;
                        const secondPointYAxisData =
                            lineData[1].denomInBase === denomInBase
                                ? lineData[1].y
                                : 1 / lineData[1].y;

                        const filtered = visibleCandleData.filter(
                            (data: CandleDataIF) =>
                                data.time * 1000 >=
                                    Math.min(lineData[0].x, lineData[1].x) &&
                                data.time * 1000 <=
                                    Math.max(lineData[0].x, lineData[1].x),
                        );

                        const totalVolumeCovered = filtered.reduce(
                            (sum, obj) => sum + obj.volumeUSD,
                            0,
                        );

                        // const lengthAsBars = Math.abs(
                        //     lineData[0].x - lineData[1].x,
                        // );

                        const lengthAsDate =
                            (lineData[0].x > lineData[1].x ? '-' : '') +
                            formatTimeDifference(
                                new Date(
                                    Math.min(lineData[1].x, lineData[0].x),
                                ),
                                new Date(
                                    Math.max(lineData[1].x, lineData[0].x),
                                ),
                            );

                        const heightAsPrice =
                            secondPointYAxisData - firstPointYAxisData;

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

                        const infoLabelXAxisData =
                            Math.min(lineData[0].x, lineData[1].x) +
                            Math.abs(lineData[0].x - lineData[1].x) / 2;

                        const infoLabelYAxisData =
                            scaleData.yScale(secondPointYAxisData) +
                            (secondPointYAxisData > firstPointYAxisData
                                ? -(infoLabelHeight + 15)
                                : 15);

                        const dpRangeLabelYPlacement =
                            scaleData.yScale(firstPointYAxisData) < 0
                                ? infoLabelYAxisData
                                : scaleData.yScale(firstPointYAxisData) < 463
                                  ? infoLabelYAxisData + infoLabelHeight >
                                    canvasRect.height
                                      ? canvasRect.height - infoLabelHeight - 5
                                      : Math.max(infoLabelYAxisData, 5)
                                  : infoLabelYAxisData;

                        if (ctx) {
                            const arrowArray = createArrowPointsOfDPRangeLine(
                                lineData,
                                scaleData,
                                denomInBase,
                                height > 30 && width > 30 ? 10 : 5,
                            );

                            arrowArray.forEach((arrow) => {
                                lineSeries(arrow);
                            });

                            ctx.beginPath();
                            ctx.fillStyle = 'rgb(34,44,58)';
                            ctx.fillRect(
                                scaleData.drawingLinearxScale(
                                    infoLabelXAxisData,
                                ) -
                                    infoLabelWidth / 2,
                                dpRangeLabelYPlacement,
                                infoLabelWidth,
                                infoLabelHeight,
                            );
                            ctx.fillStyle = 'rgba(210,210,210,1)';
                            ctx.font = '13.5px Lexend Deca';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';

                            const maxPrice =
                                secondPointYAxisData *
                                Math.pow(
                                    10,
                                    baseTokenDecimals - quoteTokenDecimals,
                                );

                            const minPrice =
                                firstPointYAxisData *
                                Math.pow(
                                    10,
                                    baseTokenDecimals - quoteTokenDecimals,
                                );

                            const dpRangeTickPrice =
                                maxPrice && minPrice
                                    ? Math.floor(
                                          Math.log(maxPrice) / Math.log(1.0001),
                                      ) -
                                      Math.floor(
                                          Math.log(minPrice) / Math.log(1.0001),
                                      )
                                    : 0;

                            ctx.fillText(
                                getDollarPrice(heightAsPrice).formattedValue +
                                    ' ' +
                                    ' (' +
                                    heightAsPercentage.toString() +
                                    '%)  ' +
                                    dpRangeTickPrice,
                                scaleData.drawingLinearxScale(
                                    infoLabelXAxisData,
                                ),
                                dpRangeLabelYPlacement + 16,
                            );

                            const min = Math.min(lineData[0].x, lineData[1].x);
                            const max = Math.max(lineData[0].x, lineData[1].x);
                            const showCandleCount = getCandleCount(
                                scaleData.drawingLinearxScale,
                                visibleCandleData,
                                [min, max],
                                period,
                                isCondensedModeEnabled,
                            );

                            ctx.fillText(
                                showCandleCount + ' bars,  ' + lengthAsDate,
                                scaleData.drawingLinearxScale(
                                    infoLabelXAxisData,
                                ),
                                dpRangeLabelYPlacement + 33,
                            );
                            ctx.fillText(
                                'Vol ' +
                                    formatDollarAmountAxis(
                                        totalVolumeCovered,
                                    ).replace('$', ''),
                                scaleData.drawingLinearxScale(
                                    infoLabelXAxisData,
                                ),
                                dpRangeLabelYPlacement + 50,
                            );
                        }
                    }
                })
                .on('measure', (event: CustomEvent) => {
                    bandArea && bandArea.context(ctx);
                    lineSeries.context(ctx);
                    borderLineSeries.context(ctx);
                    circleSeries.context(ctx);
                    scaleData?.yScale.range([event.detail.height, 0]);
                });
        }
    }, [
        diffHashSig(lineData),
        denomInBase,
        bandArea,
        borderLineSeries,
        lineSeries,
    ]);

    useEffect(() => {
        const canvas = d3
            .select(d3DrawCanvas.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        const canvasRect = canvas.getBoundingClientRect();

        const localDrawSettings = drawSettings
            ? drawSettings[activeDrawingType]
            : drawSettings['defaultShapeAttributes'];
        if (
            scaleData &&
            lineData.length > 1 &&
            activeDrawingType === 'FibRetracement'
        ) {
            d3.select(d3DrawCanvas.current)
                .on('draw', () => {
                    setCanvasResolution(canvas);
                    const data = structuredClone(lineData);

                    if (localDrawSettings.reverse) {
                        [data[0], data[1]] = [data[1], data[0]];
                    }

                    const range = [
                        localDrawSettings.extendLeft
                            ? scaleData.drawingLinearxScale.range()[0]
                            : scaleData?.drawingLinearxScale(data[0].x),
                        localDrawSettings.extendRight
                            ? scaleData.drawingLinearxScale.range()[1]
                            : scaleData?.drawingLinearxScale(data[1].x),
                    ];

                    annotationLineSeries.xScale().range(range);
                    bandArea.xScale().range(range);

                    if (localDrawSettings.line.active) {
                        lineSeries.decorate(
                            (context: CanvasRenderingContext2D) => {
                                context.strokeStyle =
                                    localDrawSettings.line.color;
                                context.lineWidth =
                                    localDrawSettings.line.lineWidth;
                                context.beginPath();
                                context.setLineDash(
                                    localDrawSettings.line.dash,
                                );
                                context.closePath();
                            },
                        );

                        lineSeries(data);
                    }

                    const fibLineData = calculateFibRetracement(
                        data,
                        localDrawSettings.extraData,
                        denomInBase,
                    );

                    const bandAreaData = calculateFibRetracementBandAreas(
                        data,
                        localDrawSettings.extraData,
                        denomInBase,
                    );

                    bandAreaData.forEach((bandData) => {
                        bandArea.decorate(
                            (context: CanvasRenderingContext2D) => {
                                context.fillStyle =
                                    bandData.areaColor.toString();
                            },
                        );

                        bandArea([bandData]);
                    });
                    fibLineData.forEach((lineData) => {
                        const lineLabel =
                            lineData[0].level +
                            ' (' +
                            lineData[0].y.toFixed(2).toString() +
                            ')';

                        const lineMeasures = ctx?.measureText(lineLabel);

                        if (
                            lineMeasures &&
                            (localDrawSettings.extendLeft ||
                                localDrawSettings.extendRight) &&
                            localDrawSettings.labelAlignment === 'Middle'
                        ) {
                            const bufferLeft =
                                localDrawSettings.extendLeft &&
                                localDrawSettings.labelPlacement === 'Left'
                                    ? lineMeasures.width + 15
                                    : 0;

                            const bufferRight =
                                canvasRect.width -
                                (localDrawSettings.extendRight &&
                                localDrawSettings.labelPlacement === 'Right'
                                    ? lineMeasures.width + 15
                                    : 0);

                            clipCanvas(
                                bufferLeft,
                                0,
                                bufferRight,
                                canvasRect.height,
                                canvas,
                            );
                        }

                        annotationLineSeries.decorate(
                            (context: CanvasRenderingContext2D) => {
                                context.strokeStyle =
                                    lineData[0].lineColor.toString();
                                context.lineWidth = 1.5;
                                context.beginPath();
                                context.setLineDash(
                                    drawSettings['drawnShapeDefaultDash'],
                                );
                                context.closePath();
                            },
                        );
                        annotationLineSeries(lineData);
                        ctx?.restore();

                        const textColor = lineData[0].lineColor;

                        let alignment;

                        if (localDrawSettings.extendLeft) {
                            alignment =
                                localDrawSettings.extendRight &&
                                localDrawSettings.labelPlacement === 'Right'
                                    ? 'right'
                                    : 'left';
                        } else if (
                            localDrawSettings.extendRight ||
                            localDrawSettings.labelPlacement === 'Left'
                        ) {
                            alignment = 'right';
                        } else {
                            alignment = 'left';
                        }

                        if (ctx && textColor) {
                            ctx.fillStyle = textColor?.toString();
                            ctx.font = '12px Lexend Deca';
                            ctx.textAlign = alignment as CanvasTextAlign;
                            ctx.textBaseline =
                                localDrawSettings.labelAlignment.toLowerCase() as CanvasTextBaseline;

                            let location;

                            if (localDrawSettings.extendLeft) {
                                location =
                                    localDrawSettings.labelPlacement === 'Left'
                                        ? scaleData.drawingLinearxScale.domain()[0]
                                        : localDrawSettings.extendRight
                                          ? scaleData.drawingLinearxScale.domain()[1]
                                          : Math.max(
                                                lineData[0].x,
                                                lineData[1].x,
                                            );
                            } else if (localDrawSettings.extendRight) {
                                location =
                                    localDrawSettings.labelPlacement === 'Left'
                                        ? Math.min(lineData[0].x, lineData[1].x)
                                        : scaleData.drawingLinearxScale.domain()[1];
                            } else {
                                location =
                                    localDrawSettings.labelPlacement === 'Left'
                                        ? Math.min(lineData[0].x, lineData[1].x)
                                        : Math.max(
                                              lineData[0].x,
                                              lineData[1].x,
                                          );
                            }

                            const linePlacement =
                                scaleData.drawingLinearxScale(location) +
                                (alignment === 'right' ? -10 : +10);

                            ctx.fillText(
                                lineLabel,
                                linePlacement,
                                scaleData.yScale(
                                    denomInBase === lineData[0].denomInBase
                                        ? lineData[0].y
                                        : 1 / lineData[0].y,
                                ) +
                                    (localDrawSettings.labelAlignment.toLowerCase() ===
                                    'top'
                                        ? 5
                                        : localDrawSettings.labelAlignment.toLowerCase() ===
                                            'bottom'
                                          ? -5
                                          : 0),
                            );
                        }
                    });
                })
                .on('measure', (event: CustomEvent) => {
                    bandArea && bandArea.context(ctx);
                    lineSeries.context(ctx);
                    annotationLineSeries.context(ctx);
                    circleSeries.context(ctx);
                    scaleData?.yScale.range([event.detail.height, 0]);
                });
        }
    }, [diffHashSig(lineData), denomInBase, bandArea]);

    useEffect(() => {
        const canvas = d3
            .select(d3DrawCanvas.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');

        if (scaleData && lineData.length > 1 && activeDrawingType === 'Ray') {
            d3.select(d3DrawCanvas.current)
                .on('draw', () => {
                    setCanvasResolution(canvas);

                    circleSeries([
                        {
                            denomInBase: lineData[0].denomInBase,
                            y: lineData[0].y,
                            x: lineData[0].x,
                        },
                    ]);
                })
                .on('measure', (event: CustomEvent) => {
                    circleSeries.context(ctx);
                    scaleData?.yScale.range([event.detail.height, 0]);
                });
        }
    }, [diffHashSig(lineData), denomInBase]);

    return <d3fc-canvas ref={d3DrawCanvas} />;
}

export default DrawCanvas;
