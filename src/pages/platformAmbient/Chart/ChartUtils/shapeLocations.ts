import * as d3 from 'd3';

import { distanceToLine } from '../Draw/DrawCanvas/LinearLineSeries';
import { calculateFibRetracement, lineData, scaleData } from './chartUtils';

interface ShapeLocationContext {
    scaleData: scaleData | undefined;
    denomInBase: boolean;
    circleScale: d3.ScaleLinear<number, number> | undefined;
}

/**
 * Builds the set of pure geometry "hit test" helpers used to determine whether
 * a pointer location intersects a drawn shape or an order-history glyph.
 *
 * These functions only depend on the current `scaleData`, `denomInBase` and
 * `circleScale`, so they are grouped into a single factory to keep `Chart.tsx`
 * focused on orchestration while preserving the exact runtime behavior and the
 * existing call-site signatures.
 */
export function createShapeLocationCheckers(ctx: ShapeLocationContext) {
    const { scaleData, denomInBase, circleScale } = ctx;

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

    return {
        checkLineLocation,
        checkRectLocation,
        checkRayLineLocation,
        checkSwapLoation,
        checkFibonacciLocation,
    };
}
