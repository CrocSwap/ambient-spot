import {
    concDepositSkew,
    fromDisplayQty,
    toDisplayQty,
} from '@crocswap-libs/sdk';
import { memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Button from '../../../../components/Form/Button';
import { useModal } from '../../../../components/Global/Modal/useModal';

import { useCreateRangePosition } from '../../../../App/hooks/useCreateRangePosition';
import { useSimulatedIsPoolInitialized } from '../../../../App/hooks/useSimulatedIsPoolInitialized';
import RangeBounds from '../../../../components/Global/RangeBounds/RangeBounds';
import ConfirmRangeModal from '../../../../components/Trade/Range/ConfirmRangeModal/ConfirmRangeModal';
import RangeExtraInfo from '../../../../components/Trade/Range/RangeExtraInfo/RangeExtraInfo';
import RangeTokenInput from '../../../../components/Trade/Range/RangeTokenInput/RangeTokenInput';
import SubmitTransaction from '../../../../components/Trade/TradeModules/SubmitTransaction/SubmitTransaction';
import TradeModuleHeader from '../../../../components/Trade/TradeModules/TradeModuleHeader';
import { TradeModuleSkeleton } from '../../../../components/Trade/TradeModules/TradeModuleSkeleton';

import {
    getFormattedNumber,
    getPinnedPriceValuesFromDisplayPrices,
    getPinnedPriceValuesFromTicks,
    getUnicodeCharacter,
    isStablePair,
    roundDownTick,
    roundUpTick,
    truncateDecimals,
} from '../../../../ambient-utils/dataLayer';
import { PositionIF } from '../../../../ambient-utils/types';
import { ChainDataContext } from '../../../../contexts/ChainDataContext';
import { CrocEnvContext } from '../../../../contexts/CrocEnvContext';
import { PoolContext } from '../../../../contexts/PoolContext';
import { RangeContext } from '../../../../contexts/RangeContext';
import { TokenContext } from '../../../../contexts/TokenContext';
import { TradeTokenContext } from '../../../../contexts/TradeTokenContext';
import { UserPreferenceContext } from '../../../../contexts/UserPreferenceContext';

import { ethers } from 'ethers';
import {
    estimateBalancedRangeAprFromPoolApr,
    estimateUnbalancedRangeAprFromPoolApr,
} from '../../../../ambient-utils/api';
import {
    GAS_DROPS_ESTIMATE_POOL,
    IS_LOCAL_ENV,
    NUM_GWEI_IN_ETH,
    NUM_GWEI_IN_WEI,
    RANGE_BUFFER_MULTIPLIER_L2,
    RANGE_BUFFER_MULTIPLIER_MAINNET,
} from '../../../../ambient-utils/constants';
import { MAINNET_TOKENS } from '../../../../ambient-utils/constants/networks/ethereumMainnet';
import { useApprove } from '../../../../App/functions/approve';
import { useHandleRangeButtonMessage } from '../../../../App/hooks/useHandleRangeButtonMessage';
import { AppStateContext } from '../../../../contexts';
import { GraphDataContext } from '../../../../contexts/GraphDataContext';
import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import { useRangeInputDisable } from './useRangeInputDisable';

export const DEFAULT_MIN_PRICE_DIFF_PERCENTAGE = -10;
export const DEFAULT_MAX_PRICE_DIFF_PERCENTAGE = 10;

function Range() {
    const { crocEnv } = useContext(CrocEnvContext);

    const {
        activeNetwork: { chainId, gridSize },
    } = useContext(AppStateContext);

    const {
        gasPriceInGwei,
        nativeTokenUsdPrice,
        isActiveNetworkPlume,
        isActiveNetworkL2,
    } = useContext(ChainDataContext);
    const {
        poolPriceDisplay,
        dailyVol,
        poolData: { poolAmbientAprEstimate },
    } = useContext(PoolContext);
    const {
        advancedHighTick,
        advancedLowTick,
        advancedMode,
        setAdvancedHighTick,
        setAdvancedLowTick,
        isLinesSwitched,

        simpleRangeWidth,
        setSimpleRangeWidth,
        minRangePrice: minPrice,
        maxRangePrice: maxPrice,
        setMaxRangePrice: setMaxPrice,
        setMinRangePrice: setMinPrice,
        setChartTriggeredBy,
        chartTriggeredBy,
        setRescaleRangeBoundariesWithSlider,
        setCurrentRangeInAdd,
        setIsLinesSwitched,
    } = useContext(RangeContext);
    const { tokens } = useContext(TokenContext);
    // console.log(tokens);
    const {
        tokenAAllowance,
        tokenBAllowance,
        tokenABalance,
        tokenBBalance,
        tokenADexBalance,
        tokenBDexBalance,
        isTokenABase,
        baseToken: { decimals: baseTokenDecimals },
        quoteToken: { decimals: quoteTokenDecimals },
    } = useContext(TradeTokenContext);
    const { mintSlippage, dexBalRange, bypassConfirmRange } = useContext(
        UserPreferenceContext,
    );
    const { positionsByUser, liquidityFee } = useContext(GraphDataContext);
    const isPoolInitialized = useSimulatedIsPoolInitialized();

    const [isOpen, openModal, closeModal] = useModal();

    const {
        isDenomBase,
        tokenA,
        tokenB,
        baseToken,
        quoteToken,
        poolPriceNonDisplay,
        currentPoolPriceTick,
        isTokenAPrimary,
        primaryQuantity,
        setPrimaryQuantity,
        setIsTokenAPrimary,
    } = useContext(TradeDataContext);

    // RangeTokenInput state values
    const [tokenAInputQty, setTokenAInputQty] = useState<string>(
        isTokenAPrimary ? primaryQuantity : '',
    );

    const [tokenBInputQty, setTokenBInputQty] = useState<string>(
        !isTokenAPrimary ? primaryQuantity : '',
    );

    const tokenAInputQtyNoExponentString = useMemo(() => {
        try {
            return tokenAInputQty.includes('e')
                ? toDisplayQty(
                      fromDisplayQty(tokenAInputQty || '0', tokenA.decimals),
                      tokenA.decimals,
                  )
                : tokenAInputQty;
        } catch (error) {
            console.log({ error });
            return '0';
        }
    }, [tokenAInputQty, tokenA.decimals]);

    const tokenBInputQtyNoExponentString = useMemo(() => {
        try {
            return tokenBInputQty.includes('e')
                ? toDisplayQty(
                      fromDisplayQty(tokenBInputQty || '0', tokenB.decimals),
                      tokenB.decimals,
                  )
                : tokenBInputQty;
        } catch (error) {
            console.log({ error });
            return '0';
        }
    }, [tokenBInputQty, tokenB.decimals]);

    // `rangeWidthPercentage` is a direct alias for the context value
    // `simpleRangeWidth`. Keeping a separate local copy in sync with the
    // context value via effects caused an infinite update loop (the two
    // effects swapped the values every render whenever they diverged), so the
    // local state was removed in favor of using the single source of truth.
    const rangeWidthPercentage = simpleRangeWidth;
    const setRangeWidthPercentage = setSimpleRangeWidth;
    const [isAmbient, setIsAmbient] = useState(false);

    const [minPriceInputString, setMinPriceInputString] = useState<string>('');
    const [maxPriceInputString, setMaxPriceInputString] = useState<string>('');
    const [minPriceDifferencePercentage, setMinPriceDifferencePercentage] =
        useState(DEFAULT_MIN_PRICE_DIFF_PERCENTAGE);
    const [maxPriceDifferencePercentage, setMaxPriceDifferencePercentage] =
        useState(DEFAULT_MAX_PRICE_DIFF_PERCENTAGE);
    const [rangeLowBoundNonDisplayPrice, setRangeLowBoundNonDisplayPrice] =
        useState(0);
    const [rangeHighBoundNonDisplayPrice, setRangeHighBoundNonDisplayPrice] =
        useState(0);
    const [pinnedMinPriceDisplayTruncated, setPinnedMinPriceDisplayTruncated] =
        useState('');
    const [pinnedMaxPriceDisplayTruncated, setPinnedMaxPriceDisplayTruncated] =
        useState('');
    const [rangeLowBoundFieldBlurred, setRangeLowBoundFieldBlurred] =
        useState(false);
    const [rangeHighBoundFieldBlurred, setRangeHighBoundFieldBlurred] =
        useState(false);
    const [pinnedDisplayPrices, setPinnedDisplayPrices] = useState<
        | {
              pinnedMinPriceDisplay: string;
              pinnedMaxPriceDisplay: string;
              pinnedMinPriceDisplayTruncated: string;
              pinnedMaxPriceDisplayTruncated: string;
              pinnedMinPriceDisplayTruncatedWithCommas: string;
              pinnedMaxPriceDisplayTruncatedWithCommas: string;
              pinnedLowTick: number;
              pinnedHighTick: number;
              pinnedMinPriceNonDisplay: number;
              pinnedMaxPriceNonDisplay: number;
          }
        | undefined
    >();

    // local state values whether tx will use dex balance preferentially over
    // ... wallet funds, this layer of logic matters because the DOM may need
    // ... to use wallet funds without switching the persisted preference
    const [isWithdrawTokenAFromDexChecked, setIsWithdrawTokenAFromDexChecked] =
        useState<boolean>(dexBalRange.drawFromDexBal.isEnabled);
    const [isWithdrawTokenBFromDexChecked, setIsWithdrawTokenBFromDexChecked] =
        useState<boolean>(dexBalRange.drawFromDexBal.isEnabled);

    const [showConfirmation, setShowConfirmation] = useState(false);

    const [newRangeTransactionHash, setNewRangeTransactionHash] = useState('');
    const [txError, setTxError] = useState<Error>();

    const [rangeGasPriceinDollars, setRangeGasPriceinDollars] = useState<
        string | undefined
    >();

    const slippageTolerancePercentage = isStablePair(
        tokenA.address,
        tokenB.address,
        chainId,
    )
        ? mintSlippage.stable
        : mintSlippage.volatile;

    const displayPriceWithDenom =
        isDenomBase && poolPriceDisplay
            ? 1 / poolPriceDisplay
            : (poolPriceDisplay ?? 0);
    const poolPriceCharacter = isDenomBase
        ? isTokenABase
            ? getUnicodeCharacter(tokenB.symbol)
            : getUnicodeCharacter(tokenA.symbol)
        : !isTokenABase
          ? getUnicodeCharacter(tokenB.symbol)
          : getUnicodeCharacter(tokenA.symbol);

    const ticksInParams =
        location.pathname.includes('lowTick') &&
        location.pathname.includes('highTick');

    const shouldResetAdvancedLowTick =
        !ticksInParams &&
        currentPoolPriceTick !== undefined &&
        (advancedHighTick > currentPoolPriceTick + 100000 ||
            advancedLowTick < currentPoolPriceTick - 100000);

    const shouldResetAdvancedHighTick =
        !ticksInParams &&
        currentPoolPriceTick !== undefined &&
        (advancedHighTick > currentPoolPriceTick + 100000 ||
            advancedLowTick < currentPoolPriceTick - 100000);

    // default low tick to seed in the DOM (range lower value)
    const defaultLowTick = useMemo<number>(() => {
        const value: number = shouldResetAdvancedLowTick
            ? roundDownTick(
                  currentPoolPriceTick +
                      DEFAULT_MIN_PRICE_DIFF_PERCENTAGE * 100,
                  gridSize,
              )
            : advancedLowTick;
        return value;
    }, [advancedLowTick, currentPoolPriceTick, shouldResetAdvancedLowTick]);

    // default high tick to seed in the DOM (range upper value)
    const defaultHighTick = useMemo<number>(() => {
        const value: number = shouldResetAdvancedHighTick
            ? roundUpTick(
                  currentPoolPriceTick +
                      DEFAULT_MAX_PRICE_DIFF_PERCENTAGE * 100,
                  gridSize,
              )
            : advancedHighTick;
        return value;
    }, [advancedHighTick, currentPoolPriceTick, shouldResetAdvancedHighTick]);

    const userPositions = useMemo(
        () => positionsByUser.positions.filter((x) => x.chainId === chainId),
        [positionsByUser.positions, chainId],
    );
    // Represents whether user is adding to an existing range position
    const isAdd = useMemo(
        () =>
            userPositions.length > 0 &&
            userPositions
                .filter((position) => position.positionLiq !== 0)
                .some((position: PositionIF) => {
                    if (isAmbient && position.positionType === 'ambient') {
                        return true;
                    } else if (
                        !isAmbient &&
                        defaultLowTick === position.bidTick &&
                        defaultHighTick === position.askTick
                    ) {
                        return true;
                    } else {
                        return false;
                    }
                }),
        [userPositions, isAmbient, defaultLowTick, defaultHighTick],
    );

    const { isTokenAInputDisabled, isTokenBInputDisabled } =
        useRangeInputDisable(
            isAmbient,
            isTokenABase,
            currentPoolPriceTick,
            defaultLowTick,
            defaultHighTick,
            isDenomBase,
        );

    const tokenASurplusMinusTokenARemainderNum =
        fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) -
        fromDisplayQty(tokenAInputQtyNoExponentString || '0', tokenA.decimals);
    const tokenBSurplusMinusTokenBRemainderNum =
        fromDisplayQty(tokenBDexBalance || '0', tokenB.decimals) -
        fromDisplayQty(tokenBInputQtyNoExponentString || '0', tokenB.decimals);
    const tokenAQtyCoveredByWalletBalance = isWithdrawTokenAFromDexChecked
        ? tokenASurplusMinusTokenARemainderNum < 0 && !isTokenAInputDisabled
            ? tokenASurplusMinusTokenARemainderNum * -1n
            : 0n
        : !isTokenAInputDisabled
          ? fromDisplayQty(
                tokenAInputQtyNoExponentString || '0',
                tokenA.decimals,
            )
          : 0n;
    const tokenBQtyCoveredByWalletBalance = isWithdrawTokenBFromDexChecked
        ? tokenBSurplusMinusTokenBRemainderNum < 0 && !isTokenBInputDisabled
            ? tokenBSurplusMinusTokenBRemainderNum * -1n
            : 0n
        : !isTokenBInputDisabled
          ? fromDisplayQty(
                tokenBInputQtyNoExponentString || '0',
                tokenB.decimals,
            )
          : 0n;

    const isQtyEntered =
        tokenAInputQtyNoExponentString !== '' &&
        tokenBInputQtyNoExponentString !== '';
    const showExtraInfoDropdown =
        tokenAInputQtyNoExponentString !== '' ||
        tokenBInputQtyNoExponentString !== '';

    const rangeSpanAboveCurrentPrice =
        defaultHighTick - (currentPoolPriceTick || 0);
    const rangeSpanBelowCurrentPrice =
        (currentPoolPriceTick || 0) - defaultLowTick;
    const isOutOfRange = !advancedMode
        ? false
        : rangeSpanAboveCurrentPrice < 0 || rangeSpanBelowCurrentPrice < 0;
    const isInvalidRange = !isAmbient && defaultHighTick <= defaultLowTick;

    const depositSkew = useMemo(
        () =>
            concDepositSkew(
                poolPriceNonDisplay,
                rangeLowBoundNonDisplayPrice,
                rangeHighBoundNonDisplayPrice,
            ),
        [
            poolPriceNonDisplay,
            rangeLowBoundNonDisplayPrice,
            rangeHighBoundNonDisplayPrice,
        ],
    );

    const minPriceDisplay = isAmbient ? '0' : pinnedMinPriceDisplayTruncated;
    const maxPriceDisplay = isAmbient
        ? 'Infinity'
        : pinnedMaxPriceDisplayTruncated;

    // let aprPercentage = ambientApy;
    // if (!isAmbient && ambientApy && poolPriceNonDisplay) {
    //     const concFactor = capitalConcFactor(
    //         poolPriceNonDisplay,
    //         rangeLowBoundNonDisplayPrice,
    //         rangeHighBoundNonDisplayPrice,
    //     );
    //     aprPercentage = ambientApy * concFactor;
    // }
    let daysInRange = isAmbient ? Infinity : 0;
    if (!isAmbient && dailyVol && poolPriceNonDisplay) {
        const upperPercent = Math.log(
            rangeHighBoundNonDisplayPrice / poolPriceNonDisplay,
        );
        const lowerPercent = Math.log(
            poolPriceNonDisplay / rangeLowBoundNonDisplayPrice,
        );

        if (upperPercent > 0 && lowerPercent > 0) {
            const daysBelow = Math.pow(upperPercent / dailyVol, 2);
            const daysAbove = Math.pow(lowerPercent / dailyVol, 2);
            daysInRange = Math.min(daysBelow, daysAbove);
        }
    }

    // A single `getPinnedPriceValuesFromTicks` call already computes both the
    // min and max prices, so we only need one call per denomination (base /
    // quote) rather than one call per (denom, bound) combination.
    const pinnedPricesInBase = useMemo(
        () =>
            getPinnedPriceValuesFromTicks(
                true,
                baseTokenDecimals,
                quoteTokenDecimals,
                defaultLowTick,
                defaultHighTick,
                gridSize,
            ),
        [
            baseTokenDecimals,
            quoteTokenDecimals,
            defaultLowTick,
            defaultHighTick,
            gridSize,
        ],
    );
    const pinnedPricesInQuote = useMemo(
        () =>
            getPinnedPriceValuesFromTicks(
                false,
                baseTokenDecimals,
                quoteTokenDecimals,
                defaultLowTick,
                defaultHighTick,
                gridSize,
            ),
        [
            baseTokenDecimals,
            quoteTokenDecimals,
            defaultLowTick,
            defaultHighTick,
            gridSize,
        ],
    );
    const pinnedMinPriceDisplayTruncatedInBase =
        pinnedPricesInBase.pinnedMinPriceDisplayTruncatedWithCommas;
    const pinnedMaxPriceDisplayTruncatedInBase =
        pinnedPricesInBase.pinnedMaxPriceDisplayTruncatedWithCommas;
    const pinnedMinPriceDisplayTruncatedInQuote =
        pinnedPricesInQuote.pinnedMinPriceDisplayTruncatedWithCommas;
    const pinnedMaxPriceDisplayTruncatedInQuote =
        pinnedPricesInQuote.pinnedMaxPriceDisplayTruncatedWithCommas;

    const isTokenAWalletBalanceSufficient =
        fromDisplayQty(tokenABalance || '0', tokenA.decimals) >=
        tokenAQtyCoveredByWalletBalance;

    const isTokenBWalletBalanceSufficient =
        fromDisplayQty(tokenBBalance || '0', tokenB.decimals) >=
        tokenBQtyCoveredByWalletBalance;

    const isTokenAAllowanceSufficient =
        tokenAAllowance === undefined
            ? true
            : tokenAAllowance >= tokenAQtyCoveredByWalletBalance;

    const isTokenBAllowanceSufficient =
        tokenBAllowance === undefined
            ? true
            : tokenBAllowance >= tokenBQtyCoveredByWalletBalance;

    const isUsdtResetRequiredTokenA = useMemo(() => {
        return (
            tokenA.address.toLowerCase() ===
                MAINNET_TOKENS.USDT.address.toLowerCase() &&
            !!tokenAAllowance &&
            tokenAAllowance < tokenAQtyCoveredByWalletBalance
        );
    }, [tokenA.address, tokenAAllowance, tokenAQtyCoveredByWalletBalance]);

    const isUsdtResetRequiredTokenB = useMemo(() => {
        return (
            tokenB.address.toLowerCase() ===
                MAINNET_TOKENS.USDT.address.toLowerCase() &&
            !!tokenBAllowance &&
            tokenBAllowance < tokenBQtyCoveredByWalletBalance
        );
    }, [tokenB.address, tokenBAllowance, tokenBQtyCoveredByWalletBalance]);

    // values if either token needs to be confirmed before transacting

    const needConfirmTokenA = useMemo(() => {
        return !tokens.verify(tokenA.address);
    }, [tokenA.address, tokens]);
    const needConfirmTokenB = useMemo(() => {
        return !tokens.verify(tokenB.address);
    }, [tokenB.address, tokens]);

    // value showing if no acknowledgement is necessary
    const areBothAckd: boolean = !needConfirmTokenA && !needConfirmTokenB;

    // The range-width slider is an uncontrolled input (`defaultValue`), so its
    // DOM value must be synced manually when `simpleRangeWidth` changes for an
    // external reason (e.g. pool switch defaults or a chart drag). One-way only
    // — it never writes state, so it cannot loop.
    useEffect(() => {
        const sliderInput = document.getElementById(
            'input-slider-range',
        ) as HTMLInputElement;
        if (sliderInput && sliderInput.value !== simpleRangeWidth.toString()) {
            sliderInput.value = simpleRangeWidth.toString();
        }
    }, [simpleRangeWidth]);

    useEffect(() => {
        resetConfirmation();
        setPinnedDisplayPrices(undefined);
    }, [baseToken.address + quoteToken.address]);

    useEffect(() => {
        if (!isAdd) {
            setCurrentRangeInAdd('');
        }
    }, [isAdd]);

    useEffect(() => {
        if (rangeWidthPercentage === 100 && !advancedMode) {
            setIsAmbient(true);
            setRangeLowBoundNonDisplayPrice(0);
            setRangeHighBoundNonDisplayPrice(Infinity);
        } else if (advancedMode) {
            setIsAmbient(false);
        } else {
            setIsAmbient(false);
            if (
                currentPoolPriceTick === undefined ||
                Math.abs(currentPoolPriceTick) === Infinity
            )
                return;
            const lowTick = currentPoolPriceTick - rangeWidthPercentage * 100;
            const highTick = currentPoolPriceTick + rangeWidthPercentage * 100;

            const pinnedDisplayPrices = getPinnedPriceValuesFromTicks(
                isDenomBase,
                baseTokenDecimals,
                quoteTokenDecimals,
                lowTick,
                highTick,
                gridSize,
            );

            setPinnedDisplayPrices(pinnedDisplayPrices);

            setRangeLowBoundNonDisplayPrice(
                pinnedDisplayPrices.pinnedMinPriceNonDisplay,
            );
            setRangeHighBoundNonDisplayPrice(
                pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
            );

            setPinnedMinPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
            );
            setPinnedMaxPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
            );

            setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick);
            setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);

            setMaxPrice(
                parseFloat(pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated),
            );
            setMinPrice(
                parseFloat(pinnedDisplayPrices.pinnedMinPriceDisplayTruncated),
            );
        }
    }, [
        rangeWidthPercentage,
        advancedMode,
        isDenomBase,
        currentPoolPriceTick,
        baseToken.address + quoteToken.address,
        baseTokenDecimals,
        quoteTokenDecimals,
    ]);

    useEffect(() => {
        resetConfirmation();
    }, [isTokenAPrimary]);

    useEffect(() => {
        if (isTokenAInputDisabled) setIsTokenAPrimary(false);
        if (isTokenBInputDisabled) setIsTokenAPrimary(true);
    }, [isTokenAInputDisabled, isTokenBInputDisabled]);

    useEffect(() => {
        setIsWithdrawTokenAFromDexChecked(
            fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) > 0,
        );
    }, [tokenADexBalance]);

    useEffect(() => {
        setIsWithdrawTokenBFromDexChecked(
            fromDisplayQty(tokenBDexBalance || '0', tokenB.decimals) > 0,
        );
    }, [tokenBDexBalance]);

    useEffect(() => {
        if (advancedMode) {
            const pinnedDisplayPrices = getPinnedPriceValuesFromTicks(
                isDenomBase,
                baseTokenDecimals,
                quoteTokenDecimals,
                defaultLowTick,
                defaultHighTick,
                gridSize,
            );
            setRangeLowBoundNonDisplayPrice(
                pinnedDisplayPrices.pinnedMinPriceNonDisplay,
            );
            setRangeHighBoundNonDisplayPrice(
                pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
            );

            setPinnedMinPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
            );
            setPinnedMaxPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
            );

            setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick);
            setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);

            const highTickDiff =
                pinnedDisplayPrices.pinnedHighTick -
                (currentPoolPriceTick || 0);
            const lowTickDiff =
                pinnedDisplayPrices.pinnedLowTick - (currentPoolPriceTick || 0);

            const highGeometricDifferencePercentage =
                Math.abs(highTickDiff) < 200
                    ? parseFloat(truncateDecimals(highTickDiff / 100, 2))
                    : parseFloat(truncateDecimals(highTickDiff / 100, 0));
            const lowGeometricDifferencePercentage =
                Math.abs(lowTickDiff) < 200
                    ? parseFloat(truncateDecimals(lowTickDiff / 100, 2))
                    : parseFloat(truncateDecimals(lowTickDiff / 100, 0));
            isDenomBase
                ? setMaxPriceDifferencePercentage(
                      -lowGeometricDifferencePercentage,
                  )
                : setMaxPriceDifferencePercentage(
                      highGeometricDifferencePercentage,
                  );

            isDenomBase
                ? setMinPriceDifferencePercentage(
                      -highGeometricDifferencePercentage,
                  )
                : setMinPriceDifferencePercentage(
                      lowGeometricDifferencePercentage,
                  );

            const rangeLowBoundDisplayField = document.getElementById(
                'min-price-input-quantity',
            ) as HTMLInputElement;

            if (rangeLowBoundDisplayField) {
                rangeLowBoundDisplayField.value =
                    pinnedDisplayPrices.pinnedMinPriceDisplayTruncated;
                const rangeHighBoundDisplayField = document.getElementById(
                    'max-price-input-quantity',
                ) as HTMLInputElement;

                if (rangeHighBoundDisplayField) {
                    rangeHighBoundDisplayField.value =
                        pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated;
                }
            }

            setMaxPrice(
                parseFloat(pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated),
            );
            setMinPrice(
                parseFloat(pinnedDisplayPrices.pinnedMinPriceDisplayTruncated),
            );
        }
    }, [
        currentPoolPriceTick,
        defaultLowTick,
        defaultHighTick,
        isDenomBase,
        baseTokenDecimals,
        quoteTokenDecimals,
        advancedMode,
    ]);

    useEffect(() => {
        if (rangeLowBoundFieldBlurred || chartTriggeredBy === 'low_line') {
            const rangeLowBoundDisplayField = document.getElementById(
                'min-price-input-quantity',
            ) as HTMLInputElement;

            const targetMinValue = minPrice;
            const targetMaxValue = maxPrice;

            const pinnedDisplayPrices = getPinnedPriceValuesFromDisplayPrices(
                isDenomBase,
                baseTokenDecimals,
                quoteTokenDecimals,
                targetMinValue?.toString() ?? '0',
                targetMaxValue?.toString() ?? '0',
                gridSize,
            );

            !isDenomBase
                ? setRangeLowBoundNonDisplayPrice(
                      pinnedDisplayPrices.pinnedMinPriceNonDisplay,
                  )
                : setRangeHighBoundNonDisplayPrice(
                      pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
                  );

            !isDenomBase
                ? setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick)
                : setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);

            !isDenomBase
                ? setMinPrice(
                      parseFloat(
                          pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
                      ),
                  )
                : setMaxPrice(
                      parseFloat(
                          pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
                      ),
                  );

            if (isLinesSwitched) {
                isDenomBase
                    ? setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick)
                    : setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);
            }

            const highGeometricDifferencePercentage = parseFloat(
                truncateDecimals(
                    (pinnedDisplayPrices.pinnedHighTick -
                        (currentPoolPriceTick || 0)) /
                        100,
                    0,
                ),
            );
            const lowGeometricDifferencePercentage = parseFloat(
                truncateDecimals(
                    (pinnedDisplayPrices.pinnedLowTick -
                        (currentPoolPriceTick || 0)) /
                        100,
                    0,
                ),
            );
            isDenomBase
                ? setMinPriceDifferencePercentage(
                      -highGeometricDifferencePercentage,
                  )
                : setMinPriceDifferencePercentage(
                      lowGeometricDifferencePercentage,
                  );

            setPinnedMinPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
            );

            if (rangeLowBoundDisplayField) {
                rangeLowBoundDisplayField.value =
                    pinnedDisplayPrices.pinnedMinPriceDisplayTruncated;
            } else {
                IS_LOCAL_ENV && console.debug('low bound field not found');
            }

            setRangeLowBoundFieldBlurred(false);
            setChartTriggeredBy('none');
            setIsLinesSwitched(false);
        }
    }, [rangeLowBoundFieldBlurred, chartTriggeredBy]);

    useEffect(() => {
        if (rangeHighBoundFieldBlurred || chartTriggeredBy === 'high_line') {
            const rangeHighBoundDisplayField = document.getElementById(
                'max-price-input-quantity',
            ) as HTMLInputElement;

            const targetMaxValue = maxPrice;
            const targetMinValue = minPrice;

            const pinnedDisplayPrices = getPinnedPriceValuesFromDisplayPrices(
                isDenomBase,
                baseTokenDecimals,
                quoteTokenDecimals,
                targetMinValue?.toString() ?? '0',
                targetMaxValue?.toString() ?? '0',
                gridSize,
            );

            isDenomBase
                ? setRangeLowBoundNonDisplayPrice(
                      pinnedDisplayPrices.pinnedMinPriceNonDisplay,
                  )
                : setRangeHighBoundNonDisplayPrice(
                      pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
                  );

            isDenomBase
                ? setMinPrice(
                      parseFloat(
                          pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
                      ),
                  )
                : setMaxPrice(
                      parseFloat(
                          pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
                      ),
                  );

            isDenomBase
                ? setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick)
                : setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);

            if (isLinesSwitched) {
                !isDenomBase
                    ? setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick)
                    : setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);
            }

            const highGeometricDifferencePercentage = parseFloat(
                truncateDecimals(
                    (pinnedDisplayPrices.pinnedHighTick -
                        (currentPoolPriceTick || 0)) /
                        100,
                    0,
                ),
            );
            const lowGeometricDifferencePercentage = parseFloat(
                truncateDecimals(
                    (pinnedDisplayPrices.pinnedLowTick -
                        (currentPoolPriceTick || 0)) /
                        100,
                    0,
                ),
            );
            isDenomBase
                ? setMaxPriceDifferencePercentage(
                      -lowGeometricDifferencePercentage,
                  )
                : setMaxPriceDifferencePercentage(
                      highGeometricDifferencePercentage,
                  );

            setPinnedMaxPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
            );

            if (rangeHighBoundDisplayField) {
                rangeHighBoundDisplayField.value =
                    pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated;
            } else {
                IS_LOCAL_ENV && console.debug('high bound field not found');
            }

            setRangeHighBoundFieldBlurred(false);
            setChartTriggeredBy('none');
            setIsLinesSwitched(false);
        }
    }, [rangeHighBoundFieldBlurred, chartTriggeredBy]);

    const [
        amountToReduceNativeTokenQtyMainnet,
        setAmountToReduceNativeTokenQtyMainnet,
    ] = useState<number>(0.01);
    const [amountToReduceNativeTokenQtyL2, setAmountToReduceNativeTokenQtyL2] =
        useState<number>(0.0005);

    const [l1GasFeePoolInGwei] = useState<number>(
        isActiveNetworkL2 ? 10000 : 0,
    );
    const [extraL1GasFeePool] = useState(isActiveNetworkL2 ? 0.01 : 0);

    const amountToReduceNativeTokenQty =
        chainId === '0x82750' || chainId === '0x8274f' || chainId === '0x13e31'
            ? amountToReduceNativeTokenQtyL2
            : amountToReduceNativeTokenQtyMainnet;

    const activeRangeTxHash = useRef<string>('');

    // reset activeTxHash when the pair changes or user updates quantity
    useEffect(() => {
        activeRangeTxHash.current = '';
    }, [tokenA.address + tokenB.address, primaryQuantity]);

    useEffect(() => {
        if (gasPriceInGwei && nativeTokenUsdPrice) {
            const costOfMainnetPoolInETH =
                gasPriceInGwei * GAS_DROPS_ESTIMATE_POOL * NUM_GWEI_IN_WEI;

            setAmountToReduceNativeTokenQtyMainnet(
                costOfMainnetPoolInETH * RANGE_BUFFER_MULTIPLIER_MAINNET,
            );

            const l2CostOfScrollPoolInETH =
                gasPriceInGwei * GAS_DROPS_ESTIMATE_POOL * NUM_GWEI_IN_WEI;

            const l1CostOfScrollPoolInETH =
                l1GasFeePoolInGwei / NUM_GWEI_IN_ETH;

            const costOfScrollPoolInETH =
                l1CostOfScrollPoolInETH + l2CostOfScrollPoolInETH;

            setAmountToReduceNativeTokenQtyMainnet(
                RANGE_BUFFER_MULTIPLIER_MAINNET * costOfMainnetPoolInETH,
            );

            setAmountToReduceNativeTokenQtyL2(
                RANGE_BUFFER_MULTIPLIER_L2 * costOfScrollPoolInETH,
            );

            const gasPriceInDollarsNum =
                gasPriceInGwei *
                GAS_DROPS_ESTIMATE_POOL *
                NUM_GWEI_IN_WEI *
                nativeTokenUsdPrice;

            setRangeGasPriceinDollars(
                getFormattedNumber({
                    value: gasPriceInDollarsNum + extraL1GasFeePool,
                    isUSD: true,
                }),
            );
        }
    }, [
        gasPriceInGwei,
        nativeTokenUsdPrice,
        l1GasFeePoolInGwei,
        extraL1GasFeePool,
    ]);

    const resetConfirmation = () => {
        setShowConfirmation(false);
        setTxError(undefined);
        setNewRangeTransactionHash('');
    };
    const { createRangePosition } = useCreateRangePosition();
    const sendTransaction = async () => {
        if (!crocEnv) return;
        setShowConfirmation(true);

        createRangePosition({
            slippageTolerancePercentage,
            isAmbient,
            tokenAInputQty: isTokenAInputDisabled
                ? '0'
                : tokenAInputQtyNoExponentString,
            tokenBInputQty: isTokenBInputDisabled
                ? '0'
                : tokenBInputQtyNoExponentString,
            isWithdrawTokenAFromDexChecked,
            isWithdrawTokenBFromDexChecked,
            defaultLowTick,
            defaultHighTick,
            isAdd,
            setNewRangeTransactionHash,
            setTxError,
            resetConfirmation,
            activeRangeTxHash,
        });
    };

    const handleModalOpen = () => {
        resetConfirmation();
        openModal();
    };

    const handleModalClose = () => {
        resetConfirmation();
        closeModal();
    };

    const toggleDexSelection = (tokenAorB: 'A' | 'B') => {
        if (tokenAorB === 'A') {
            setIsWithdrawTokenAFromDexChecked(!isWithdrawTokenAFromDexChecked);
        } else {
            setIsWithdrawTokenBFromDexChecked(!isWithdrawTokenBFromDexChecked);
        }
    };

    const clearTokenInputs = () => {
        setTokenAInputQty('');
        setTokenBInputQty('');
        setPrimaryQuantity('');
    };
    const {
        tokenAllowed: tokenAAllowed,
        rangeButtonErrorMessage: rangeButtonErrorMessageTokenA,
    } = useHandleRangeButtonMessage(
        tokenA,
        tokenAInputQtyNoExponentString,
        tokenABalance,
        tokenADexBalance,
        isTokenAInputDisabled,
        isWithdrawTokenAFromDexChecked,
        isPoolInitialized,
        tokenAQtyCoveredByWalletBalance,
        amountToReduceNativeTokenQty,
        activeRangeTxHash,
        clearTokenInputs,
    );
    const {
        tokenAllowed: tokenBAllowed,
        rangeButtonErrorMessage: rangeButtonErrorMessageTokenB,
    } = useHandleRangeButtonMessage(
        tokenB,
        tokenBInputQtyNoExponentString,
        tokenBBalance,
        tokenBDexBalance,
        isTokenBInputDisabled,
        isWithdrawTokenBFromDexChecked,
        isPoolInitialized,
        tokenBQtyCoveredByWalletBalance,
        amountToReduceNativeTokenQty,
        activeRangeTxHash,
        clearTokenInputs,
    );

    const { approve, isApprovalPending } = useApprove();

    // logic to acknowledge one or both tokens as necessary
    const ackAsNeeded = (): void => {
        needConfirmTokenA && tokens.acknowledge(tokenA);
        needConfirmTokenB && tokens.acknowledge(tokenB);
    };

    const estRangeApr = poolAmbientAprEstimate
        ? !advancedMode && rangeWidthPercentage
            ? estimateBalancedRangeAprFromPoolApr(
                  poolAmbientAprEstimate,
                  rangeWidthPercentage / 100,
              )
            : poolPriceNonDisplay &&
                rangeLowBoundNonDisplayPrice &&
                rangeHighBoundNonDisplayPrice
              ? estimateUnbalancedRangeAprFromPoolApr(
                    poolAmbientAprEstimate,
                    poolPriceNonDisplay,
                    rangeLowBoundNonDisplayPrice,
                    rangeHighBoundNonDisplayPrice,
                )
              : 0
        : 0;

    const rangeWidthProps = {
        rangeWidthPercentage: rangeWidthPercentage,
        setRangeWidthPercentage: setRangeWidthPercentage,
        setRescaleRangeBoundariesWithSlider:
            setRescaleRangeBoundariesWithSlider,
        inputId: 'input-slider-range',
    };

    const rangePriceInfoProps = {
        pinnedDisplayPrices: pinnedDisplayPrices,
        spotPriceDisplay: getFormattedNumber({
            value: displayPriceWithDenom,
        }),
        maxPriceDisplay: maxPriceDisplay,
        minPriceDisplay: minPriceDisplay,
        // aprPercentage: aprPercentage,
        daysInRange: daysInRange,
        isTokenABase: isTokenABase,
        poolPriceCharacter: poolPriceCharacter,
        isAmbient: isAmbient,
    };

    const minMaxPriceProps = {
        minPricePercentage: minPriceDifferencePercentage,
        maxPricePercentage: maxPriceDifferencePercentage,
        minPriceInputString: minPriceInputString,
        maxPriceInputString: maxPriceInputString,
        setMinPriceInputString: setMinPriceInputString,
        setMaxPriceInputString: setMaxPriceInputString,
        isDenomBase: isDenomBase,
        highBoundOnBlur: () => setRangeHighBoundFieldBlurred(true),
        lowBoundOnBlur: () => setRangeLowBoundFieldBlurred(true),
        rangeLowTick: defaultLowTick,
        rangeHighTick: defaultHighTick,
        disable: isInvalidRange || !isPoolInitialized,
        maxPrice: maxPrice,
        minPrice: minPrice,
        setMaxPrice: setMaxPrice,
        setMinPrice: setMinPrice,
        estRangeApr: estRangeApr,
    };

    const rangeExtraInfoProps = {
        isQtyEntered: isQtyEntered,
        rangeGasPriceinDollars: rangeGasPriceinDollars,
        poolPriceDisplay: getFormattedNumber({
            value: displayPriceWithDenom,
        }),
        slippageTolerance: slippageTolerancePercentage,
        liquidityFee: liquidityFee,
        quoteTokenIsBuy: true,
        isTokenABase: isTokenABase,
        showExtraInfoDropdown: showExtraInfoDropdown,
        isBalancedMode: !advancedMode,
        // aprPercentage: aprPercentage,
        estRangeApr: estRangeApr,
        daysInRange: daysInRange,
    };

    return (
        <TradeModuleSkeleton
            chainId={chainId}
            header={
                <TradeModuleHeader
                    slippage={mintSlippage}
                    bypassConfirm={bypassConfirmRange}
                    settingsTitle='Pool'
                />
            }
            input={
                <RangeTokenInput
                    isAmbient={isAmbient}
                    depositSkew={depositSkew}
                    poolPriceNonDisplay={poolPriceNonDisplay}
                    isWithdrawFromDexChecked={{
                        tokenA: isWithdrawTokenAFromDexChecked,
                        tokenB: isWithdrawTokenBFromDexChecked,
                    }}
                    isOutOfRange={isOutOfRange}
                    tokenAInputQty={{
                        value: tokenAInputQty,
                        set: setTokenAInputQty,
                    }}
                    tokenBInputQty={{
                        value: tokenBInputQty,
                        set: setTokenBInputQty,
                    }}
                    toggleDexSelection={toggleDexSelection}
                    isInputDisabled={{
                        tokenA: isTokenAInputDisabled,
                        tokenB: isTokenBInputDisabled,
                    }}
                    amountToReduceNativeTokenQty={amountToReduceNativeTokenQty}
                />
            }
            inputOptions={
                <RangeBounds
                    isRangeBoundsDisabled={!isPoolInitialized}
                    {...rangeWidthProps}
                    {...rangePriceInfoProps}
                    {...minMaxPriceProps}
                />
            }
            transactionDetails={<RangeExtraInfo {...rangeExtraInfoProps} />}
            modal={
                isOpen ? (
                    <ConfirmRangeModal
                        tokenAQty={
                            isTokenAInputDisabled
                                ? ''
                                : tokenAInputQtyNoExponentString
                        }
                        tokenBQty={
                            isTokenBInputDisabled
                                ? ''
                                : tokenBInputQtyNoExponentString
                        }
                        spotPriceDisplay={getFormattedNumber({
                            value: displayPriceWithDenom,
                        })}
                        isTokenABase={isTokenABase}
                        isAmbient={isAmbient}
                        isAdd={isAdd}
                        maxPriceDisplay={maxPriceDisplay}
                        minPriceDisplay={minPriceDisplay}
                        sendTransaction={sendTransaction}
                        newRangeTransactionHash={newRangeTransactionHash}
                        resetConfirmation={resetConfirmation}
                        showConfirmation={showConfirmation}
                        txError={txError}
                        isInRange={!isOutOfRange}
                        pinnedMinPriceDisplayTruncatedInBase={
                            pinnedMinPriceDisplayTruncatedInBase
                        }
                        pinnedMinPriceDisplayTruncatedInQuote={
                            pinnedMinPriceDisplayTruncatedInQuote
                        }
                        pinnedMaxPriceDisplayTruncatedInBase={
                            pinnedMaxPriceDisplayTruncatedInBase
                        }
                        pinnedMaxPriceDisplayTruncatedInQuote={
                            pinnedMaxPriceDisplayTruncatedInQuote
                        }
                        onClose={handleModalClose}
                        slippageTolerance={slippageTolerancePercentage}
                    />
                ) : (
                    <></>
                )
            }
            button={
                <Button
                    idForDOM='submit_range_position_button'
                    style={{ textTransform: 'none' }}
                    title={
                        areBothAckd
                            ? tokenAAllowed && tokenBAllowed
                                ? bypassConfirmRange.isEnabled
                                    ? isAdd
                                        ? `Add ${
                                              isAmbient ? 'Ambient' : ''
                                          } Liquidity`
                                        : `Submit ${
                                              isAmbient ? 'Ambient' : ''
                                          } Liquidity`
                                    : 'Confirm'
                                : rangeButtonErrorMessageTokenA ||
                                  rangeButtonErrorMessageTokenB
                            : 'Acknowledge'
                    }
                    action={
                        areBothAckd
                            ? bypassConfirmRange.isEnabled
                                ? sendTransaction
                                : handleModalOpen
                            : ackAsNeeded
                    }
                    disabled={
                        (!isPoolInitialized ||
                            !(tokenAAllowed && tokenBAllowed) ||
                            isInvalidRange) &&
                        areBothAckd
                    }
                    flat={true}
                />
            }
            bypassConfirm={
                showConfirmation && bypassConfirmRange.isEnabled ? (
                    <SubmitTransaction
                        type='Range'
                        newTransactionHash={newRangeTransactionHash}
                        txError={txError}
                        resetConfirmation={resetConfirmation}
                        sendTransaction={sendTransaction}
                        transactionPendingDisplayString={
                            isAdd
                                ? `Adding ${tokenA.symbol} and ${tokenB.symbol}`
                                : `Minting a Position with ${
                                      !isTokenAInputDisabled
                                          ? tokenA.symbol
                                          : ''
                                  } ${
                                      !isTokenAInputDisabled &&
                                      !isTokenBInputDisabled
                                          ? 'and'
                                          : ''
                                  } ${
                                      !isTokenBInputDisabled
                                          ? tokenB.symbol
                                          : ''
                                  }
                                     `
                        }
                    />
                ) : undefined
            }
            approveButton={
                isPoolInitialized &&
                parseFloat(tokenAInputQty) > 0 &&
                isTokenAWalletBalanceSufficient &&
                !isTokenAAllowanceSufficient ? (
                    <Button
                        idForDOM='approve_token_for_range'
                        style={{ textTransform: 'none' }}
                        title={
                            !isApprovalPending
                                ? isUsdtResetRequiredTokenA
                                    ? 'Reset USDT Approval (Step 1/2)'
                                    : `Approve ${tokenA.symbol}`
                                : isUsdtResetRequiredTokenA
                                  ? 'USDT Approval Reset Pending...'
                                  : `${tokenA.symbol} Approval Pending...`
                        }
                        disabled={isApprovalPending}
                        action={async () => {
                            await approve(
                                tokenA.address,
                                tokenA.symbol,
                                undefined,
                                isUsdtResetRequiredTokenA
                                    ? 0n
                                    : isActiveNetworkPlume
                                      ? isTokenAPrimary
                                          ? tokenAQtyCoveredByWalletBalance
                                          : // add 1% buffer to avoid rounding errors
                                            (tokenAQtyCoveredByWalletBalance *
                                                101n) /
                                            100n
                                      : ethers.MaxUint256,
                                //  tokenABalance
                                //   ? fromDisplayQty(
                                //         tokenABalance,
                                //         tokenA.decimals,
                                //     )
                                //   : undefined,
                            );
                        }}
                        flat={true}
                    />
                ) : isPoolInitialized &&
                  parseFloat(tokenBInputQty) > 0 &&
                  isTokenBWalletBalanceSufficient &&
                  !isTokenBAllowanceSufficient ? (
                    <Button
                        idForDOM='approve_token_for_range'
                        style={{ textTransform: 'none' }}
                        title={
                            !isApprovalPending
                                ? isUsdtResetRequiredTokenB
                                    ? 'Reset USDT Approval (Step 1/2)'
                                    : `Approve ${tokenB.symbol}`
                                : isUsdtResetRequiredTokenB
                                  ? 'USDT Approval Reset Pending...'
                                  : `${tokenB.symbol} Approval Pending...`
                        }
                        disabled={isApprovalPending}
                        action={async () => {
                            await approve(
                                tokenB.address,
                                tokenB.symbol,
                                undefined,
                                isUsdtResetRequiredTokenB
                                    ? 0n
                                    : isActiveNetworkPlume
                                      ? !isTokenAPrimary
                                          ? tokenBQtyCoveredByWalletBalance
                                          : // add 1% buffer to avoid rounding errors
                                            (tokenBQtyCoveredByWalletBalance *
                                                101n) /
                                            100n
                                      : ethers.MaxUint256,
                                //  tokenBBalance
                                //   ? fromDisplayQty(
                                //         tokenBBalance,
                                //         tokenB.decimals,
                                //     )
                                //   : undefined,
                            );
                        }}
                        flat={true}
                    />
                ) : undefined
            }
        />
    );
}

export default memo(Range);
