import * as d3 from 'd3';
import { Dispatch, RefObject, SetStateAction } from 'react';

import {
    getPinnedPriceValuesFromDisplayPrices,
    getPinnedPriceValuesFromTicks,
    getPinnedTickFromDisplayPrice,
} from '../../../../ambient-utils/dataLayer';
import {
    getXandYLocationForChartDrag,
    lineValue,
    liquidityChartData,
    roundToNearestPreset,
    scaleData,
} from './chartUtils';

type DragBehavior = d3.DragBehavior<
    d3.DraggedElementBaseType,
    unknown,
    d3.SubjectPosition
>;

interface RangeDragDeps {
    scaleData: scaleData;
    d3CanvasMain: RefObject<HTMLDivElement | null>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filterDragEvent: (event: any, leftPositin: number) => boolean;
    ranges: lineValue[];
    liquidityData: liquidityChartData | undefined;
    currentPoolPriceTick: number | undefined;
    poolPriceDisplay: number | undefined;
    advancedMode: boolean;
    location: { pathname: string };
    isDenomBase: boolean;
    baseTokenDecimals: number;
    quoteTokenDecimals: number;
    gridSize: number;
    denomInBase: boolean;
    setCrosshairActive: Dispatch<SetStateAction<string>>;
    setIsLineDrag: Dispatch<SetStateAction<boolean>>;
    setRanges: Dispatch<SetStateAction<lineValue[]>>;
    setSimpleRangeWidth: Dispatch<SetStateAction<number>>;
    onBlurRange: (
        range: lineValue[],
        highLineMoved: boolean,
        lowLineMoved: boolean,
        isLinesSwitched: boolean,
    ) => void;
}

interface LimitDragDeps {
    scaleData: scaleData;
    d3CanvasMain: RefObject<HTMLDivElement | null>;
    d3Container: RefObject<HTMLDivElement | null>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filterDragEvent: (event: any, leftPositin: number) => boolean;
    limit: number;
    setIsLineDrag: Dispatch<SetStateAction<boolean>>;
    setCrosshairActive: Dispatch<SetStateAction<string>>;
    calculateLimit: (newLimitValue: number) => number;
    setLimit: Dispatch<SetStateAction<number>>;
    onBlurLimitRate: (limitPreviousData: number, newLimitValue: number) => void;
}

/**
 * Builds the d3 `.drag()` behavior for the range (Min/Max) lines. Extracted
 * verbatim from the `dragRange` `useEffect` in `Chart.tsx`; the `useEffect`
 * wrapper (the `if (scaleData)` guard + `setDragRange`) stays in the component
 * so React semantics are unchanged. Live values are threaded in via `deps` at
 * effect-execution time, preserving the original closure behavior. The
 * `document.addEventListener/removeEventListener('keydown', cancelDragEvent)`
 * pairing is preserved.
 */
