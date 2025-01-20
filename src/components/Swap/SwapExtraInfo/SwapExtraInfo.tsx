import { CrocImpact } from '@crocswap-libs/sdk';
import { memo, useContext } from 'react';
import { brand } from '../../../ambient-utils/constants';
import {
    getFormattedNumber,
    getPriceImpactString,
} from '../../../ambient-utils/dataLayer';
import { PoolContext } from '../../../contexts/PoolContext';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { ExtraInfo } from '../../Trade/TradeModules/ExtraInfo/ExtraInfo';

interface propsIF {
    priceImpact: CrocImpact | undefined;
    slippageTolerance: number;
    liquidityFee: number | undefined;
    swapGasPriceinDollars: string | undefined;
    isOnTradeRoute?: boolean;
    effectivePriceWithDenom: number | undefined;
    showExtraInfoDropdown: boolean;
    showWarning: boolean;
}

function SwapExtraInfo(props: propsIF) {
    const {
        priceImpact,
        effectivePriceWithDenom,
        slippageTolerance,
        liquidityFee,
        swapGasPriceinDollars,
        showExtraInfoDropdown,
    } = props;

    const isFuta = brand === 'futa';

    const { poolPriceDisplay, isTradeDollarizationEnabled, usdPrice } =
        useContext(PoolContext);

    const { baseToken, quoteToken, isDenomBase } = useContext(TradeDataContext);

    const baseTokenSymbol = baseToken.symbol;
    const quoteTokenSymbol = quoteToken.symbol;

    const liquidityProviderFeeString = liquidityFee
        ? (liquidityFee * 100).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          }) + ' %'
        : '...';

    const displayPriceWithDenom =
        isDenomBase && poolPriceDisplay
            ? 1 / poolPriceDisplay
            : (poolPriceDisplay ?? 0);

    const displayPriceString = displayPriceWithDenom
        ? getFormattedNumber({
              value: displayPriceWithDenom,
          })
        : '…';

    const usdPriceDisplay = usdPrice
        ? getFormattedNumber({ value: usdPrice })
        : '…';

    const finalPriceWithDenom = !isDenomBase
        ? 1 / (priceImpact?.finalPrice || 1)
        : priceImpact?.finalPrice || 1;

    const finalPriceString = getFormattedNumber({ value: finalPriceWithDenom });

    // prevent swaps with a price impact in excess of -99.99% or 1 million percent
    const priceImpactNum =
        !priceImpact?.percentChange ||
        priceImpact.percentChange < -0.9999 ||
        priceImpact.percentChange > 10000
            ? undefined
            : Math.abs(priceImpact.percentChange) * 100;

    const priceImpactExceedsThreshold =
        priceImpactNum !== undefined && priceImpactNum > 2;

    const conversionRateNonUsd = isDenomBase
        ? `1 ${baseTokenSymbol} ≈ ${displayPriceString} ${quoteTokenSymbol}`
        : `1 ${quoteTokenSymbol} ≈ ${displayPriceString} ${baseTokenSymbol}`;

    const conversionRateUsd = isDenomBase
        ? `1 ${baseTokenSymbol} ≈ ${usdPriceDisplay} USD`
        : `1 ${quoteTokenSymbol} ≈ ${usdPriceDisplay} USD`;

    const conversionRate = isTradeDollarizationEnabled
        ? conversionRateUsd
        : conversionRateNonUsd;

    const extraInfo = [
        {
            title: 'Avg. Rate',
            tooltipTitle:
                'Expected Conversion Rate After Price Impact and Provider Fee',
            data:
                priceImpactNum !== undefined
                    ? isDenomBase
                        ? `${getFormattedNumber({
                              value: effectivePriceWithDenom,
                          })} ${quoteTokenSymbol} per ${baseTokenSymbol}`
                        : `${getFormattedNumber({
                              value: effectivePriceWithDenom,
                          })} ${baseTokenSymbol} per ${quoteTokenSymbol}`
                    : '...',
            placement: 'bottom',
        },
        {
            title: 'Final Price',
            tooltipTitle: 'Expected Pool Price After Swap',
            data:
                priceImpactNum !== undefined
                    ? isDenomBase
                        ? `${finalPriceString} ${quoteTokenSymbol} per ${baseTokenSymbol}`
                        : `${finalPriceString} ${baseTokenSymbol} per ${quoteTokenSymbol}`
                    : '...',
            placement: 'bottom',
        },
        {
            title: 'Price Impact',
            tooltipTitle:
                'Difference Between Current (Spot) Price and Final Price',
            data: priceImpactNum
                ? `${getPriceImpactString(priceImpactNum)} %`
                : '...',
            placement: 'bottom',
        },
        {
            title: 'Slippage Tolerance',
            tooltipTitle: 'This can be changed in settings.',
            data: `${slippageTolerance} %`,
        },
        {
            title: 'Liquidity Provider Fee',
            tooltipTitle: `This is a dynamically updated rate to reward ${
                isDenomBase ? baseTokenSymbol : quoteTokenSymbol
            } / ${
                isDenomBase ? quoteTokenSymbol : baseTokenSymbol
            } liquidity providers.`,
            data: liquidityProviderFeeString,
            placement: 'bottom',
        },
        ...(isFuta
            ? [
                  {
                      title: 'Network Fee',
                      tooltipTitle: `Estimated cost of gas for this swap is ${swapGasPriceinDollars}`,
                      data: swapGasPriceinDollars,
                      placement: 'bottom',
                  },
              ]
            : []),
    ].filter(Boolean); // Filters out any `null` or `undefined` items

    return (
        <ExtraInfo
            extraInfo={extraInfo}
            conversionRate={conversionRate}
            gasPrice={swapGasPriceinDollars}
            showDropdown={showExtraInfoDropdown}
            showWarning={priceImpactExceedsThreshold}
            priceImpactExceedsThreshold={priceImpactExceedsThreshold}
        />
    );
}

export default memo(SwapExtraInfo);
