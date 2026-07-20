import {
    concDepositBalance,
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
import ZapStepper, {
    ZapStep,
    ZapStepStatus,
} from '../../../../components/Trade/Range/RangeTokenInput/ZapStepper';
import { ZAP_BUFFER_PERCENT } from '../../../../ambient-utils/dataLayer/transactions/zap';
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

export const DEFAULT_MIN_PRICE_DIFF_PERCENTAGE = -10;
export const DEFAULT_MAX_PRICE_DIFF_PERCENTAGE = 10;

// format a float to a token's precision as a plain (non-exponential) string
const toTokenQtyString = (value: number, decimals: number): string => {
    if (!(value > 0) || !isFinite(value)) return '0';
    let s = value.toFixed(decimals);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
};

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
    const [twoTokenInputSnapshot, setTwoTokenInputSnapshot] = useState<{
        tokenAInputQty: string;
        tokenBInputQty: string;
        primaryQuantity: string;
        isTokenAPrimary: boolean;
        canOfferTopUp: boolean;
    } | null>(null);

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

    // --- Swap-assisted deposits ---------------------------------------------
    // Two ways to fund an in-range position that needs both tokens when the
    // user's balances don't already cover a balanced entry:
    //   'single' — deposit ONE token; a swap converts the correct portion and
    //              the position mints balanced from it (see useCreateZapPosition)
    //   'topup'  — keep the two-token entry, use the balances the user already
    //              holds of BOTH tokens, and swap only the shortfall on the
    //              deficient side (see createTopUpPosition)
    // 'balanced' is the normal two-token deposit with no swap.
    const [depositMode, setDepositMode] = useState<
        'balanced' | 'single' | 'topup'
    >('balanced');
    const isZapMode = depositMode === 'single';
    const isTopUpMode = depositMode === 'topup';
    const [zapInputQty, setZapInputQty] = useState('');
    // two-step ("zap") submission progress for the stepper UI
    const [zapStep, setZapStep] = useState<'swap' | 'mint' | null>(null);
    const [isZapComplete, setIsZapComplete] = useState(false);
    // which pool token is being deposited (null = default to the held token)
    const [zapInputSideAOverride, setZapInputSideAOverride] = useState<
        boolean | null
    >(null);

    // a token counts as "held" if the user has it in their wallet OR their
    // exchange (surplus) balance — either can fund the deposit
    const userHasTokenA =
        fromDisplayQty(tokenABalance || '0', tokenA.decimals) +
            fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) >
        0n;
    const userHasTokenB =
        fromDisplayQty(tokenBBalance || '0', tokenB.decimals) +
            fromDisplayQty(tokenBDexBalance || '0', tokenB.decimals) >
        0n;
    // both inputs enabled => the range straddles the current price and needs
    // both tokens (covers in-range concentrated and ambient positions)
    const rangeNeedsBothTokens =
        !isTokenAInputDisabled && !isTokenBInputDisabled;
    // the user holds exactly one of the two tokens (the other balance is zero)
    const userHoldsExactlyOneToken = userHasTokenA !== userHasTokenB;
    // a zap is possible whenever the range needs both tokens and the user holds
    // at least one of them to fund the deposit. Whether the toggle is actually
    // offered (canOfferZap) additionally requires either a single-token wallet
    // or a two-token entry that overflows a balance — computed below, once the
    // per-token button messages are available.
    const zapEligible =
        isPoolInitialized &&
        !isInvalidRange &&
        rangeNeedsBothTokens &&
        (userHasTokenA || userHasTokenB);

    // --- Top-up deposit -----------------------------------------------------
    // If the user's balanced two-token entry overflows ONE side's balance but
    // they hold some of that token, we can complete the deposit by swapping
    // just the shortfall from the other (surplus) side, then minting using the
    // balances they already hold of both tokens. Amounts are combined
    // wallet+exchange (the mint sources both via the surplus flag).
    const neededTokenANum = parseFloat(tokenAInputQtyNoExponentString || '0');
    const neededTokenBNum = parseFloat(tokenBInputQtyNoExponentString || '0');
    const combinedAvailAWei =
        fromDisplayQty(tokenABalance || '0', tokenA.decimals) +
        fromDisplayQty(tokenADexBalance || '0', tokenA.decimals);
    const combinedAvailBWei =
        fromDisplayQty(tokenBBalance || '0', tokenB.decimals) +
        fromDisplayQty(tokenBDexBalance || '0', tokenB.decimals);
    const neededTokenAWei = fromDisplayQty(
        tokenAInputQtyNoExponentString || '0',
        tokenA.decimals,
    );
    const neededTokenBWei = fromDisplayQty(
        tokenBInputQtyNoExponentString || '0',
        tokenB.decimals,
    );
    const deficitAWei =
        neededTokenAWei > combinedAvailAWei
            ? neededTokenAWei - combinedAvailAWei
            : 0n;
    const deficitBWei =
        neededTokenBWei > combinedAvailBWei
            ? neededTokenBWei - combinedAvailBWei
            : 0n;
    // a top-up applies only when exactly one side is short (you can't swap your
    // way out of being short on both)
    const topUpDeficientIsA = deficitAWei > 0n && deficitBWei === 0n;
    const topUpDeficientIsB = deficitBWei > 0n && deficitAWei === 0n;
    const topUpHasSingleDeficit = topUpDeficientIsA || topUpDeficientIsB;

    // shortfall to buy (deficient-token units) + the over-swap buffer
    const topUpDeficitWei = topUpDeficientIsA ? deficitAWei : deficitBWei;
    const zapBufferBps = BigInt(Math.round(ZAP_BUFFER_PERCENT * 100));
    const topUpBuyDeficientWei =
        (topUpDeficitWei * (10000n + zapBufferBps) + 9999n) / 10000n;
    const topUpBuyDeficientQty = toDisplayQty(
        topUpBuyDeficientWei,
        topUpDeficientIsA ? tokenA.decimals : tokenB.decimals,
    );
    const topUpBuyDeficientNum = parseFloat(topUpBuyDeficientQty);
    // amount of the surplus token the swap will consume to buy that shortfall.
    // Derive it from the POOL spot price (what the swap actually trades at)
    // rather than the two external USD feeds, whose relative drift on volatile
    // pairs could otherwise under- or over-estimate the surplus consumed and
    // mis-gate affordability. poolDisplayPrice is base-per-quote, so a base
    // deficient converts to quote surplus by dividing, a quote deficient to
    // base surplus by multiplying (mirrors calculateSecondaryDepositQty).
    const poolDisplayPrice =
        poolPriceNonDisplay !== undefined
            ? toDisplayPrice(
                  poolPriceNonDisplay,
                  baseTokenDecimals,
                  quoteTokenDecimals,
              )
            : undefined;
    const topUpDeficientIsBase = topUpDeficientIsA === isTokenABase;
    const topUpSwapSurplusNum =
        poolDisplayPrice && poolDisplayPrice > 0
            ? topUpDeficientIsBase
                ? topUpBuyDeficientNum / poolDisplayPrice
                : topUpBuyDeficientNum * poolDisplayPrice
            : NaN;
    const topUpNeededSurplusNum = topUpDeficientIsA
        ? neededTokenBNum
        : neededTokenANum;
    const topUpMaxSwapSurplusNum =
        topUpSwapSurplusNum * (1 + slippageTolerancePercentage / 100);
    const topUpSurplusDecimals = topUpDeficientIsA
        ? tokenB.decimals
        : tokenA.decimals;
    const topUpSurplusRequiredWei = fromDisplayQty(
        toTokenQtyString(
            topUpNeededSurplusNum + topUpMaxSwapSurplusNum,
            topUpSurplusDecimals,
        ),
        topUpSurplusDecimals,
    );
    const topUpAvailSurplusWei = topUpDeficientIsA
        ? combinedAvailBWei
        : combinedAvailAWei;
    // affordable only if the surplus side still covers its own position amount
    // after funding the swap
    const topUpAffordable =
        isFinite(topUpMaxSwapSurplusNum) &&
        topUpAvailSurplusWei >= topUpSurplusRequiredWei;
    const canOfferTopUp =
        zapEligible &&
        userHasTokenA &&
        userHasTokenB &&
        topUpHasSingleDeficit &&
        topUpAffordable;
    const canSwitchToTopUp =
        canOfferTopUp ||
        (isZapMode && twoTokenInputSnapshot?.canOfferTopUp === true);

    const topUpDeficientToken = topUpDeficientIsA ? tokenA : tokenB;
    const topUpSurplusToken = topUpDeficientIsA ? tokenB : tokenA;

    // input token defaults to whichever token the user holds; when the user
    // holds both (zap offered because a two-token entry overflows a balance),
    // default to the token they hold the most USD value of so the deposit is
    // funded by their larger holding rather than the insufficient side.
    const zapHeldValueA =
        (parseFloat(tokenABalance || '0') +
            parseFloat(tokenADexBalance || '0')) *
        (isTokenABase ? basePrice || 0 : quotePrice || 0);
    const zapHeldValueB =
        (parseFloat(tokenBBalance || '0') +
            parseFloat(tokenBDexBalance || '0')) *
        (isTokenABase ? quotePrice || 0 : basePrice || 0);
    const zapDefaultInputIsTokenA = userHoldsExactlyOneToken
        ? userHasTokenA
        : zapHeldValueA >= zapHeldValueB;
    const zapInputIsTokenA = zapInputSideAOverride ?? zapDefaultInputIsTokenA;
    const zapInputToken = zapInputIsTokenA ? tokenA : tokenB;
    const zapCounterpartToken = zapInputIsTokenA ? tokenB : tokenA;
    const zapInputBalance = zapInputIsTokenA ? tokenABalance : tokenBBalance;
    const zapInputDexBalance = zapInputIsTokenA
        ? tokenADexBalance
        : tokenBDexBalance;
    const isWithdrawZapFromDexChecked = zapInputIsTokenA
        ? isWithdrawTokenAFromDexChecked
        : isWithdrawTokenBFromDexChecked;
    const zapInputIsBase =
        (zapInputIsTokenA && isTokenABase) ||
        (!zapInputIsTokenA && !isTokenABase);
    const zapInputTokenUsdPrice = zapInputIsBase ? basePrice : quotePrice;

    const zapInputQtyNoExponentString = useMemo(() => {
        try {
            return zapInputQty.includes('e')
                ? toDisplayQty(
                      fromDisplayQty(
                          zapInputQty || '0',
                          zapInputToken.decimals,
                      ),
                      zapInputToken.decimals,
                  )
                : zapInputQty;
        } catch (error) {
            console.log({ error });
            return '0';
        }
    }, [zapInputQty, zapInputToken.decimals]);

    const isQtyEntered = isZapMode
        ? zapInputQtyNoExponentString !== ''
        : tokenAInputQtyNoExponentString !== '' &&
          tokenBInputQtyNoExponentString !== '';
    const showExtraInfoDropdown = isZapMode
        ? zapInputQtyNoExponentString !== ''
        : tokenAInputQtyNoExponentString !== '' ||
          tokenBInputQtyNoExponentString !== '';

    // return to the normal two-token deposit when the chosen swap-assisted mode
    // is no longer applicable, but never mid-flow: after the swap step the
    // balances shift, and tearing the mode down there would hide the stepper and
    // abort the pending mint. Stay put until the flow is reset.
    useEffect(() => {
        if (showConfirmation) return;
        if (isZapMode && !zapEligible) {
            setDepositMode('balanced');
            setZapInputQty('');
            setTwoTokenInputSnapshot(null);
        } else if (isTopUpMode && !canOfferTopUp) {
            setDepositMode('balanced');
        }
    }, [zapEligible, canOfferTopUp, isZapMode, isTopUpMode, showConfirmation]);

    // when the user holds only one of the two tokens (the other balance is
    // zero), default into single-token deposit mode. The latch ensures we only
    // auto-enable once per single-token episode, so the user is free to switch
    // back to two-token mode without being flipped back.
    const autoZapAppliedRef = useRef(false);
    useEffect(() => {
        if (zapEligible && userHoldsExactlyOneToken) {
            if (!autoZapAppliedRef.current) {
                autoZapAppliedRef.current = true;
                setDepositMode('single');
            }
        } else if (!showConfirmation) {
            autoZapAppliedRef.current = false;
        }
    }, [zapEligible, userHoldsExactlyOneToken, showConfirmation]);

    // The pool-derived value split for a zap, independent of the entered qty:
    // what fraction of the input token is swapped to the counterpart, and what
    // fraction of the position's value sits on the input (primary) side. Shared
    // by the deposit estimate and the two-token→one-token conversion so both
    // stay consistent with the tx builder (includes the over-swap buffer).
    const zapValueSplit = useMemo(() => {
        if (poolPriceNonDisplay === undefined) return null;
        const baseValueFraction = isAmbient
            ? 0.5
            : concDepositBalance(
                  poolPriceNonDisplay,
                  tickToPrice(defaultLowTick),
                  tickToPrice(defaultHighTick),
              );
        // fraction of the input's value that must be swapped to the counterpart
        const swapValueFraction = zapInputIsBase
            ? 1 - baseValueFraction
            : baseValueFraction;
        // apply the same over-swap buffer the tx builder uses so the estimate
        // matches what actually gets minted (excess counterpart returns as dust)
        const swapFraction = Math.min(
            swapValueFraction + ZAP_BUFFER_PERCENT / 100,
            1,
        );
        // fraction of the position's value on the input (primary) side
        const primaryValueFraction = zapInputIsBase
            ? baseValueFraction
            : 1 - baseValueFraction;
        return { swapFraction, primaryValueFraction };
    }, [
        poolPriceNonDisplay,
        zapInputIsBase,
        isAmbient,
        defaultLowTick,
        defaultHighTick,
    ]);

    // Estimated result of a zap deposit: how much of the input is swapped into
    // the counterpart, and the resulting position amounts. Uses the same
    // base/quote balance the tx builder targets (concDepositBalance) and USD
    // prices to value the swapped portion. Estimate only — excludes swap fees
    // and price impact.
    const zapSplit = useMemo(() => {
        const inputQtyNum = parseFloat(zapInputQtyNoExponentString);
        if (!isZapMode || !zapValueSplit || !(inputQtyNum > 0)) return null;
        const inputUsd = zapInputTokenUsdPrice;
        const counterpartUsd = zapInputIsBase ? quotePrice : basePrice;
        if (!inputUsd || !counterpartUsd) return null;

        const { swapFraction, primaryValueFraction } = zapValueSplit;

        const inputStayingAmount = (1 - swapFraction) * inputQtyNum;
        const swappedInputAmount = swapFraction * inputQtyNum;
        // the position mints a BALANCED amount against the primary side, not the
        // full bought counterpart — derive the counterpart from the primary
        // using the pool's value split so both sides are consistent
        const counterpartValueFraction = 1 - primaryValueFraction;
        const counterpartAmount =
            primaryValueFraction > 0
                ? (inputStayingAmount *
                      inputUsd *
                      (counterpartValueFraction / primaryValueFraction)) /
                  counterpartUsd
                : 0;

        return {
            inputStayingAmount,
            swappedInputAmount,
            counterpartAmount,
        };
    }, [
        isZapMode,
        zapInputQtyNoExponentString,
        zapValueSplit,
        zapInputTokenUsdPrice,
        zapInputIsBase,
        basePrice,
        quotePrice,
    ]);

    // display strings for the confirmation modal / token rows
    const zapPositionTokenAQty = zapSplit
        ? getFormattedNumber({
              value: zapInputIsTokenA
                  ? zapSplit.inputStayingAmount
                  : zapSplit.counterpartAmount,
              isInput: true,
          })
        : zapInputIsTokenA
          ? zapInputQtyNoExponentString
          : '';
    const zapPositionTokenBQty = zapSplit
        ? getFormattedNumber({
              value: zapInputIsTokenA
                  ? zapSplit.counterpartAmount
                  : zapSplit.inputStayingAmount,
              isInput: true,
          })
        : !zapInputIsTokenA
          ? zapInputQtyNoExponentString
          : '';
    const zapSwapDescription = zapSplit
        ? `≈ ${getFormattedNumber({
              value: zapSplit.swappedInputAmount,
              isInput: true,
          })} ${zapInputToken.symbol} will first be swapped to ${
              zapCounterpartToken.symbol
          }, then this position is minted with:`
        : undefined;

    // Two-step ("zap") progress for the stepper UI: swap, then mint. Renders as
    // a plan preview before submission and a live progress indicator during the
    // two transactions.
    const zapSteps: ZapStep[] = useMemo(() => {
        const swapStatus: ZapStepStatus =
            txError && zapStep === 'swap'
                ? 'error'
                : zapStep === 'mint' || isZapComplete
                  ? 'complete'
                  : zapStep === 'swap'
                    ? 'active'
                    : 'upcoming';
        const mintStatus: ZapStepStatus =
            txError && zapStep === 'mint'
                ? 'error'
                : isZapComplete
                  ? 'complete'
                  : zapStep === 'mint'
                    ? 'active'
                    : 'upcoming';
        // the swap leg differs by mode: single-token sells the deposited token,
        // top-up sells the surplus token to cover the deficient side
        const swapFromSymbol = isTopUpMode
            ? topUpSurplusToken.symbol
            : zapInputToken.symbol;
        const swapToSymbol = isTopUpMode
            ? topUpDeficientToken.symbol
            : zapCounterpartToken.symbol;
        return [
            {
                label: `Swap ${swapFromSymbol} → ${swapToSymbol}`,
                status: swapStatus,
            },
            {
                label: `Mint ${tokenA.symbol} / ${tokenB.symbol} position`,
                status: mintStatus,
            },
        ];
    }, [
        zapStep,
        isZapComplete,
        txError,
        isTopUpMode,
        topUpSurplusToken.symbol,
        topUpDeficientToken.symbol,
        zapInputToken.symbol,
        zapCounterpartToken.symbol,
        tokenA.symbol,
        tokenB.symbol,
    ]);
    const zapStepperElement =
        isZapMode || isTopUpMode ? <ZapStepper steps={zapSteps} /> : null;

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
        // reset swap-assisted deposit state on a pool change so a stale
        // token-side override (a boolean that would otherwise point at the new
        // pool's tokens) or a carried-over entry/snapshot from the previous
        // pool doesn't leak into the new pool's deposit UI. The auto-zap latch
        // is released so single-token mode can re-engage for the new pool.
        setDepositMode('balanced');
        setZapInputQty('');
        setZapInputSideAOverride(null);
        setTwoTokenInputSnapshot(null);
        autoZapAppliedRef.current = false;
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

    // reset activeTxHash when the pair changes or user updates quantity
    useEffect(() => {
        activeRangeTxHash.current = '';
    }, [tokenA.address, tokenB.address, primaryQuantity, zapInputQty]);

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
        setZapStep(null);
        setIsZapComplete(false);
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
    const clearZapInput = useCallback(() => setZapInputQty(''), []);
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

    // validation for the single-token (zap) input: only the deposited token is
    // checked against its own balance, so a missing counterpart no longer
    // blocks the mint.
    const zapSurplusMinusRemainderNum =
        fromDisplayQty(zapInputDexBalance || '0', zapInputToken.decimals) -
        fromDisplayQty(
            zapInputQtyNoExponentString || '0',
            zapInputToken.decimals,
        );
    const zapQtyCoveredByWalletBalance = isWithdrawZapFromDexChecked
        ? zapSurplusMinusRemainderNum < 0
            ? zapSurplusMinusRemainderNum * -1n
            : 0n
        : fromDisplayQty(
              zapInputQtyNoExponentString || '0',
              zapInputToken.decimals,
          );
    const {
        tokenAllowed: zapTokenAllowed,
        rangeButtonErrorMessage: zapButtonErrorMessage,
    } = useHandleRangeButtonMessage(
        zapInputToken,
        zapInputQtyNoExponentString,
        zapInputBalance,
        zapInputDexBalance,
        false,
        isWithdrawZapFromDexChecked,
        isPoolInitialized,
        zapQtyCoveredByWalletBalance,
        amountToReduceNativeTokenQty,
        activeRangeTxHash,
        clearZapInput,
    );

    // Approval for the single-token (zap) input. Only the portion pulled from
    // the WALLET needs an ERC-20 allowance — when the input is funded from the
    // exchange (surplus) balance the DEX already custodies it and the swap's
    // sellDexSurplus path needs no approval, so zapQtyCoveredByWalletBalance is
    // 0n and the checks below report "sufficient" (no approve button shown).
    // Both zap legs (the swap of swapQty and the mint of mintPrimaryQty) pull
    // the input token, but each is covered by an unlimited (MaxUint256)
    // approval; on Plume, where approvals are exact, we approve the full
    // wallet-covered qty (+1% for rounding) since across the two txs the total
    // pulled equals that amount.
    const zapInputAllowance = zapInputIsTokenA
        ? tokenAAllowance
        : tokenBAllowance;
    const isZapInputWalletBalanceSufficient =
        fromDisplayQty(zapInputBalance || '0', zapInputToken.decimals) >=
        zapQtyCoveredByWalletBalance;
    const isZapInputAllowanceSufficient =
        zapInputAllowance === undefined
            ? true
            : zapInputAllowance >= zapQtyCoveredByWalletBalance;
    const isUsdtResetRequiredZap =
        zapInputToken.address.toLowerCase() ===
            MAINNET_TOKENS.USDT.address.toLowerCase() &&
        !!zapInputAllowance &&
        zapInputAllowance < zapQtyCoveredByWalletBalance;

    const topUpSurplusWalletBalance = topUpDeficientIsA
        ? tokenBBalance
        : tokenABalance;
    const topUpSurplusDexBalance = topUpDeficientIsA
        ? tokenBDexBalance
        : tokenADexBalance;
    const topUpSurplusAllowance = topUpDeficientIsA
        ? tokenBAllowance
        : tokenAAllowance;
    const topUpSurplusIsEth = topUpDeficientIsA ? isTokenBEth : isTokenAEth;
    const topUpSurplusWalletWei = fromDisplayQty(
        topUpSurplusWalletBalance || '0',
        topUpSurplusToken.decimals,
    );
    const topUpSurplusDexWei = fromDisplayQty(
        topUpSurplusDexBalance || '0',
        topUpSurplusToken.decimals,
    );
    const topUpSurplusWalletRequiredWei =
        topUpSurplusRequiredWei > topUpSurplusDexWei
            ? topUpSurplusRequiredWei - topUpSurplusDexWei
            : 0n;
    const topUpSurplusApprovalWei =
        (topUpSurplusWalletRequiredWei * 101n + 99n) / 100n;
    const isTopUpSurplusWalletBalanceSufficient =
        !topUpSurplusIsEth ||
        topUpSurplusWalletRequiredWei +
            fromDisplayQty(
                amountToReduceNativeTokenQty.toString(),
                topUpSurplusToken.decimals,
            ) <=
            topUpSurplusWalletWei;
    const isTopUpSurplusAllowanceSufficient =
        topUpSurplusAllowance === undefined
            ? true
            : topUpSurplusAllowance >= topUpSurplusApprovalWei;
    const isUsdtResetRequiredTopUpSurplus =
        topUpSurplusToken.address.toLowerCase() ===
            MAINNET_TOKENS.USDT.address.toLowerCase() &&
        !!topUpSurplusAllowance &&
        topUpSurplusAllowance < topUpSurplusApprovalWei;
    const topUpSurplusNeedsApproval =
        isTopUpMode &&
        isPoolInitialized &&
        !topUpSurplusIsEth &&
        topUpSurplusWalletRequiredWei > 0n &&
        !isTopUpSurplusAllowanceSufficient;

    // Approval for the top-up deficient token. In top-up mode the swap (tx1)
    // only buys the shortfall into the exchange balance; the mint (tx2) then
    // pulls the user's EXISTING deficient-token balance too, and its WALLET
    // portion needs an ERC-20 allowance. The normal per-token approve button
    // doesn't surface this because it's gated on wallet-balance sufficiency,
    // which is false here (the entered amount deliberately exceeds the wallet
    // balance — that's the whole reason a top-up is needed). Approval is keyed
    // on the deficient token's wallet-funded portion after the existing and
    // freshly bought exchange balances are applied (native tokens need none).
    const topUpDeficientWalletBalance = topUpDeficientIsA
        ? tokenABalance
        : tokenBBalance;
    const topUpDeficientDexBalance = topUpDeficientIsA
        ? tokenADexBalance
        : tokenBDexBalance;
    const topUpDeficientAllowance = topUpDeficientIsA
        ? tokenAAllowance
        : tokenBAllowance;
    const topUpDeficientIsEth = topUpDeficientIsA ? isTokenAEth : isTokenBEth;
    const topUpDeficientWalletWei = fromDisplayQty(
        topUpDeficientWalletBalance || '0',
        topUpDeficientToken.decimals,
    );
    const topUpDeficientDexWei = fromDisplayQty(
        topUpDeficientDexBalance || '0',
        topUpDeficientToken.decimals,
    );
    const topUpDeficientNeededWei = topUpDeficientIsA
        ? neededTokenAWei
        : neededTokenBWei;
    const topUpDeficientAvailableDexWei =
        topUpDeficientDexWei + topUpBuyDeficientWei;
    const topUpDeficientWalletRequiredWei =
        topUpDeficientNeededWei > topUpDeficientAvailableDexWei
            ? topUpDeficientNeededWei - topUpDeficientAvailableDexWei
            : 0n;
    const topUpDeficientApprovalWei =
        (topUpDeficientWalletRequiredWei * 101n + 99n) / 100n;
    const isTopUpDeficientWalletBalanceSufficient =
        !topUpDeficientIsEth ||
        topUpDeficientWalletRequiredWei +
            fromDisplayQty(
                amountToReduceNativeTokenQty.toString(),
                topUpDeficientToken.decimals,
            ) <=
            topUpDeficientWalletWei;
    const isTopUpDeficientAllowanceSufficient =
        topUpDeficientAllowance === undefined
            ? true
            : topUpDeficientAllowance >= topUpDeficientWalletRequiredWei;
    const isUsdtResetRequiredTopUpDeficient =
        topUpDeficientToken.address.toLowerCase() ===
            MAINNET_TOKENS.USDT.address.toLowerCase() &&
        !!topUpDeficientAllowance &&
        topUpDeficientAllowance < topUpDeficientWalletRequiredWei;
    // shown only after the surplus-token approval (needed for tx1) is satisfied,
    // since the transaction needs that approval before the deficient-side mint
    const topUpDeficientNeedsApproval =
        isTopUpMode &&
        isPoolInitialized &&
        !topUpDeficientIsEth &&
        topUpDeficientWalletRequiredWei > 0n &&
        !isTopUpDeficientAllowanceSufficient;

    // effective button state, accounting for the active deposit mode. In
    // top-up mode the two-token entry deliberately overflows one side (the swap
    // covers it), so ignore that "exceeds" error and gate on affordability.
    const tokenAHasExpectedTopUpError =
        topUpDeficientIsA && rangeButtonErrorMessageTokenA.includes('Exceeds');
    const tokenBHasExpectedTopUpError =
        topUpDeficientIsB && rangeButtonErrorMessageTokenB.includes('Exceeds');
    const topUpBlockingErrorMessage =
        (!tokenAAllowed && !tokenAHasExpectedTopUpError
            ? rangeButtonErrorMessageTokenA
            : '') ||
        (!tokenBAllowed && !tokenBHasExpectedTopUpError
            ? rangeButtonErrorMessageTokenB
            : '');
    const topUpTokensAllowed =
        (tokenAAllowed || tokenAHasExpectedTopUpError) &&
        (tokenBAllowed || tokenBHasExpectedTopUpError) &&
        isTopUpSurplusWalletBalanceSufficient &&
        isTopUpDeficientWalletBalanceSufficient;
    const effectiveTokenAllowed = isZapMode
        ? zapTokenAllowed
        : isTopUpMode
          ? topUpAffordable && topUpTokensAllowed
          : tokenAAllowed && tokenBAllowed;
    const effectiveButtonErrorMessage = isZapMode
        ? zapButtonErrorMessage
        : isTopUpMode
          ? topUpBlockingErrorMessage ||
            (!isTopUpSurplusWalletBalanceSufficient
                ? `${topUpSurplusToken.symbol} Wallet Balance Insufficient to Cover Gas`
                : !isTopUpDeficientWalletBalanceSufficient
                  ? `${topUpDeficientToken.symbol} Wallet Balance Insufficient to Cover Gas`
                  : topUpAffordable
                    ? ''
                    : `${topUpSurplusToken.symbol} Balance Insufficient to Cover Swap`)
          : rangeButtonErrorMessageTokenA || rangeButtonErrorMessageTokenB;

    // a balanced two-token entry that overflows one side's combined wallet +
    // exchange balance — the user can instead deposit with the single token
    // they hold enough of
    const twoTokenAmountExceedsBalance =
        rangeButtonErrorMessageTokenA.includes('Exceeds') ||
        rangeButtonErrorMessageTokenB.includes('Exceeds');
    // offer the single-token deposit toggle when the user holds exactly one of
    // the pool's tokens, or when their balanced entry exceeds a balance
    const canOfferZap =
        zapEligible &&
        (userHoldsExactlyOneToken || twoTokenAmountExceedsBalance || isZapMode);

    // When switching from two-token to single-token deposit, seed the zap input
    // with the quantity that mints the SAME position the user already entered.
    // The two-token entry is already balanced by the pool, so the input token's
    // side becomes the position's staying amount; the total input to enter is
    // that staying amount grossed up by the swapped fraction. Returns '' when
    // there is nothing to convert.
    const deriveZapQtyFromTwoTokenEntry = (): string => {
        const inputStayingTarget = parseFloat(
            (zapInputIsTokenA
                ? tokenAInputQtyNoExponentString
                : tokenBInputQtyNoExponentString) || '0',
        );
        const swapFraction = zapValueSplit?.swapFraction;
        if (
            !(inputStayingTarget > 0) ||
            swapFraction === undefined ||
            swapFraction >= 1
        )
            return '';
        const qty = inputStayingTarget / (1 - swapFraction);
        if (!(qty > 0) || !isFinite(qty)) return '';
        // clamp to the input token's precision so fromDisplayQty accepts it,
        // then trim trailing zeros for a clean field value
        let s = qty.toFixed(zapInputToken.decimals);
        if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
        return s;
    };

    // switch between the normal, single-token, and top-up deposit modes. The
    // two-token entry is preserved for 'balanced'/'topup' (top-up uses it
    // directly); entering 'single' seeds the zap input from it and clears the
    // two-token fields the single UI replaces.
    const switchDepositMode = (mode: 'balanced' | 'single' | 'topup') => {
        if (mode === depositMode) return;
        if (mode === 'single') {
            setTwoTokenInputSnapshot({
                tokenAInputQty,
                tokenBInputQty,
                primaryQuantity,
                isTokenAPrimary,
                canOfferTopUp,
            });
            setZapInputQty(deriveZapQtyFromTwoTokenEntry());
            clearTokenInputs();
        } else {
            if (twoTokenInputSnapshot) {
                setTokenAInputQty(twoTokenInputSnapshot.tokenAInputQty);
                setTokenBInputQty(twoTokenInputSnapshot.tokenBInputQty);
                setPrimaryQuantity(twoTokenInputSnapshot.primaryQuantity);
                setIsTokenAPrimary(twoTokenInputSnapshot.isTokenAPrimary);
                setTwoTokenInputSnapshot(null);
            }
            setZapInputQty('');
        }
        setDepositMode(mode);
    };

    // human-readable estimate of the top-up swap for the confirmation modal
    const topUpSwapDescription =
        (canOfferTopUp || isTopUpMode) && isFinite(topUpSwapSurplusNum)
            ? `≈ ${getFormattedNumber({
                  value: topUpSwapSurplusNum,
                  isInput: true,
              })} ${topUpSurplusToken.symbol} will first be swapped to ${
                  topUpDeficientToken.symbol
              } to cover the shortfall, then this position is minted using your existing ${
                  tokenA.symbol
              } and ${tokenB.symbol} balances.`
            : undefined;

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
                ) : topUpSurplusNeedsApproval ? (
                    <Button
                        idForDOM='approve_token_for_range'
                        style={{ textTransform: 'none' }}
                        title={
                            !isApprovalPending
                                ? isUsdtResetRequiredTopUpSurplus
                                    ? 'Reset USDT Approval (Step 1/2)'
                                    : `Approve ${topUpSurplusToken.symbol}`
                                : isUsdtResetRequiredTopUpSurplus
                                  ? 'USDT Approval Reset Pending...'
                                  : `${topUpSurplusToken.symbol} Approval Pending...`
                        }
                        disabled={isApprovalPending}
                        action={async () => {
                            await approve(
                                topUpSurplusToken.address,
                                topUpSurplusToken.symbol,
                                undefined,
                                isUsdtResetRequiredTopUpSurplus
                                    ? 0n
                                    : isActiveNetworkPlume
                                      ? topUpSurplusApprovalWei
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
                ) : topUpDeficientNeedsApproval ? (
                    <Button
                        idForDOM='approve_token_for_range'
                        style={{ textTransform: 'none' }}
                        title={
                            !isApprovalPending
                                ? isUsdtResetRequiredTopUpDeficient
                                    ? 'Reset USDT Approval (Step 1/2)'
                                    : `Approve ${topUpDeficientToken.symbol}`
                                : isUsdtResetRequiredTopUpDeficient
                                  ? 'USDT Approval Reset Pending...'
                                  : `${topUpDeficientToken.symbol} Approval Pending...`
                        }
                        disabled={isApprovalPending}
                        action={async () => {
                            await approve(
                                topUpDeficientToken.address,
                                topUpDeficientToken.symbol,
                                undefined,
                                isUsdtResetRequiredTopUpDeficient
                                    ? 0n
                                    : isActiveNetworkPlume
                                      ? topUpDeficientApprovalWei
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
