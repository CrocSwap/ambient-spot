import * as d3 from 'd3';
import * as d3fc from 'd3fc';
import { LiquidityRangeIF } from '../../../../../ambient-utils/types';
import { ChartThemeIF } from '../../../../../contexts/ChartContext';
import { LiquidityDataLocal } from '../../../Trade/TradeCharts/TradeCharts';

export function getActiveLiqDepth(
    data: LiquidityRangeIF,
    type: 'depth' | 'curve',
    isDenomBase: boolean,
) {
    if (type === 'curve') {
        return data.activeLiq;
    } else {
        if (isDenomBase) {
            return data.cumBidLiq ? data.cumBidLiq : data.cumAskLiq;
        }
        return data.cumAskLiq ? data.cumAskLiq : data.cumBidLiq;
    }
}

export const getAskPriceValue = (
    data: LiquidityRangeIF,
    isDenomBase: boolean,
) => {
    if (isDenomBase) {
        return data.lowerBoundInvPriceDecimalCorrected;
    } else {
        return data.upperBoundPriceDecimalCorrected;
    }
};

export const getBidPriceValue = (
    data: LiquidityRangeIF,
    isDenomBase: boolean,
) => {
    if (isDenomBase) {
        return data.upperBoundInvPriceDecimalCorrected;
    } else {
        return data.lowerBoundPriceDecimalCorrected;
    }
};

export function createAreaSeries(
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    curve: any,
) {
    return d3fc
        .seriesCanvasArea()
        .orient('horizontal')
        .curve(curve)
        .decorate((context: CanvasRenderingContext2D) => {
            context.fillStyle = 'transparent';
        })
        .mainValue((d: LiquidityDataLocal) => d.activeLiq)
        .crossValue((d: LiquidityDataLocal) => d.liqPrices)
        .xScale(xScale)
        .yScale(yScale);
}

export function decorateForLiquidityArea(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    series: any,
    chartThemeColors: ChartThemeIF,
    isBid: boolean,
) {
    const d3BidColor = chartThemeColors.liqBidColor.copy();
    const d3AskColor = chartThemeColors.liqAskColor.copy();

    if (d3BidColor) d3BidColor.opacity = 0.3;
    if (d3AskColor) d3AskColor.opacity = 0.3;

    series.decorate((context: CanvasRenderingContext2D) => {
        if (isBid) {
            context.fillStyle = d3BidColor.toString();
        } else {
            context.fillStyle = d3AskColor.toString();
        }
    });
}

export function createAreaSeriesLiquidity(
    liqScale: d3.ScaleLinear<number, number>,
    xScale: d3.ScaleLinear<number, number>,
    yScale: d3.ScaleLinear<number, number>,
    liqType: 'bid' | 'ask',
    isDenomBase: boolean,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    curve: any,
    curveType: 'curve' | 'depth',
    chartThemeColors: ChartThemeIF,
) {
    return d3fc
        .seriesCanvasArea()
        .orient('horizontal')
        .curve(curve)
        .decorate((context: CanvasRenderingContext2D) => {
            const d3LiqBidColor = chartThemeColors.liqBidColor.copy();

            if (d3LiqBidColor) d3LiqBidColor.opacity = 0.3;

            const d3LiqAskColor = chartThemeColors.liqAskColor.copy();

            if (d3LiqAskColor) d3LiqAskColor.opacity = 0.3;

            if (liqType === 'bid') {
                context.fillStyle = d3LiqBidColor.toString();
            }
            if (liqType === 'ask') {
                context.fillStyle = d3LiqAskColor.toString();
            }
        })
        .mainValue((d: LiquidityRangeIF) => {
            return liqScale(getActiveLiqDepth(d, curveType, isDenomBase));
        })
        .crossValue((d: LiquidityRangeIF) => {
            if (liqType === 'bid') {
                return !isDenomBase
                    ? d.upperBoundInvPriceDecimalCorrected
                    : d.lowerBoundPriceDecimalCorrected;
            }
            if (liqType === 'ask') {
                return !isDenomBase
                    ? d.lowerBoundInvPriceDecimalCorrected
                    : d.upperBoundPriceDecimalCorrected;
            }
        })
        .xScale(xScale)
        .yScale(yScale);
}
