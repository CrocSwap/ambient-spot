import * as d3 from 'd3';

import { getPinnedPriceValuesFromTicks } from '../../../../ambient-utils/dataLayer';
import { CandleDataChart, lineValue, scaleData } from './chartUtils';

interface UseChartScaleArgs {
    scaleData: scaleData | undefined;
    unparsedCandleData: CandleDataChart[];
    visibleCandleData: CandleDataChart[];
    poolPriceWithoutDenom: number | undefined;
    denomInBase: boolean;
    isDenomBase: boolean;
    rescale: boolean | undefined;
    chartPoolPrice: number;
    poolPriceDisplay: number;
    limit: number;
    minTickForLimit: number;
    maxTickForLimit: number;
    currentPoolPriceTick: number | undefined;
    minPrice: number;
    maxPrice: number;
    simpleRangeWidth: number;
    advancedMode: boolean;
    ranges: lineValue[];
    baseTokenDecimals: number;
    quoteTokenDecimals: number;
    gridSize: number;
    locationPathname: string;
    render: () => void;
}

/**
 * Encapsulates the Y-axis auto-scaling logic for the chart. The returned
 * functions mirror the previous inline implementations exactly (including the
 * in-place mutation of `ranges` and the direct `scaleData.yScale.domain`
 * updates) so that runtime behavior is unchanged; the goal is purely to move
 * this cohesive ~260-line block out of the `Chart` component body.
 */
export function useChartScale(args: UseChartScaleArgs) {
    const {
        scaleData,
        unparsedCandleData,
        visibleCandleData,
        poolPriceWithoutDenom,
        denomInBase,
        isDenomBase,
        rescale,
        chartPoolPrice,
        poolPriceDisplay,
        limit,
        minTickForLimit,
        maxTickForLimit,
        currentPoolPriceTick,
        minPrice,
        maxPrice,
        simpleRangeWidth,
        advancedMode,
        ranges,
        baseTokenDecimals,
        quoteTokenDecimals,
        gridSize,
        locationPathname,
        render,
    } = args;

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
        if (locationPathname.includes('limit')) {
            changeScaleLimit(isTriggeredByZoom);
        } else if (
            locationPathname.includes('pool') ||
            locationPathname.includes('reposition')
        ) {
            changeScaleRangeOrReposition(isTriggeredByZoom);
        } else {
            changeScaleSwap(isTriggeredByZoom);
        }
    }

    return {
        getYAxisBoundary,
        setYaxisDomain,
        changeScale,
        changeScaleSwap,
        changeScaleLimit,
        changeScaleRangeOrReposition,
    };
}
