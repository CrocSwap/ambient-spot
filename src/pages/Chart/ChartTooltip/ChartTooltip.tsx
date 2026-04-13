import { useContext } from 'react';
import { CandleDataIF, TokenIF } from '../../../ambient-utils/types';
import { ChartContext } from '../../../contexts/ChartContext';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import { formatDollarAmountAxis } from '../../../utils/numbers';
import useDollarPrice from '../../platformAmbient/Chart/ChartUtils/getDollarPrice';
import { ChartTooltipDiv, CurrentDataDiv } from './ChartTooltipStyles';

interface propsIF {
    showTooltip: boolean;
    currentData: CandleDataIF | undefined;
}
export default function ChartTooltip(props: propsIF) {
    const { showTooltip, currentData } = props;

    const mobileView = useMediaQuery('(min-width: 768px)');
    const smallScreen = useMediaQuery('(max-width: 900px)');

    const { chartSettings, isToolbarOpen, isFullScreen } =
        useContext(ChartContext);

    const candleTime = chartSettings.candleTime.global;
    const matchingCandleTime = candleTime.defaults.find(
        (item) => item.seconds === candleTime.time,
    );

    const { isDenomBase, baseToken, quoteToken } = useContext(TradeDataContext);

    const [topToken, bottomToken]: [TokenIF, TokenIF] = isDenomBase
        ? [baseToken, quoteToken]
        : [quoteToken, baseToken];

    const getDollarPrice = useDollarPrice();

    const chartTooltip = (
        <ChartTooltipDiv
            isToolbarOpen={isToolbarOpen}
            isFullScreen={isFullScreen}
        >
            {showTooltip && currentData ? (
                <CurrentDataDiv>
                    <p>
                        {smallScreen && mobileView
                            ? ''
                            : `${topToken.symbol}/${bottomToken.symbol} ${matchingCandleTime?.readable} `}
                        {`O: ${getDollarPrice(isDenomBase ? currentData.invPriceOpenExclMEVDecimalCorrected : currentData.priceOpenExclMEVDecimalCorrected).formattedValue} `}
                        {`H: ${getDollarPrice(isDenomBase ? currentData.invMinPriceExclMEVDecimalCorrected : currentData.maxPriceExclMEVDecimalCorrected).formattedValue} `}
                        {`L: ${getDollarPrice(isDenomBase ? currentData.invMaxPriceExclMEVDecimalCorrected : currentData.minPriceExclMEVDecimalCorrected).formattedValue} `}
                        {`C: ${getDollarPrice(isDenomBase ? currentData.invPriceCloseExclMEVDecimalCorrected : currentData.priceCloseExclMEVDecimalCorrected).formattedValue} `}
                        {`V: ${formatDollarAmountAxis(currentData.volumeUSD)}`}
                    </p>
                </CurrentDataDiv>
            ) : (
                <div className={''} />
            )}
        </ChartTooltipDiv>
    );

    return <>{chartTooltip}</>;
}
