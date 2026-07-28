import {
    concDepositSkew,
    fromDisplayQty,
    tickToPrice,
    toDisplayPrice,
    toDisplayQty,
} from '@crocswap-libs/sdk';
import {
    memo,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import Button from '../../../../components/Form/Button';
import { useModal } from '../../../../components/Global/Modal/useModal';

import { useCreateRangePosition } from '../../../../App/hooks/useCreateRangePosition';
import { useCreateZapPosition } from '../../../../App/hooks/useCreateZapPosition';
import { useSimulatedIsPoolInitialized } from '../../../../App/hooks/useSimulatedIsPoolInitialized';
import RangeBounds from '../../../../components/Global/RangeBounds/RangeBounds';
import ConfirmRangeModal from '../../../../components/Trade/Range/ConfirmRangeModal/ConfirmRangeModal';
import RangeExtraInfo from '../../../../components/Trade/Range/RangeExtraInfo/RangeExtraInfo';
import RangeTokenInput from '../../../../components/Trade/Range/RangeTokenInput/RangeTokenInput';
import RangeZapTokenInput from '../../../../components/Trade/Range/RangeTokenInput/RangeZapTokenInput';
import ZapStepper from '../../../../components/Trade/Range/RangeTokenInput/ZapStepper';
import SubmitTransaction from '../../../../components/Trade/TradeModules/SubmitTransaction/SubmitTransaction';
import TradeModuleHeader from '../../../../components/Trade/TradeModules/TradeModuleHeader';
import { TradeModuleSkeleton } from '../../../../components/Trade/TradeModules/TradeModuleSkeleton';
import depositModeStyles from './DepositModeToggle.module.css';

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

import { track } from '@plausible-analytics/tracker';
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
    SHOULD_LOG_ANALYTICS,
} from '../../../../ambient-utils/constants';
import { MAINNET_TOKENS } from '../../../../ambient-utils/constants/networks/ethereumMainnet';
import { useApprove } from '../../../../App/functions/approve';
import { useHandleRangeButtonMessage } from '../../../../App/hooks/useHandleRangeButtonMessage';
import { AppStateContext } from '../../../../contexts';
import { GraphDataContext } from '../../../../contexts/GraphDataContext';
import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import { useRangeInputDisable } from './useRangeInputDisable';
import { useZapDeposit } from './useZapDeposit';

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
        poolData: { poolAmbientAprEstimate, basePrice, quotePrice },
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
    const {
        tokenAAllowance,
        tokenBAllowance,
        tokenABalance,
        tokenBBalance,
        tokenADexBalance,
        tokenBDexBalance,
        isTokenABase,
        isTokenAEth,
        isTokenBEth,
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

    // `pinnedDisplayPrices` is the single source of truth for the pinned range
    // bounds. The truncated display strings and non-display bound prices are
    // derived from it rather than tracked as separate state (which previously
    // required keeping ~4 extra useState values in sync across every effect).
    const pinnedMinPriceDisplayTruncated =
        pinnedDisplayPrices?.pinnedMinPriceDisplayTruncated ?? '';
    const pinnedMaxPriceDisplayTruncated =
        pinnedDisplayPrices?.pinnedMaxPriceDisplayTruncated ?? '';
    const rangeLowBoundNonDisplayPrice =
        pinnedDisplayPrices?.pinnedMinPriceNonDisplay ?? 0;
    const rangeHighBoundNonDisplayPrice =
        pinnedDisplayPrices?.pinnedMaxPriceNonDisplay ?? 0;

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

    // True when the persisted advanced ticks are implausibly far from the
    // current pool price (or undefined) and should be reset to defaults. The
    // condition is identical for both bounds, so a single flag drives both.
    const shouldResetAdvancedTicks =
        !ticksInParams &&
        currentPoolPriceTick !== undefined &&
        (advancedHighTick > currentPoolPriceTick + 100000 ||
            advancedLowTick < currentPoolPriceTick - 100000);

    // default low tick to seed in the DOM (range lower value)
    const defaultLowTick = useMemo<number>(() => {
        const value: number = shouldResetAdvancedTicks
            ? roundDownTick(
                  currentPoolPriceTick +
                      DEFAULT_MIN_PRICE_DIFF_PERCENTAGE * 100,
                  gridSize,
              )
            : advancedLowTick;
        return value;
    }, [
        advancedLowTick,
        currentPoolPriceTick,
        shouldResetAdvancedTicks,
        gridSize,
    ]);

    // default high tick to seed in the DOM (range upper value)
    const defaultHighTick = useMemo<number>(() => {
        const value: number = shouldResetAdvancedTicks
            ? roundUpTick(
                  currentPoolPriceTick +
                      DEFAULT_MAX_PRICE_DIFF_PERCENTAGE * 100,
                  gridSize,
              )
            : advancedHighTick;
        return value;
    }, [
        advancedHighTick,
        currentPoolPriceTick,
        shouldResetAdvancedTicks,
        gridSize,
    ]);

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
        if (!sliderInput) return;
        // Don't overwrite the thumb while the user is actively dragging the
        // slider. The slider's context update is throttled to one per animation
        // frame, so the committed value can lag the live cursor by up to a
        // frame; writing it back here would visibly snap the thumb backward.
        if (document.activeElement === sliderInput) return;
        if (sliderInput.value !== simpleRangeWidth.toString()) {
            sliderInput.value = simpleRangeWidth.toString();
        }
    }, [simpleRangeWidth]);

    useEffect(() => {
        resetConfirmation();
        setPinnedDisplayPrices(undefined);
    }, [baseToken.address, quoteToken.address]);

    useEffect(() => {
        if (!isAdd) {
            setCurrentRangeInAdd('');
        }
    }, [isAdd]);

    useEffect(() => {
        if (rangeWidthPercentage === 100 && !advancedMode) {
            setIsAmbient(true);
            // ambient positions span the full price range; the truncated /
            // with-commas display fields are not shown in ambient mode (the UI
            // hardcodes '0' / '∞'), so only the non-display bounds matter here.
            setPinnedDisplayPrices((prev) => ({
                pinnedMinPriceDisplay: '0',
                pinnedMaxPriceDisplay: 'Infinity',
                pinnedMinPriceDisplayTruncated: '0',
                pinnedMaxPriceDisplayTruncated: 'Infinity',
                pinnedMinPriceDisplayTruncatedWithCommas: '0',
                pinnedMaxPriceDisplayTruncatedWithCommas: 'Infinity',
                pinnedLowTick: prev?.pinnedLowTick ?? 0,
                pinnedHighTick: prev?.pinnedHighTick ?? 0,
                pinnedMinPriceNonDisplay: 0,
                pinnedMaxPriceNonDisplay: Infinity,
            }));
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
        baseToken.address,
        quoteToken.address,
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
            setPinnedDisplayPrices(pinnedDisplayPrices);

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

            // A low-bound edit commits the min truncated display string plus a
            // single non-display bound (which one flips with the denom). Merge
            // those into the pinned-prices source of truth.
            setPinnedDisplayPrices((prev) => {
                // `getPinnedPriceValuesFromDisplayPrices` omits the with-commas
                // fields (only shown by RangePriceInfo in base mode, where prev
                // is always populated), so default them when prev is undefined.
                const base = prev ?? {
                    ...pinnedDisplayPrices,
                    pinnedMinPriceDisplayTruncatedWithCommas: '',
                    pinnedMaxPriceDisplayTruncatedWithCommas: '',
                };
                return {
                    ...base,
                    pinnedMinPriceDisplayTruncated:
                        pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
                    pinnedMinPriceNonDisplay: !isDenomBase
                        ? pinnedDisplayPrices.pinnedMinPriceNonDisplay
                        : base.pinnedMinPriceNonDisplay,
                    pinnedMaxPriceNonDisplay: !isDenomBase
                        ? base.pinnedMaxPriceNonDisplay
                        : pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
                };
            });

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

            // A high-bound edit commits the max truncated display string plus a
            // single non-display bound (which one flips with the denom). Merge
            // those into the pinned-prices source of truth.
            setPinnedDisplayPrices((prev) => {
                // `getPinnedPriceValuesFromDisplayPrices` omits the with-commas
                // fields (only shown by RangePriceInfo in base mode, where prev
                // is always populated), so default them when prev is undefined.
                const base = prev ?? {
                    ...pinnedDisplayPrices,
                    pinnedMinPriceDisplayTruncatedWithCommas: '',
                    pinnedMaxPriceDisplayTruncatedWithCommas: '',
                };
                return {
                    ...base,
                    pinnedMaxPriceDisplayTruncated:
                        pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
                    pinnedMinPriceNonDisplay: isDenomBase
                        ? pinnedDisplayPrices.pinnedMinPriceNonDisplay
                        : base.pinnedMinPriceNonDisplay,
                    pinnedMaxPriceNonDisplay: isDenomBase
                        ? base.pinnedMaxPriceNonDisplay
                        : pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
                };
            });

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

    const l1GasFeePoolInGwei = isActiveNetworkL2 ? 10000 : 0;
    const extraL1GasFeePool = isActiveNetworkL2 ? 0.01 : 0;

    const amountToReduceNativeTokenQty = isActiveNetworkL2
        ? amountToReduceNativeTokenQtyL2
        : amountToReduceNativeTokenQtyMainnet;

    const activeRangeTxHash = useRef<string>('');

    useEffect(() => {
        if (gasPriceInGwei && nativeTokenUsdPrice) {
            const costOfMainnetPoolInETH =
                gasPriceInGwei * GAS_DROPS_ESTIMATE_POOL * NUM_GWEI_IN_WEI;

            setAmountToReduceNativeTokenQtyMainnet(
                RANGE_BUFFER_MULTIPLIER_MAINNET * costOfMainnetPoolInETH,
            );

            // L2 execution cost uses the same gas formula as mainnet, plus a
            // flat L1 data-availability fee.
            const l1CostOfScrollPoolInETH =
                l1GasFeePoolInGwei / NUM_GWEI_IN_ETH;

            const costOfScrollPoolInETH =
                l1CostOfScrollPoolInETH + costOfMainnetPoolInETH;

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
        resetZapProgress();
    };
    const { createRangePosition } = useCreateRangePosition();
    const { createZapPosition, createTopUpPosition } = useCreateZapPosition();
    const sendTransaction = async () => {
        if (!crocEnv) return;
        setShowConfirmation(true);
        if (SHOULD_LOG_ANALYTICS) {
            track('Range Order Submitted', {
                props: {
                    oneSided: String(isOutOfRange || isZapMode),
                    type: isZapMode
                        ? 'single-token'
                        : isTopUpMode
                          ? 'swap-difference'
                          : 'standard',
                    positionType: isAmbient ? 'ambient' : 'concentrated',
                },
            });
        }

        if (isZapMode) {
            createZapPosition({
                slippageTolerancePercentage,
                isAmbient,
                inputTokenAddress: zapInputToken.address,
                inputTokenQty: zapInputQtyNoExponentString,
                isWithdrawFromDexChecked: isWithdrawZapFromDexChecked,
                defaultLowTick,
                defaultHighTick,
                isAdd,
                setNewRangeTransactionHash,
                setTxError,
                resetConfirmation,
                activeRangeTxHash,
                setZapStep,
                setIsTxCompletedRange: setIsZapComplete,
            });
            return;
        }

        if (isTopUpMode) {
            createTopUpPosition({
                slippageTolerancePercentage,
                isAmbient,
                // buy the shortfall of the deficient side by selling the surplus
                buyTokenAddress: topUpDeficientToken.address,
                buyTokenQty: topUpBuyDeficientQty,
                sellTokenAddress: topUpSurplusToken.address,
                // mint the entered two-token position from the topped-up balances
                deficientTokenQty: topUpDeficientIsA
                    ? tokenAInputQtyNoExponentString
                    : tokenBInputQtyNoExponentString,
                deficientIsTokenA: topUpDeficientIsA,
                defaultLowTick,
                defaultHighTick,
                isAdd,
                setNewRangeTransactionHash,
                setTxError,
                resetConfirmation,
                activeRangeTxHash,
                setZapStep,
                setIsTxCompletedRange: setIsZapComplete,
            });
            return;
        }

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

    const clearTokenInputs = useCallback(() => {
        setTokenAInputQty('');
        setTokenBInputQty('');
        setPrimaryQuantity('');
    }, [setPrimaryQuantity]);
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

    const {
        depositMode,
        isZapMode,
        isTopUpMode,
        switchDepositMode,
        canOfferZap,
        canSwitchToTopUp,
        zapInputQty,
        setZapInputQty,
        zapInputQtyNoExponentString,
        zapInputToken,
        zapCounterpartToken,
        zapInputBalance,
        zapInputDexBalance,
        zapInputIsTokenA,
        setZapInputSideAOverride,
        isWithdrawZapFromDexChecked,
        zapInputTokenUsdPrice,
        zapQtyCoveredByWalletBalance,
        zapSplit,
        zapPositionTokenAQty,
        zapPositionTokenBQty,
        zapSwapDescription,
        isZapInputWalletBalanceSufficient,
        isZapInputAllowanceSufficient,
        isUsdtResetRequiredZap,
        topUpDeficientIsA,
        topUpDeficientToken,
        topUpSurplusToken,
        topUpBuyDeficientQty,
        topUpSwapDescription,
        topUpSurplus,
        topUpDeficient,
        zapSteps,
        setZapStep,
        setIsZapComplete,
        resetZapProgress,
        effectiveTokenAllowed,
        effectiveButtonErrorMessage,
    } = useZapDeposit({
        isAmbient,
        isInvalidRange,
        defaultLowTick,
        defaultHighTick,
        isTokenAInputDisabled,
        isTokenBInputDisabled,
        isPoolInitialized,
        slippageTolerancePercentage,
        tokenAInputQty,
        tokenBInputQty,
        tokenAInputQtyNoExponentString,
        tokenBInputQtyNoExponentString,
        setTokenAInputQty,
        setTokenBInputQty,
        clearTokenInputs,
        primaryQuantity,
        setPrimaryQuantity,
        isTokenAPrimary,
        setIsTokenAPrimary,
        isWithdrawTokenAFromDexChecked,
        isWithdrawTokenBFromDexChecked,
        tokenAAllowed,
        tokenBAllowed,
        rangeButtonErrorMessageTokenA,
        rangeButtonErrorMessageTokenB,
        showConfirmation,
        txError,
        amountToReduceNativeTokenQty,
        activeRangeTxHash,
    });

    // reset activeTxHash when the pair changes or user updates quantity
    useEffect(() => {
        activeRangeTxHash.current = '';
    }, [tokenA.address, tokenB.address, primaryQuantity, zapInputQty]);

    const zapStepperElement =
        isZapMode || isTopUpMode ? <ZapStepper steps={zapSteps} /> : null;

    const isQtyEntered = isZapMode
        ? zapInputQtyNoExponentString !== ''
        : tokenAInputQtyNoExponentString !== '' &&
          tokenBInputQtyNoExponentString !== '';
    const showExtraInfoDropdown = isZapMode
        ? zapInputQtyNoExponentString !== ''
        : tokenAInputQtyNoExponentString !== '' ||
          tokenBInputQtyNoExponentString !== '';

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
                <>
                    {(canOfferZap || canSwitchToTopUp) && (
                        <div
                            role='group'
                            aria-label='Deposit method'
                            className={depositModeStyles.container}
                        >
                            <button
                                type='button'
                                aria-pressed={depositMode === 'balanced'}
                                onClick={() => switchDepositMode('balanced')}
                                className={`${depositModeStyles.button} ${depositMode === 'balanced' ? depositModeStyles.buttonActive : ''}`}
                            >
                                Deposit both tokens
                            </button>
                            {/* top-up: keep both tokens, swap only the shortfall */}
                            {canSwitchToTopUp && (
                                <button
                                    type='button'
                                    aria-pressed={isTopUpMode}
                                    onClick={() => switchDepositMode('topup')}
                                    className={`${depositModeStyles.button} ${isTopUpMode ? depositModeStyles.buttonActive : ''}`}
                                >
                                    Swap the difference
                                </button>
                            )}
                            {/* single-token deposit */}
                            {canOfferZap && (
                                <button
                                    type='button'
                                    aria-pressed={isZapMode}
                                    onClick={() => switchDepositMode('single')}
                                    className={`${depositModeStyles.button} ${isZapMode ? depositModeStyles.buttonActive : ''}`}
                                >
                                    Deposit with one token
                                </button>
                            )}
                        </div>
                    )}
                    {isZapMode ? (
                        <RangeZapTokenInput
                            token={zapInputToken}
                            counterpartToken={zapCounterpartToken}
                            tokenBalance={zapInputBalance}
                            tokenDexBalance={zapInputDexBalance}
                            isTokenEth={
                                zapInputIsTokenA ? isTokenAEth : isTokenBEth
                            }
                            isDexSelected={isWithdrawZapFromDexChecked}
                            toggleDexSelection={() =>
                                toggleDexSelection(zapInputIsTokenA ? 'A' : 'B')
                            }
                            qty={{
                                value: zapInputQty,
                                set: setZapInputQty,
                            }}
                            reverseTokens={() => {
                                setZapInputQty('');
                                setZapInputSideAOverride(!zapInputIsTokenA);
                            }}
                            usdValue={zapInputTokenUsdPrice}
                            amountToReduceNativeTokenQty={
                                amountToReduceNativeTokenQty
                            }
                            estimatedCounterpartQty={
                                zapSplit?.counterpartAmount ?? null
                            }
                        />
                    ) : (
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
                            amountToReduceNativeTokenQty={
                                amountToReduceNativeTokenQty
                            }
                        />
                    )}
                </>
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
                            isZapMode
                                ? zapPositionTokenAQty
                                : isTokenAInputDisabled
                                  ? ''
                                  : tokenAInputQtyNoExponentString
                        }
                        tokenBQty={
                            isZapMode
                                ? zapPositionTokenBQty
                                : isTokenBInputDisabled
                                  ? ''
                                  : tokenBInputQtyNoExponentString
                        }
                        zapDescription={
                            isZapMode
                                ? zapSwapDescription
                                : isTopUpMode
                                  ? topUpSwapDescription
                                  : undefined
                        }
                        zapStepper={
                            isZapMode || isTopUpMode
                                ? zapStepperElement
                                : undefined
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
                            ? effectiveTokenAllowed
                                ? bypassConfirmRange.isEnabled
                                    ? isAdd
                                        ? `Add ${
                                              isAmbient ? 'Ambient' : ''
                                          } Liquidity`
                                        : `Submit ${
                                              isAmbient ? 'Ambient' : ''
                                          } Liquidity`
                                    : 'Confirm'
                                : effectiveButtonErrorMessage
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
                            !effectiveTokenAllowed ||
                            isInvalidRange) &&
                        areBothAckd
                    }
                    flat={true}
                />
            }
            bypassConfirm={
                showConfirmation && bypassConfirmRange.isEnabled ? (
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                        }}
                    >
                        {zapStepperElement}
                        <SubmitTransaction
                            type='Range'
                            newTransactionHash={newRangeTransactionHash}
                            txError={txError}
                            resetConfirmation={resetConfirmation}
                            sendTransaction={sendTransaction}
                            transactionPendingDisplayString={
                                isZapMode
                                    ? `Swapping ${zapInputToken.symbol}, then minting your ${tokenA.symbol} / ${tokenB.symbol} position`
                                    : isTopUpMode
                                      ? `Swapping ${topUpSurplusToken.symbol} for ${topUpDeficientToken.symbol}, then minting your ${tokenA.symbol} / ${tokenB.symbol} position`
                                      : isAdd
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
                    </div>
                ) : undefined
            }
            approveButton={
                isZapMode ? (
                    isPoolInitialized &&
                    parseFloat(zapInputQty) > 0 &&
                    isZapInputWalletBalanceSufficient &&
                    !isZapInputAllowanceSufficient ? (
                        <Button
                            idForDOM='approve_token_for_range'
                            style={{ textTransform: 'none' }}
                            title={
                                !isApprovalPending
                                    ? isUsdtResetRequiredZap
                                        ? 'Reset USDT Approval (Step 1/2)'
                                        : `Approve ${zapInputToken.symbol}`
                                    : isUsdtResetRequiredZap
                                      ? 'USDT Approval Reset Pending...'
                                      : `${zapInputToken.symbol} Approval Pending...`
                            }
                            disabled={isApprovalPending}
                            action={async () => {
                                await approve(
                                    zapInputToken.address,
                                    zapInputToken.symbol,
                                    undefined,
                                    isUsdtResetRequiredZap
                                        ? 0n
                                        : isActiveNetworkPlume
                                          ? // add 1% buffer to avoid rounding
                                            // errors across the swap + mint legs
                                            (zapQtyCoveredByWalletBalance *
                                                101n) /
                                            100n
                                          : ethers.MaxUint256,
                                );
                            }}
                            flat={true}
                        />
                    ) : undefined
                ) : topUpSurplus.needsApproval ? (
                    <Button
                        idForDOM='approve_token_for_range'
                        style={{ textTransform: 'none' }}
                        title={
                            !isApprovalPending
                                ? topUpSurplus.isUsdtResetRequired
                                    ? 'Reset USDT Approval (Step 1/2)'
                                    : `Approve ${topUpSurplusToken.symbol}`
                                : topUpSurplus.isUsdtResetRequired
                                  ? 'USDT Approval Reset Pending...'
                                  : `${topUpSurplusToken.symbol} Approval Pending...`
                        }
                        disabled={isApprovalPending}
                        action={async () => {
                            await approve(
                                topUpSurplusToken.address,
                                topUpSurplusToken.symbol,
                                undefined,
                                topUpSurplus.isUsdtResetRequired
                                    ? 0n
                                    : isActiveNetworkPlume
                                      ? topUpSurplus.approvalWei
                                      : ethers.MaxUint256,
                            );
                        }}
                        flat={true}
                    />
                ) : !isTopUpMode &&
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
                ) : !isTopUpMode &&
                  isPoolInitialized &&
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
                ) : topUpDeficient.needsApproval ? (
                    <Button
                        idForDOM='approve_token_for_range'
                        style={{ textTransform: 'none' }}
                        title={
                            !isApprovalPending
                                ? topUpDeficient.isUsdtResetRequired
                                    ? 'Reset USDT Approval (Step 1/2)'
                                    : `Approve ${topUpDeficientToken.symbol}`
                                : topUpDeficient.isUsdtResetRequired
                                  ? 'USDT Approval Reset Pending...'
                                  : `${topUpDeficientToken.symbol} Approval Pending...`
                        }
                        disabled={isApprovalPending}
                        action={async () => {
                            await approve(
                                topUpDeficientToken.address,
                                topUpDeficientToken.symbol,
                                undefined,
                                topUpDeficient.isUsdtResetRequired
                                    ? 0n
                                    : isActiveNetworkPlume
                                      ? topUpDeficient.approvalWei
                                      : ethers.MaxUint256,
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
