import { CandleDataIF } from '../../../../ambient-utils/types';

function createUpdatedCandle(p: CandleDataIF, price: number): CandleDataIF {
    return {
        ...p,
        minPriceDecimalCorrected: price,
        maxPriceDecimalCorrected: price,
        priceOpenDecimalCorrected: price,
        priceCloseDecimalCorrected: price,
        invMinPriceDecimalCorrected: 1 / price,
        invMaxPriceDecimalCorrected: 1 / price,
        invPriceOpenDecimalCorrected: 1 / price,
        invPriceCloseDecimalCorrected: 1 / price,
        minPriceExclMEVDecimalCorrected: price,
        maxPriceExclMEVDecimalCorrected: price,
        priceOpenExclMEVDecimalCorrected: price,
        priceCloseExclMEVDecimalCorrected: price,
        invMinPriceExclMEVDecimalCorrected: 1 / price,
        invMaxPriceExclMEVDecimalCorrected: 1 / price,
        invPriceOpenExclMEVDecimalCorrected: 1 / price,
        invPriceCloseExclMEVDecimalCorrected: 1 / price,
    };
}

export function updateZeroPriceCandles(
    candles: CandleDataIF[],
    poolPriceDisplay: number,
): CandleDataIF[] {
    const minTimeWithoutZeroPrice = Math.min(
        ...candles
            .filter((item) => item.priceOpenDecimalCorrected !== 0)
            .map((i) => i.time),
    );

    const closestElement = candles.find(
        (i) => i.time === minTimeWithoutZeroPrice,
    );

    return candles.map((p) => {
        const openPrice = p.priceOpenDecimalCorrected;

        if (openPrice === 0) {
            const priceToUse = closestElement
                ? closestElement.priceOpenDecimalCorrected
                : poolPriceDisplay;

            return createUpdatedCandle(p, priceToUse);
        }

        return p;
    });
}
