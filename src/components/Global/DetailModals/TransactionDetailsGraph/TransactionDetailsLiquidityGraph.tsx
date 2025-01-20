import * as d3 from 'd3';
import * as d3fc from 'd3fc';
import {
    Dispatch,
    SetStateAction,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { fetchPoolLiquidity } from '../../../../ambient-utils/api';
import {
    CandleDataIF,
    LiquidityRangeIF,
    TransactionIF,
} from '../../../../ambient-utils/types';
import { AppStateContext } from '../../../../contexts/AppStateContext';
import { CachedDataContext } from '../../../../contexts/CachedDataContext';
import { ChartThemeIF } from '../../../../contexts/ChartContext';
import { CrocEnvContext } from '../../../../contexts/CrocEnvContext';
import {
    clipCanvas,
    setCanvasResolution,
} from '../../../../pages/platformAmbient/Chart/ChartUtils/chartUtils';
import {
    createAreaSeriesLiquidity,
    getAskPriceValue,
    getBidPriceValue,
} from '../../../../pages/platformAmbient/Chart/Liquidity/LiquiditySeries/AreaSeries';
import { createLiquidityLineSeries } from '../../../../pages/platformAmbient/Chart/Liquidity/LiquiditySeries/LineSeries';

interface propsIF {
    tx: TransactionIF;
    isDenomBase: boolean;
    yScale: d3.ScaleLinear<number, number> | undefined;
    transactionType: string;
    poolPriceDisplay: number;
    poolPricePixel: number;
    setPoolPricePixel: Dispatch<SetStateAction<number>>;
    svgWidth: number;
    lastCandleData: CandleDataIF | undefined;
    setIsDataLoading: Dispatch<SetStateAction<boolean>>;
    chartThemeColors: ChartThemeIF | undefined;
    currentPoolPriceTick?: number | undefined;
}

type liquidityChartData = {
    liquidityDataAsk: LiquidityRangeIF[];
    liquidityDataBid: LiquidityRangeIF[];
};

export default function TransactionDetailsLiquidityGraph(props: propsIF) {
    const { activeNetwork } = useContext(AppStateContext);
    const { cachedFetchTokenPrice, cachedQuerySpotTick } =
        useContext(CachedDataContext);
    const { crocEnv } = useContext(CrocEnvContext);

    const {
        chainId,
        base,
        baseDecimals,
        quote,
        quoteDecimals,
        poolIdx,
        bidTickInvPriceDecimalCorrected,
        bidTickPriceDecimalCorrected,
        askTickInvPriceDecimalCorrected,
        askTickPriceDecimalCorrected,
        positionType,
    } = props.tx;

    const {
        isDenomBase,
        yScale,
        transactionType,
        poolPriceDisplay,
        setPoolPricePixel,
        poolPricePixel,
        svgWidth,
        lastCandleData,
        setIsDataLoading,
        chartThemeColors,
    } = props;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [liqAskSeries, setLiqAskSeries] = useState<any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [liqBidSeries, setLiqBidSeries] = useState<any>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [liquidityScale, setLiquidityScale] = useState<any>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lineAskSeries, setLineAskSeries] = useState<any>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lineBidSeries, setLineBidSeries] = useState<any>();

    const d3CanvasLiq = useRef<HTMLCanvasElement | null>(null);

    const [liquidityData, setLiquidityData] = useState<liquidityChartData>({
        liquidityDataAsk: [],
        liquidityDataBid: [],
    });

    const [activeLiqScale, setActiveLiqScale] = useState<
        d3.ScaleLinear<number, number, never> | undefined
    >();

    const clipHighlightedLines = (canvas: HTMLCanvasElement) => {
        const bidPrice = !isDenomBase
            ? bidTickInvPriceDecimalCorrected
            : bidTickPriceDecimalCorrected;

        const askPrice = !isDenomBase
            ? askTickInvPriceDecimalCorrected
            : askTickPriceDecimalCorrected;

        const _low = askPrice;
        const _high = bidPrice;
        const low = _low > _high ? _high : _low;
        const high = _low > _high ? _low : _high;

        if (yScale) {
            clipCanvas(
                0,
                yScale(high),
                canvas.width,
                yScale(low) - yScale(high),
                canvas,
            );
        }
    };

    const drawCurveHighlighted = (canvas: HTMLCanvasElement) => {
        if (transactionType === 'liqchange') {
            if (positionType !== 'ambient') {
                clipHighlightedLines(canvas);
            }

            lineAskSeries(liquidityData.liquidityDataAsk);
            lineBidSeries(liquidityData.liquidityDataBid);
        }
    };

    useEffect(() => {
        (async () => {
            if (!crocEnv || !poolPriceDisplay) {
                return;
            }

            await fetchPoolLiquidity(
                chainId,
                base,
                baseDecimals,
                quote,
                quoteDecimals,
                poolIdx,
                crocEnv,
                activeNetwork.GCGO_URL,
                cachedFetchTokenPrice,
                cachedQuerySpotTick,
                props.currentPoolPriceTick,
            ).then((liqCurve) => {
                if (liqCurve) {
                    const liqAsk: LiquidityRangeIF[] = [];
                    const liqBid: LiquidityRangeIF[] = [];
                    liqCurve.ranges.forEach((element) => {
                        const liqUpperPrices = isDenomBase
                            ? element.lowerBoundPriceDecimalCorrected
                            : element.upperBoundInvPriceDecimalCorrected;

                        const liqLowerPrices = isDenomBase
                            ? element.upperBoundPriceDecimalCorrected
                            : element.lowerBoundInvPriceDecimalCorrected;

                        if (
                            Math.abs(liqUpperPrices) !== Infinity &&
                            Math.abs(liqLowerPrices) !== Infinity
                        ) {
                            if (liqLowerPrices <= poolPriceDisplay) {
                                liqAsk.push(element);
                            } else {
                                if (liqUpperPrices < poolPriceDisplay * 15)
                                    liqBid.push(element);
                            }
                        }
                    });

                    liqBid.sort(
                        (a: LiquidityRangeIF, b: LiquidityRangeIF) =>
                            getBidPriceValue(b, isDenomBase) -
                            getBidPriceValue(a, isDenomBase),
                    );

                    liqAsk.sort(
                        (a: LiquidityRangeIF, b: LiquidityRangeIF) =>
                            b.upperBoundInvPriceDecimalCorrected -
                            a.upperBoundInvPriceDecimalCorrected,
                    );

                    if (liqBid.length > 1 && liqAsk.length > 1) {
                        const extent = d3.extent(
                            liqAsk,
                            (d: LiquidityRangeIF) => {
                                return isDenomBase
                                    ? d.upperBoundPriceDecimalCorrected
                                    : d.lowerBoundInvPriceDecimalCorrected;
                            },
                        );

                        const maxAskData = extent[1];
                        const maxAskObject = liqAsk.find(
                            (d: LiquidityRangeIF) => {
                                return (
                                    (isDenomBase
                                        ? d.upperBoundPriceDecimalCorrected
                                        : d.lowerBoundInvPriceDecimalCorrected) ===
                                    maxAskData
                                );
                            },
                        );

                        if (maxAskObject)
                            liqBid.push({
                                ...liqBid[0],
                                activeLiq: maxAskObject.activeLiq,
                                upperBoundInvPriceDecimalCorrected:
                                    maxAskObject.lowerBoundInvPriceDecimalCorrected,
                                lowerBoundPriceDecimalCorrected:
                                    maxAskObject.upperBoundPriceDecimalCorrected,
                            });
                    }

                    liqBid.sort(
                        (a: LiquidityRangeIF, b: LiquidityRangeIF) =>
                            getBidPriceValue(b, isDenomBase) -
                            getBidPriceValue(a, isDenomBase),
                    );

                    setLiquidityData({
                        liquidityDataAsk: liqAsk,
                        liquidityDataBid: liqBid,
                    });
                }
            });
        })();
    }, [poolPriceDisplay]);

    useEffect(() => {
        if (yScale && chartThemeColors) {
            const unparsedLiquidityData = liquidityData.liquidityDataAsk.concat(
                liquidityData.liquidityDataBid,
            );
            const domainLeft = Math.min(
                ...unparsedLiquidityData
                    .filter((item: LiquidityRangeIF) => item.activeLiq > 0)
                    .map((o: LiquidityRangeIF) => {
                        return o.activeLiq !== undefined
                            ? o.activeLiq
                            : Infinity;
                    }),
            );
            const domainRight = Math.max(
                ...unparsedLiquidityData.map((o: LiquidityRangeIF) => {
                    return o.activeLiq !== undefined ? o.activeLiq : 0;
                }),
            );

            const liquidityScaleTemp = d3
                .scaleLog()
                .domain([domainLeft, domainRight])
                .range([30, 1000]);

            setActiveLiqScale(() => liquidityScaleTemp);

            const liquidityScale = d3.scaleLinear();

            const liquidityExtent = d3fc
                .extentLinear()
                .include([0])
                .accessors([
                    (d: LiquidityRangeIF) => liquidityScaleTemp(d.activeLiq),
                ]);

            liquidityScale
                .domain(liquidityExtent(unparsedLiquidityData))
                .range([svgWidth, svgWidth * 0.9]);

            setLiquidityScale(() => liquidityScale);

            const d3CanvasLiqAskChart = createAreaSeriesLiquidity(
                liquidityScaleTemp,
                liquidityScale,
                yScale,
                'ask',
                isDenomBase,
                d3.curveBasis,
                'curve',
                chartThemeColors,
            );

            setLiqAskSeries(() => d3CanvasLiqAskChart);

            const d3CanvasLiqBidChart = createAreaSeriesLiquidity(
                liquidityScaleTemp,
                liquidityScale,
                yScale,
                'bid',
                isDenomBase,
                d3.curveBasis,
                'curve',
                chartThemeColors,
            );
            setLiqBidSeries(() => d3CanvasLiqBidChart);

            const d3CanvasLiqChartAskLine = createLiquidityLineSeries(
                liquidityScaleTemp,
                liquidityScale,
                yScale,
                'ask',
                isDenomBase,
                d3.curveBasis,
                'curve',
                chartThemeColors,
            );
            setLineAskSeries(() => d3CanvasLiqChartAskLine);

            const d3CanvasLiqChartBidLine = createLiquidityLineSeries(
                liquidityScaleTemp,
                liquidityScale,
                yScale,
                'bid',
                isDenomBase,
                d3.curveBasis,
                'curve',
                chartThemeColors,
            );
            setLineBidSeries(() => d3CanvasLiqChartBidLine);
        }
    }, [yScale, liquidityData, isDenomBase, svgWidth]);

    const render = useCallback(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const nd = d3.select(d3CanvasLiq.current).node() as any;
        nd?.requestRedraw();
    }, []);

    useEffect(() => {
        if (
            liquidityData.liquidityDataAsk.length > 0 ||
            liquidityData.liquidityDataBid.length > 0
        ) {
            if (poolPriceDisplay) {
                setIsDataLoading(false);
            }
        } else {
            setIsDataLoading(false);
        }
    }, [liquidityData, poolPricePixel]);

    useEffect(() => {
        if (liquidityScale && lastCandleData && activeLiqScale) {
            const liqBidData = liquidityData.liquidityDataBid;
            const liqAskData = liquidityData.liquidityDataAsk;

            const lastYData = !isDenomBase
                ? lastCandleData.invPriceCloseExclMEVDecimalCorrected
                : lastCandleData.priceCloseExclMEVDecimalCorrected;

            if (
                lastYData >= poolPriceDisplay &&
                liquidityData?.liquidityDataBid.length > 0
            ) {
                const closest = liqBidData.reduce((acc, curr) => {
                    const diffAcc = Math.abs(
                        lastYData - getBidPriceValue(acc, !isDenomBase),
                    );
                    const diffCurr = Math.abs(
                        lastYData - getBidPriceValue(curr, !isDenomBase),
                    );
                    return diffAcc < diffCurr ? acc : curr;
                });

                closest &&
                    setPoolPricePixel(
                        liquidityScale(activeLiqScale(closest.activeLiq)) * 0.1,
                    );
            } else {
                if (liquidityData?.liquidityDataAsk.length > 0) {
                    const closest = liqAskData.reduce((acc, curr) => {
                        const diffAcc = Math.abs(
                            lastYData - getAskPriceValue(acc, !isDenomBase),
                        );
                        const diffCurr = Math.abs(
                            lastYData - getAskPriceValue(curr, !isDenomBase),
                        );
                        return diffAcc < diffCurr ? acc : curr;
                    });

                    closest &&
                        setPoolPricePixel(
                            liquidityScale(activeLiqScale(closest.activeLiq)) *
                                0.1,
                        );
                }
            }
        }
    }, [lastCandleData, activeLiqScale]);

    useEffect(() => {
        const canvas = d3
            .select(d3CanvasLiq.current)
            .select('canvas')
            .node() as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (liquidityScale) {
            d3.select(d3CanvasLiq.current)
                .on('draw', () => {
                    setCanvasResolution(canvas);

                    if (liqAskSeries) {
                        liqAskSeries(liquidityData.liquidityDataAsk);
                    }
                    if (liqBidSeries) {
                        liqBidSeries(liquidityData.liquidityDataBid);
                    }

                    drawCurveHighlighted(canvas);
                })
                .on('measure', (event: CustomEvent) => {
                    liquidityScale.range([
                        event.detail.width,
                        event.detail.width * 0.9,
                    ]);

                    liqAskSeries?.context(ctx);
                    liqBidSeries?.context(ctx);
                    lineAskSeries?.context(ctx);
                    lineBidSeries?.context(ctx);
                });
        }

        render();
    }, [
        liquidityData,
        liqAskSeries,
        liqBidSeries,
        lineBidSeries,
        lineAskSeries,
        liquidityScale,
        yScale,
    ]);

    return (
        <d3fc-canvas
            ref={d3CanvasLiq}
            style={{
                position: 'relative',
                width: '100%',
            }}
        ></d3fc-canvas>
    );
}