export function createRangeDragBehavior(deps: RangeDragDeps): DragBehavior {
    const {
        scaleData,
        d3CanvasMain,
        filterDragEvent,
        ranges,
        liquidityData,
        currentPoolPriceTick,
        poolPriceDisplay,
        advancedMode,
        location,
        isDenomBase,
        baseTokenDecimals,
        quoteTokenDecimals,
        gridSize,
        denomInBase,
        setCrosshairActive,
        setIsLineDrag,
        setRanges,
        setSimpleRangeWidth,
        onBlurRange,
    } = deps;

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
            const { offsetY } = getXandYLocationForChartDrag(event, rectCanvas);

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
                    poolPriceDisplay !== undefined ? poolPriceDisplay : 0;

                const low = ranges.filter(
                    (target: lineValue) => target.name === 'Min',
                )[0].value;
                const high = ranges.filter(
                    (target: lineValue) => target.name === 'Max',
                )[0].value;

                const lineToBeSet = draggedValue > displayValue ? 'Max' : 'Min';

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let pinnedDisplayPrices: any;

                if (!advancedMode || location.pathname.includes('reposition')) {
                    if (
                        draggedValue === 0 ||
                        draggedValue === liquidityData?.topBoundary
                    ) {
                        const minValue =
                            draggedValue === 0
                                ? 0
                                : draggedValue < liquidityData?.lowBoundary
                                  ? draggedValue
                                  : 0;

                        setRanges((prevState) => {
                            const newTargets = [...prevState];

                            newTargets.filter(
                                (target: lineValue) => target.name === 'Min',
                            )[0].value = minValue;

                            newTargets.filter(
                                (target: lineValue) => target.name === 'Max',
                            )[0].value = liquidityData?.topBoundary;

                            newRangeValue = newTargets;

                            return newTargets;
                        });
                    } else {
                        if (lineToBeSet === 'Max') {
                            const pinnedTick = getPinnedTickFromDisplayPrice(
                                isDenomBase,
                                baseTokenDecimals,
                                quoteTokenDecimals,
                                false, // isMinPrice
                                draggedValue.toString(),
                                gridSize,
                            );

                            rangeWidthPercentage = roundToNearestPreset(
                                Math.abs(pinnedTick - currentPoolPriceTick) /
                                    100,
                            );

                            const offset = rangeWidthPercentage * 100;

                            const lowTick = currentPoolPriceTick - offset;
                            const highTick = currentPoolPriceTick + offset;

                            pinnedDisplayPrices = getPinnedPriceValuesFromTicks(
                                denomInBase,
                                baseTokenDecimals,
                                quoteTokenDecimals,
                                lowTick,
                                highTick,
                                gridSize,
                            );
                        } else {
                            const pinnedTick = getPinnedTickFromDisplayPrice(
                                isDenomBase,
                                baseTokenDecimals,
                                quoteTokenDecimals,
                                true, // isMinPrice
                                draggedValue.toString(),
                                gridSize,
                            );

                            rangeWidthPercentage = roundToNearestPreset(
                                Math.abs(currentPoolPriceTick - pinnedTick) /
                                    100,
                            );

                            const offset = rangeWidthPercentage * 100;

                            const lowTick = currentPoolPriceTick - offset;
                            const highTick = currentPoolPriceTick + offset;

                            pinnedDisplayPrices = getPinnedPriceValuesFromTicks(
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
                    const advancedValue = scaleData?.yScale.invert(offsetY);
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
                                )[0].value = pinnedMaxPriceDisplayTruncated;

                                dragSwitched = true;
                                highLineMoved = false;
                                lowLineMoved = true;
                            } else {
                                newTargets.filter(
                                    (target: lineValue) =>
                                        target.name === 'Max',
                                )[0].value = pinnedMaxPriceDisplayTruncated;
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
                                )[0].value = pinnedMinPriceDisplayTruncated;

                                dragSwitched = true;
                                highLineMoved = true;
                                lowLineMoved = false;
                            } else {
                                newTargets.filter(
                                    (target: lineValue) =>
                                        target.name === 'Min',
                                )[0].value = pinnedMinPriceDisplayTruncated;
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

            document.removeEventListener('keydown', cancelDragEvent);
        });

    return dragRange;
}

/**
 * Builds the d3 `.drag()` behavior for the limit line. Extracted verbatim from
 * the `dragLimit` `useEffect` in `Chart.tsx`; the `useEffect` wrapper
 * (`setDragLimit`) stays in the component so React semantics are unchanged.
 * Live values are threaded in via `deps` at effect-execution time, preserving
 * the original closure behavior. The keydown cancel listener pairing is
 * preserved.
 */
export function createLimitDragBehavior(deps: LimitDragDeps): DragBehavior {
    const {
        scaleData,
        d3CanvasMain,
        d3Container,
        filterDragEvent,
        limit,
        setIsLineDrag,
        setCrosshairActive,
        calculateLimit,
        setLimit,
        onBlurLimitRate,
    } = deps;

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
                        event.sourceEvent.touches[0].clientY - rectCanvas?.top;

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
                            scaleData?.yScale(tempNewLimitValue) + movementY,
                        );

                        // Perform calculations based on the new limit value
                        if (tempNewLimitValue) {
                            newLimitValue = calculateLimit(tempNewLimitValue);
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
                        event.sourceEvent.touches[0].clientY - rectCanvas?.top;
                }
            });
        })
        .on('end', () => {
            tempMovementY = 0;
            setIsLineDrag(false);
            // If the drag is not canceled
            if (!cancelDrag) {
                // Change the cursor to 'row-resize'
                d3.select(d3Container.current).style('cursor', 'row-resize');
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

            document.removeEventListener('keydown', cancelDragEvent);
        });

    return dragLimit;
}
