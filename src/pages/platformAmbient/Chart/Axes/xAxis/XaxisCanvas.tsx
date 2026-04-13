import * as d3 from 'd3';
import * as d3fc from 'd3fc';
import moment from 'moment';
import { memo, MutableRefObject, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    diffHashSig,
    diffHashSigScaleData,
} from '../../../../../ambient-utils/dataLayer';
import { CandleDataIF } from '../../../../../ambient-utils/types';
import { CandleContext } from '../../../../../contexts/CandleContext';
import { xAxisHeightPixel } from '../../ChartUtils/chartConstants';
import {
    crosshair,
    isIOS,
    renderCanvasArray,
    scaleData,
    selectedDrawnData,
    setCanvasResolution,
    timeGapsValue,
} from '../../ChartUtils/chartUtils';
import { correctStyleForData, xAxisTick } from './calculateXaxisTicks';
interface xAxisIF {
    scaleData: scaleData | undefined;
    period: number;
    crosshairActive: string;
    crosshairData: Array<crosshair>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mouseLeaveCanvas: any;
    reset: boolean | undefined;
    isLineDrag: boolean | undefined;
    setXaxisActiveTooltip: React.Dispatch<React.SetStateAction<string>>;
    setCrosshairActive: React.Dispatch<React.SetStateAction<string>>;
    firstCandleData: CandleDataIF;
    lastCandleData: CandleDataIF;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    changeScale: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showLatestActive: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zoomBase: any;
    isChartZoom: boolean;
    isToolbarOpen: boolean;
    selectedDrawnShape: selectedDrawnData | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    d3Xaxis: MutableRefObject<any>;
    isUpdatingShape: boolean;
    timeGaps: timeGapsValue[];
    isDiscontinuityScaleEnabled: boolean;
    bandwidth: number;
}

