import {
    createContext,
    Dispatch,
    ReactNode,
    SetStateAction,
    useContext,
    useEffect,
    useState,
} from 'react';
import {
    getFormattedNumber,
    isDefaultDenomTokenExcludedFromUsdConversion,
    isETHorStakedEthToken,
    isStablePair,
    isWbtcOrStakedBTCToken,
} from '../ambient-utils/dataLayer';
import { PoolIF, PoolStatIF } from '../ambient-utils/types';
import useFetchPoolStats from '../App/hooks/useFetchPoolStats';
import { AppStateContext } from './AppStateContext';
import { ChainDataContext } from './ChainDataContext';
import { TradeDataContext } from './TradeDataContext';

export interface PoolContextIF {
    isPoolInitialized: boolean | undefined;
    poolPriceDisplay: number | undefined;
    isPoolPriceChangePositive: boolean | undefined;
    poolPriceChangePercent: string | undefined;
    dailyVol: number | undefined;
    poolData: PoolStatIF;
    usdPrice: number | undefined;
    usdPriceInverse: number | undefined;
    isTradeDollarizationEnabled: boolean;
    isDefaultTradeDollarization: boolean;
    setIsTradeDollarizationEnabled: Dispatch<SetStateAction<boolean>>;
    fdvOfDenomTokenDisplay: string | undefined;
    baseTokenFdvDisplay: string | undefined;
    quoteTokenFdvDisplay: string | undefined;
    basePrice: number | undefined;
    quotePrice: number | undefined;
}

export const PoolContext = createContext({} as PoolContextIF);

export const PoolContextProvider = (props: { children: ReactNode }) => {
    const {
        activeNetwork: { chainId, poolIndex },
    } = useContext(AppStateContext);
    const { activePoolList } = useContext(ChainDataContext);

    const { baseToken, quoteToken, isDenomBase, didUserFlipDenom } =
        useContext(TradeDataContext);

    const poolArg: PoolIF = {
        baseToken,
        quoteToken,
        base: baseToken.address,
        quote: quoteToken.address,
        chainId: chainId,
        poolIdx: poolIndex,
    };

    const poolData = useFetchPoolStats(
        poolArg,
        activePoolList,
        true,
        didUserFlipDenom,
    );

    const [dailyVol] = useState<number | undefined>();

    const {
        poolPriceDisplay,
        poolPriceChangePercent,
        isPoolPriceChangePositive,
        basePrice,
        quotePrice,
        isPoolInitialized,
        baseFdvUsd,
        quoteFdvUsd,
    } = poolData;

    const baseTokenFdvDisplay = baseFdvUsd
        ? getFormattedNumber({ value: baseFdvUsd, prefix: '$' })
        : undefined;

    const quoteTokenFdvDisplay = quoteFdvUsd
        ? getFormattedNumber({ value: quoteFdvUsd, prefix: '$' })
        : undefined;

    const fdvOfDenomTokenDisplay = isDenomBase
        ? baseTokenFdvDisplay
        : quoteTokenFdvDisplay;

    const usdPrice = poolPriceDisplay
        ? isDenomBase
            ? quotePrice
                ? (1 / poolPriceDisplay) * quotePrice
                : undefined
            : basePrice
              ? poolPriceDisplay * basePrice
              : undefined
        : undefined;

    const usdPriceInverse = poolPriceDisplay
        ? isDenomBase
            ? basePrice
                ? poolPriceDisplay * basePrice
                : undefined
            : quotePrice
              ? (1 / poolPriceDisplay) * quotePrice
              : undefined
        : undefined;

    const [isDefaultTradeDollarization, setDefaultTradeDollarization] =
        useState(usdPrice !== undefined);

    const [isTradeDollarizationEnabled, setIsTradeDollarizationEnabled] =
        useState(usdPrice !== undefined);

    useEffect(() => {
        const isPairStablePair = isStablePair(
            baseToken.address,
            quoteToken.address,
            chainId,
        );
        const excludeFromUsdConversion =
            isDefaultDenomTokenExcludedFromUsdConversion(baseToken, quoteToken);

        const isPairEthWbtc =
            isETHorStakedEthToken(baseToken.address, chainId) &&
            isWbtcOrStakedBTCToken(quoteToken.address);

        if (
            usdPrice !== undefined &&
            !(isPairStablePair || isPairEthWbtc || excludeFromUsdConversion)
        ) {
            setDefaultTradeDollarization(true);
            setIsTradeDollarizationEnabled(true);
        } else {
            setDefaultTradeDollarization(false);
            setIsTradeDollarizationEnabled(false);
        }
    }, [baseToken.address, quoteToken.address, usdPrice !== undefined]);

    const poolContext: PoolContextIF = {
        isPoolInitialized,
        poolPriceDisplay,
        isPoolPriceChangePositive,
        poolPriceChangePercent,
        dailyVol,
        fdvOfDenomTokenDisplay,
        baseTokenFdvDisplay,
        quoteTokenFdvDisplay,
        poolData,
        usdPrice,
        usdPriceInverse,
        isTradeDollarizationEnabled,
        isDefaultTradeDollarization,
        setIsTradeDollarizationEnabled,
        basePrice,
        quotePrice,
    };

    return <PoolContext value={poolContext}>{props.children}</PoolContext>;
};
