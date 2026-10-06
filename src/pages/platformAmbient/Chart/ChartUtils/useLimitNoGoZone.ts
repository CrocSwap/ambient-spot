import {
    fromDisplayPrice,
    pinTickLower,
    pinTickUpper,
    tickToPrice,
    toDisplayPrice,
} from '@crocswap-libs/sdk';
import { Dispatch, SetStateAction } from 'react';

interface UseLimitNoGoZoneArgs {
    poolPriceDisplay: number;
    sellOrderStyle: string;
    noGoZoneBoundaries: number[];
    baseTokenDecimals: number;
    quoteTokenDecimals: number;
    denomInBase: boolean;
    isDenomBase: boolean;
    isTokenABase: boolean;
    gridSize: number;
    limit: number;
    setMinTickForLimit: Dispatch<SetStateAction<number>>;
    setMaxTickForLimit: Dispatch<SetStateAction<number>>;
    setLimit: Dispatch<SetStateAction<number>>;
}

/**
 * Groups the limit-order "no-go zone" helpers that translate between display
 * prices and grid-aligned ticks while keeping the limit line out of the region
 * around the current pool price. Behavior is identical to the previous inline
 * implementations in `Chart.tsx`; this only relocates the cohesive block.
 */
export function useLimitNoGoZone(args: UseLimitNoGoZoneArgs) {
    const {
        poolPriceDisplay,
        sellOrderStyle,
        noGoZoneBoundaries,
        baseTokenDecimals,
        quoteTokenDecimals,
        denomInBase,
        isDenomBase,
        isTokenABase,
        gridSize,
        limit,
        setMinTickForLimit,
        setMaxTickForLimit,
        setLimit,
    } = args;

    /**
     * Determines whether moving the limit to `newLimitValue` crosses the
     * current pool price (which would require inverting the token pair).
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

    const getNoZoneData = () => {
        const noGoZoneMin = noGoZoneBoundaries[0];
        const noGoZoneMax = noGoZoneBoundaries[1];
        return { noGoZoneMin: noGoZoneMin, noGoZoneMax: noGoZoneMax };
    };

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

    return {
        reverseTokenForChart,
        getNoZoneData,
        setLimitTickNearNoGoZone,
        setLimitForNoGoZone,
        calculateLimit,
    };
}