function XAxisCanvas(props: xAxisIF) {
    const {
        scaleData,
        period,
        crosshairActive,
        crosshairData,
        reset,
        isLineDrag,
        setCrosshairActive,
        mouseLeaveCanvas,
        setXaxisActiveTooltip,
        firstCandleData,
        lastCandleData,
        changeScale,
        render,
        showLatestActive,
        zoomBase,
        isChartZoom,
        isToolbarOpen,
        selectedDrawnShape,
        d3Xaxis,
        isUpdatingShape,
        timeGaps,
        isDiscontinuityScaleEnabled,
        bandwidth,
    } = props;

    const { timeOfEndCandle } = useContext(CandleContext);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [xAxis, setXaxis] = useState<any>();
    const [xAxisZoom, setXaxisZoom] =
        useState<d3.ZoomBehavior<Element, unknown>>();

    const utcDiff = moment().utcOffset();
    const utcDiffHours = Math.floor(utcDiff / 60);

    const location = useLocation();

    useEffect(() => {
        if (scaleData) {
            const _xAxis = d3fc.axisBottom().scale(scaleData?.xScale);

            setXaxis(() => {
                return _xAxis;
            });
        }
    }, [scaleData, location]);

    const formatDateTicks = (value: Date | number, type: string) => {
        let formatValue = undefined;

        if (type === 'tick') {
            if (moment(value).format('HH:mm') === '00:00' || period === 86400) {
                formatValue = moment(value).format('DD');
            } else {
                formatValue = moment(value).format('HH:mm');
            }

            if (
                moment(value)
                    .format('DD')
                    .match(/^(01)$/) &&
                moment(value).format('HH:mm') === '00:00'
            ) {
                formatValue =
                    moment(value).format('MMM') === 'Jan'
                        ? moment(value).format('YYYY')
                        : moment(value).format('MMM');
            }
        }

        if (type === 'cr') {
            if (period === 86400) {
                formatValue = moment(value)
                    .subtract(utcDiffHours, 'hours')
                    .format('MMM DD YYYY');
            } else {
                formatValue = moment(value).format('MMM DD HH:mm');
            }
        }

        return formatValue;
    };

    const filterClosePoints = (
        data: xAxisTick[],
        threshold: number,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        xScale: any,
    ) => {
        const filteredData = [data[0]];
        for (let i = 1; i < data.length; i++) {
            const currentDataLocation = xScale(data[i].date);
            const previousDataLocation = xScale(data[i - 1].date);
            const nextDataLocation = xScale(data[i + 1]?.date);

            const currentStyle = data[i].style;
            const nextStyle = data[i + 1]?.style;
            const checkPrevData =
                Math.abs(currentDataLocation - previousDataLocation) >
                threshold;
            const checkNextData =
                Math.abs(currentDataLocation - nextDataLocation) > threshold;

            if (checkPrevData && checkNextData) {
                filteredData.push(data[i]);
            } else if (checkPrevData && !checkNextData) {
                if (!currentStyle && nextStyle) {
                    filteredData.push(data[i + 1]);
                } else {
                    filteredData.push(data[i]);
                }
            }
        }
        return filteredData;
    };

    const drawXaxis = (
        context: CanvasRenderingContext2D,
        xScale: d3.ScaleLinear<number, number>,
        Y: number,
    ) => {
        if (scaleData) {
            const _width = 65; // magic number of pixels to blur surrounding price
            const tickSize = 6;

            const timeOfEndCandleLocation = timeOfEndCandle
                ? xScale(timeOfEndCandle)
                : undefined;

            scaleData.xScaleTime.domain(xScale.domain());

            const canvas = d3
                .select(d3Xaxis.current)
                .select('canvas')
                .node() as HTMLCanvasElement;

            if (canvas !== null) {
                const rectCanvas = canvas.getBoundingClientRect();

                const width = rectCanvas.width;
                const height = rectCanvas.height;

                const factor = width / (width < 500 ? 75 : 100);

                const ticks = scaleData?.xScaleTime.ticks(factor);

                let data = correctStyleForData(
                    scaleData?.xScale.domain()[0],
                    scaleData?.xScale.domain()[1],
                    timeGaps.length > 0
                        ? [
                              ...ticks,
                              new Date(),
                              new Date(
                                  scaleData?.xScale.domain()[1] -
                                      period * 5 * 1000,
                              ),
                          ]
                        : ticks,
                );

                if (isDiscontinuityScaleEnabled) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    data = data.map((itemA: any) => {
                        const dateTimestamp = new Date(itemA.date).getTime();
                        for (const gap of timeGaps) {
                            const startRange = gap.range[0];
                            const endRange = gap.range[1];
                            if (
                                dateTimestamp >= startRange &&
                                dateTimestamp <= endRange &&
                                !itemA.style
                            ) {
                                return {
                                    ...itemA,
                                    date: new Date(endRange),
                                };
                            }
                        }
                        return itemA;
                    });
                }

                const filteredData = filterClosePoints(data, 35, xScale);

                filteredData.forEach((d: xAxisTick) => {
                    if (d.date instanceof Date) {
                        context.textAlign = 'center';
                        context.textBaseline = 'top';
                        context.fillStyle = 'rgba(240, 240, 248, 0.8)';
                        context.font =
                            width < 500
                                ? '250 11.5px Lexend Deca'
                                : '50 11.5px Lexend Deca';
                        context.filter = ' blur(0px)';

                        const formatValue = formatDateTicks(d.date, 'tick');

                        if (
                            crosshairActive !== 'none' &&
                            xScale(d.date) >
                                xScale(crosshairData[0].x) - _width &&
                            xScale(d.date) <
                                xScale(crosshairData[0].x) + _width &&
                            d.date !== crosshairData[0].x
                        ) {
                            context.filter = 'blur(7px)';
                            if (isIOS() && width < 500) {
                                return;
                            }
                        }

                        if (d.style) {
                            context.font = '900 12px Lexend Deca';
                        }

                        context.beginPath();

                        if (
                            !(
                                timeOfEndCandleLocation &&
                                xScale(d.date) >
                                    timeOfEndCandleLocation - _width / 2 &&
                                xScale(d.date) <
                                    timeOfEndCandleLocation + _width / 2
                            )
                        ) {
                            if (formatValue) {
                                if (!d.style) {
                                    context.fillText(
                                        formatValue,
                                        xScale(d.date.getTime()),
                                        Y + tickSize,
                                    );
                                } else {
                                    context.fillText(
                                        formatValue,
                                        xScale(d.date.getTime()),
                                        Y + tickSize,
                                    );
                                }
                            }
                        }
                        context.restore();
                    }
                });

                const dateCrosshair = formatDateTicks(crosshairData[0].x, 'cr');
                context.filter = ' blur(0px)';

                context.font = '800 13px Lexend Deca';

                context.beginPath();

                if (
                    dateCrosshair &&
                    crosshairActive !== 'none' &&
                    !isUpdatingShape
                ) {
                    context.fillText(
                        dateCrosshair,
                        xScale(crosshairData[0].x),
                        Y + tickSize,
                    );
                }

                if (timeOfEndCandle && timeOfEndCandleLocation) {
                    context.filter = ' blur(0px)';

                    if (
                        xScale(crosshairData[0].x) >
                            timeOfEndCandleLocation - (_width - 15) &&
                        xScale(crosshairData[0].x) <
                            timeOfEndCandleLocation + (_width - 15) &&
                        crosshairActive !== 'none'
                    ) {
                        context.filter = ' blur(7px)';
                    }
                    context.fillText(
                        '🥚',
                        timeOfEndCandleLocation,
                        Y + tickSize,
                    );
                }

                if (selectedDrawnShape) {
                    context.filter = ' blur(0px)';

                    const shapeData = selectedDrawnShape.data;

                    const linearScale = scaleData.drawingLinearxScale;

                    const rectWidth =
                        linearScale(shapeData.data[1].x) -
                        linearScale(shapeData.data[0].x);

                    const style = getComputedStyle(canvas);

                    const downCandleBodyColor =
                        style.getPropertyValue('--accent1');

                    const d3LightFillColor = d3.color(downCandleBodyColor);

                    if (d3LightFillColor) d3LightFillColor.opacity = 0.075;

                    context.fillStyle = d3LightFillColor
                        ? d3LightFillColor.toString()
                        : 'rgba(115, 113, 252, 0.1)';

                    context.fillRect(
                        linearScale(shapeData.data[0].x),
                        height * 0.175,
                        rectWidth,
                        height * 0.65,
                    );

                    shapeData.data.forEach((data) => {
                        const shapePoint = linearScale(data.x);
                        const point = formatDateTicks(data.x, 'cr');

                        if (point) {
                            if (
                                xScale(crosshairData[0].x) >
                                    shapePoint - (_width - 15) &&
                                xScale(crosshairData[0].x) <
                                    shapePoint + (_width - 15) &&
                                crosshairActive !== 'none' &&
                                !isUpdatingShape
                            ) {
                                context.filter = ' blur(7px)';
                                context.fillText(
                                    point,
                                    shapePoint,
                                    height * 0.5375,
                                );
                            } else {
                                const textWidth =
                                    context.measureText(point).width + 10;

                                context.fillStyle = downCandleBodyColor
                                    ? downCandleBodyColor
                                    : 'rgba(115, 113, 252, 1)';

                                context.fillRect(
                                    shapePoint - textWidth / 2,
                                    height * 0.175,
                                    textWidth,
                                    height * 0.65,
                                );
                                context.fillStyle = 'rgb(214, 214, 214)';
                                context.font = '800 13px Lexend Deca';
                                context.textAlign = 'center';
                                context.textBaseline = 'middle';
                                context.fillText(
                                    point,
                                    shapePoint,
                                    height * 0.5375,
                                );
                            }
                        }
                    });
                }

                context.restore();
            }
        }
    };

    // Axis's
    useEffect(() => {
        if (scaleData) {
            const canvas = d3
                .select(d3Xaxis.current)
                .select('canvas')
                .node() as HTMLCanvasElement;
            const context = canvas.getContext('2d') as CanvasRenderingContext2D;

            d3.select(d3Xaxis.current).on('draw', function () {
                if (xAxis && scaleData) {
                    setCanvasResolution(canvas);
                    drawXaxis(context, scaleData?.xScale, 3);
                }
            });

            renderCanvasArray([d3Xaxis]);
        }
    }, [
        timeOfEndCandle,
        diffHashSig(crosshairData),
        isLineDrag,
        reset,
        location,
        crosshairActive,
        xAxis === undefined,
        isToolbarOpen,
        selectedDrawnShape,
    ]);

    useEffect(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        d3.select(d3Xaxis.current).on('mousemove', (event: MouseEvent) => {
            d3.select(d3Xaxis.current).style('cursor', 'col-resize');
            if (scaleData) {
                const mouseLocation = event.offsetX;

                const isEgg =
                    timeOfEndCandle &&
                    mouseLocation > scaleData?.xScale(timeOfEndCandle) - 15 &&
                    mouseLocation < scaleData?.xScale(timeOfEndCandle) + 15;

                if (isEgg) {
                    d3.select(d3Xaxis.current).style('cursor', 'default');
                    setXaxisActiveTooltip('egg');
                } else {
                    setXaxisActiveTooltip('');
                }

                setCrosshairActive('none');
            }
        });
    }, [timeOfEndCandle]);

    // mouseleave
    useEffect(() => {
        d3.select(d3Xaxis.current).on('mouseleave', () => {
            mouseLeaveCanvas();
        });
    }, []);

    useEffect(() => {
        if (!isChartZoom) {
            const lastCandleDate = lastCandleData?.time * 1000;
            const firstCandleDate = firstCandleData?.time * 1000;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let previousTouch: any | undefined = undefined; // event

            const xAxisZoom = d3
                .zoom()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .on('start', (event: any) => {
                    if (event.sourceEvent.type.includes('touch')) {
                        // mobile
                        previousTouch = event.sourceEvent.touches[0];
                    }
                })
                .on('zoom', async (event) => {
                    async function newDomains() {
                        if (scaleData) {
                            if (event.sourceEvent.type === 'wheel') {
                                zoomBase.zoomWithWheel(
                                    event.sourceEvent,
                                    scaleData,
                                    firstCandleDate,
                                    lastCandleDate,
                                );
                            } else {
                                zoomBase.handlePanningX(
                                    event.sourceEvent,
                                    scaleData,
                                    firstCandleDate,
                                    previousTouch,
                                    bandwidth,
                                );
                            }
                            changeScale(true);
                            render();
                        }
                    }

                    newDomains().then(() => {
                        // mobile
                        if (event.sourceEvent.type.includes('touch')) {
                            previousTouch = event.sourceEvent.changedTouches[0];
                        }
                    });
                })
                .on('end', () => {
                    showLatestActive();
                });

            setXaxisZoom(() => {
                return xAxisZoom;
            });
        }
    }, [
        diffHashSigScaleData(scaleData),
        firstCandleData,
        lastCandleData,
        isChartZoom,
    ]);

    useEffect(() => {
        if (xAxis && xAxisZoom && d3Xaxis.current) {
            d3.select<Element, unknown>(d3Xaxis.current)
                .call(xAxisZoom)
                .on('dblclick.zoom', null);

            renderCanvasArray([d3Xaxis]);
        }
    }, [xAxisZoom]);

    return (
        <d3fc-canvas
            ref={d3Xaxis}
            id='x-axis'
            className='x-axis'
            style={{
                height: xAxisHeightPixel + 'px',
                width: '100%',
                marginTop: 'auto',
            }}
        ></d3fc-canvas>
    );
}
export default memo(XAxisCanvas);
