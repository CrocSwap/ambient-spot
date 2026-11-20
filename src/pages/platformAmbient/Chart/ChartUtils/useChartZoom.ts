import * as d3 from 'd3';
import { Dispatch, RefObject, SetStateAction } from 'react';

import { CandleDataIF } from '../../../../ambient-utils/types';
import {
    getXandYLocationForChart,
    lineValue,
    scaleData,
    selectedDrawnData,
} from './chartUtils';
import { Zoom } from './zoom';

interface ChartZoomDeps {
    scaleData: scaleData;
    zoomBase: Zoom;
    bandwidth: number;
    firstCandleDate: number;
    lastCandleDate: number;
    lastCandleData: CandleDataIF;
    rescale: boolean | undefined;
    isCondensedModeEnabled: boolean;
    contextmenu: boolean;
    tabletView: boolean;
    mobileView: boolean;
    limit: number;
    ranges: lineValue[];
    location: { pathname: string };
    canUserDragRange: boolean;
    canUserDragLimit: boolean;
    mainCanvasBoundingClientRect: DOMRect | undefined;
    d3CanvasMain: RefObject<HTMLDivElement | null>;
    render: () => void;
    changeScale: (isTriggeredByZoom: boolean) => void;
    setYaxisDomain: (minDomain: number, maxDomain: number) => void;
    showLatestActive: () => void;
    drawnShapesHoverStatus: (mouseX: number, mouseY: number) => void;
    candleOrVolumeDataHoverStatus: (
        mouseX: number,
        mouseY: number,
    ) => {
        isHoverCandleOrVolumeData: boolean;
        nearest: CandleDataIF | undefined;
    };
    selectedDateEvent: (
        isHoverCandleOrVolumeData: boolean,
        nearest: CandleDataIF | undefined,
    ) => void;
    setIsChartZoom: Dispatch<SetStateAction<boolean>>;
    setChartZoomEvent: Dispatch<SetStateAction<string>>;
    setContextmenu: Dispatch<SetStateAction<boolean>>;
    setCursorStyleTrigger: Dispatch<SetStateAction<boolean>>;
    setShouldResetBuffer: Dispatch<SetStateAction<boolean>>;
    setPrevLastCandleTime: Dispatch<SetStateAction<number>>;
    setContextMenuPlacement: Dispatch<
        SetStateAction<
            { top: number; left: number; isReversed: boolean } | undefined
        >
    >;
    setSelectedDrawnShape: Dispatch<
        SetStateAction<selectedDrawnData | undefined>
    >;
    setIsShowFloatingToolbar: Dispatch<SetStateAction<boolean>>;
    setShowTooltip: Dispatch<SetStateAction<boolean>>;
}

/**
 * Builds the main d3 zoom behavior for the chart. Extracted verbatim from the
 * large zoom `useEffect` in `Chart.tsx`; the `useEffect` wrapper (wheel
 * attachment, dependency array and `setMainZoom`) stays in the component so the
 * React semantics are unchanged. All live values are threaded in via `deps` at
 * effect-execution time, preserving the original closure behavior.
 */
export function createChartZoom(
    deps: ChartZoomDeps,
): d3.ZoomBehavior<Element, unknown> {
    const {
        scaleData,
        zoomBase,
        bandwidth,
        firstCandleDate,
        lastCandleDate,
        lastCandleData,
        rescale,
        isCondensedModeEnabled,
        contextmenu,
        tabletView,
        mobileView,
        limit,
        ranges,
        location,
        canUserDragRange,
        canUserDragLimit,
        mainCanvasBoundingClientRect,
        d3CanvasMain,
        render,
        changeScale,
        setYaxisDomain,
        showLatestActive,
        drawnShapesHoverStatus,
        candleOrVolumeDataHoverStatus,
        selectedDateEvent,
        setIsChartZoom,
        setChartZoomEvent,
        setContextmenu,
        setCursorStyleTrigger,
        setShouldResetBuffer,
        setPrevLastCandleTime,
        setContextMenuPlacement,
        setSelectedDrawnShape,
        setIsShowFloatingToolbar,
        setShowTooltip,
    } = deps;

    let clickedForLine = false;
    let zoomTimeout: number | undefined = undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let previousTouch: any | undefined = undefined; // event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let startTouch: any | undefined = undefined;
    let previousDeltaTouch: number | undefined = undefined;
    let previousDeltaTouchLocation: number | undefined = undefined;

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
            if (event.sourceEvent && event.sourceEvent.type !== 'dblclick') {
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
                                    event.sourceEvent.touches[0].pageX -
                                        event.sourceEvent.touches[1].pageX,
                                    event.sourceEvent.touches[0].pageY -
                                        event.sourceEvent.touches[1].pageY,
                                );

                                previousDeltaTouchLocation =
                                    event.sourceEvent.touches[0].pageX;
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
                        if (event.sourceEvent.type === 'touchmove') {
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
                    previousTouch = event.sourceEvent.changedTouches[0];
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
                    event.sourceEvent.timeStamp - zoomTimeout > 100 &&
                    startTouch.clientX ===
                        event.sourceEvent.changedTouches[0].clientX &&
                    startTouch.clientY ===
                        event.sourceEvent.changedTouches[0].clientY
                ) {
                    if (tabletView) {
                        setContextmenu(true);

                        const screenHeight = window.innerHeight;

                        const diff = screenHeight - startTouch.clientY;

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

                if (event.sourceEvent.type.includes('touch') && contextmenu) {
                    setContextmenu(false);
                }

                if (clickedForLine) {
                    // fires click event when zoom takes too short
                    if (
                        zoomTimeout &&
                        event.sourceEvent.timeStamp - zoomTimeout < 1
                    ) {
                        const { isHoverCandleOrVolumeData, nearest } =
                            candleOrVolumeDataHoverStatus(
                                event.sourceEvent.offsetX,
                                event.sourceEvent.offsetY,
                            );
                        selectedDateEvent(isHoverCandleOrVolumeData, nearest);
                    }
                }

                showLatestActive();

                setShowTooltip(true);
            }
        })
        .filter((event) => {
            if (tabletView && mainCanvasBoundingClientRect) {
                const { offsetX, offsetY } = getXandYLocationForChart(
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
                    event.targetTouches[0].clientY - rectCanvas?.top;

                const eventPointX =
                    event.targetTouches[0].clientX - rectCanvas.left;

                const mousePlacement = scaleData?.yScale.invert(eventPoint);

                const maxLiqPixelPercent = mobileView ? 80 / 100 : 92 / 100;
                const isHoverLiquidity =
                    rectCanvas.width * maxLiqPixelPercent >= eventPointX;

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

    return zoom;
}
