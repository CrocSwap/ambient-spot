import { drawDataHistory, lineData, scaleData } from './chartUtils';
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as d3 from 'd3';
import * as d3fc from 'd3fc';
import { ChartThemeIF } from '../../../../contexts/ChartContext';

export const selectedCircleSize = 80;

// const howeredCircleFillColor = 'wheat';

export function createCircle(
    xScale: any,
    yScale: any,
    size: number,
    lineWidth: number,
    denomInBase: boolean,
    isBuy: boolean | undefined = undefined,
    chartThemeColors?: ChartThemeIF,
) {
    return d3fc
        .seriesCanvasPoint()
        .xScale(xScale)
        .yScale(yScale)
        .crossValue((d: lineData) => d.x)
        .mainValue((d: lineData) =>
            denomInBase === d.denomInBase ? d.y : 1 / d.y,
        )
        .size(size)
        .type(d3.symbolCircle)
        .decorate((context: any) => {
            if (chartThemeColors) {
                const strokeColor = isBuy
                    ? chartThemeColors.upCandleBorderColor.copy()
                    : chartThemeColors.downCandleBorderColor.copy();

                const circleFillColor = isBuy
                    ? chartThemeColors.upCandleBodyColor.copy()
                    : chartThemeColors.downCandleBodyColor.copy();

                circleFillColor.opacity = 0.3;

                context.strokeStyle = strokeColor;
                context.fillStyle = circleFillColor;

                context.lineWidth = lineWidth;
            }
        });
}

export function checkCircleLocation(
    element: drawDataHistory,
    mouseX: number,
    mouseY: number,
    scaleData: scaleData,
    denomInBase: boolean,
) {
    const circleDiameter = Math.sqrt(selectedCircleSize / Math.PI);
    let result = undefined;

    const data = createCirclePoints(element, denomInBase);

    if (data && scaleData) {
        for (let i = 0; i < data.length; i++) {
            if (
                scaleData.xScale(data[i].x) < mouseX + circleDiameter &&
                scaleData.yScale(data[i].y) < mouseY + circleDiameter &&
                scaleData.xScale(data[i].x) > mouseX - circleDiameter &&
                scaleData.yScale(data[i].y) > mouseY - circleDiameter
            ) {
                result = data[i];
                break;
            }
        }
    }
    return result;
}

function createCirclePoints(element: drawDataHistory, denomInBase: boolean) {
    if (
        element.type === 'Brush' ||
        element.type === 'Angle' ||
        element.type === 'FibRetracement' ||
        element.type === 'DPRange'
    ) {
        const data: lineData[] = [];

        element.data.forEach((item) => {
            data.push({
                x: item.x,
                y: denomInBase === item.denomInBase ? item.y : 1 / item.y,
                denomInBase: item.denomInBase,
            } as lineData);
        });

        return data;
    }

    if (element.type === 'Rect') {
        const startX = element.data[0].x;
        const startY =
            element.data[0].denomInBase === denomInBase
                ? element.data[0].y
                : 1 / element.data[0].y;
        const endX = element.data[1].x;
        const endY =
            element.data[1].denomInBase === denomInBase
                ? element.data[1].y
                : 1 / element.data[1].y;

        const data: lineData[] = [
            { x: startX, y: startY, denomInBase: denomInBase },
            { x: startX, y: endY, denomInBase: denomInBase },
            { x: endX, y: startY, denomInBase: denomInBase },
            { x: endX, y: endY, denomInBase: denomInBase },
        ];

        return data;
    }

    if (element.type === 'Ray') {
        const data: lineData[] = [];

        data.push({
            x: element.data[1].x,
            y:
                denomInBase === element.data[1].denomInBase
                    ? element.data[1].y
                    : 1 / element.data[1].y,
            denomInBase: element.data[1].denomInBase,
        } as lineData);

        return data;
    }
}
