import {
    concDepositBalance,
    fromDisplayQty,
    tickToPrice,
    toDisplayPrice,
    toDisplayQty,
} from '@crocswap-libs/sdk';
import {
    Dispatch,
    MutableRefObject,
    SetStateAction,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { MAINNET_TOKENS } from '../../../../ambient-utils/constants/networks/ethereumMainnet';
import { getFormattedNumber } from '../../../../ambient-utils/dataLayer';
import { ZAP_BUFFER_PERCENT } from '../../../../ambient-utils/dataLayer/transactions/zap';
import { TokenIF } from '../../../../ambient-utils/types';
import { useHandleRangeButtonMessage } from '../../../../App/hooks/useHandleRangeButtonMessage';
import {
    ZapStep,
    ZapStepStatus,
} from '../../../../components/Trade/Range/RangeTokenInput/ZapStepper';
import { PoolContext } from '../../../../contexts/PoolContext';
import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import { TradeTokenContext } from '../../../../contexts/TradeTokenContext';

// --- Swap-assisted deposits -------------------------------------------------
// Two ways to fund an in-range position that needs both tokens when the user's
// balances don't already cover a balanced entry:
//   'single' — deposit ONE token; a swap converts the correct portion and the
//              position mints balanced from it (see useCreateZapPosition)
//   'topup'  — keep the two-token entry, use the balances the user already
//              holds of BOTH tokens, and swap only the shortfall on the
//              deficient side (see createTopUpPosition)
// 'balanced' is the normal two-token deposit with no swap.
export type DepositMode = 'balanced' | 'single' | 'topup';

// format a float to a token's precision as a plain (non-exponential) string
const toTokenQtyString = (value: number, decimals: number): string => {
    if (!(value > 0) || !isFinite(value)) return '0';
    let s = value.toFixed(decimals);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
};

// The approval cushion carried over a top-up leg's estimated wallet pull. The
// pull is estimated in display units and converted to wei, so it can drift by a
// rounding margin from what the contracts actually take.
const TOP_UP_APPROVAL_BUFFER_PERCENT = 1n;

// Single owner for a top-up leg's wallet requirement and ERC-20 allowance. Both
// legs answer the same questions, and both must answer them the same way: the
// amount we approve and the amount we check sufficiency against are one number,
// so an allowance sitting just under the cushion can't pass the check and then
// revert the transaction. That matters most on the deficient side, whose
// allowance gates tx2 after tx1's swap has already executed and moved the
// user's balances.
function topUpSideApproval(input: {
    token: TokenIF;
    isNative: boolean;
    allowance: bigint | undefined;
    walletBalance: string;
    dexBalance: string;
    // total this leg pulls for the token, across wallet and exchange balances
    requiredWei: bigint;
    // exchange balance the transaction itself creates before this leg pulls
    extraDexWei?: bigint;
    nativeGasReserve: number;
    enabled: boolean;
}) {
    const {
        token,
        isNative,
        allowance,
        requiredWei,
        nativeGasReserve,
        enabled,
    } = input;
    const availableDexWei =
        fromDisplayQty(input.dexBalance || '0', token.decimals) +
        (input.extraDexWei ?? 0n);
    const walletRequiredWei =
        requiredWei > availableDexWei ? requiredWei - availableDexWei : 0n;
    const approvalWei =
        (walletRequiredWei * (100n + TOP_UP_APPROVAL_BUFFER_PERCENT) + 99n) /
        100n;
    const isAllowanceSufficient =
        allowance === undefined ? true : allowance >= approvalWei;
    return {
        walletRequiredWei,
        approvalWei,
        isAllowanceSufficient,
        // a native token needs no allowance, but its wallet balance must still
        // cover the pull plus the gas held back for the transaction itself
        isWalletBalanceSufficient:
            !isNative ||
            walletRequiredWei +
                fromDisplayQty(nativeGasReserve.toString(), token.decimals) <=
                fromDisplayQty(input.walletBalance || '0', token.decimals),
        isUsdtResetRequired:
            token.address.toLowerCase() ===
                MAINNET_TOKENS.USDT.address.toLowerCase() &&
            !!allowance &&
            allowance < approvalWei,
        needsApproval:
            enabled &&
            !isNative &&
            walletRequiredWei > 0n &&
            !isAllowanceSufficient,
    };
}

interface UseZapDepositArgs {
    // shape of the range being minted
    isAmbient: boolean;
    isInvalidRange: boolean;
    defaultLowTick: number;
    defaultHighTick: number;
    isTokenAInputDisabled: boolean;
    isTokenBInputDisabled: boolean;
    isPoolInitialized: boolean;
    slippageTolerancePercentage: number;
    // the two-token entry this hook may convert from or top up
    tokenAInputQty: string;
    tokenBInputQty: string;
    tokenAInputQtyNoExponentString: string;
    tokenBInputQtyNoExponentString: string;
    setTokenAInputQty: Dispatch<SetStateAction<string>>;
    setTokenBInputQty: Dispatch<SetStateAction<string>>;
    clearTokenInputs: () => void;
    primaryQuantity: string;
    setPrimaryQuantity: Dispatch<SetStateAction<string>>;
    isTokenAPrimary: boolean;
    setIsTokenAPrimary: Dispatch<SetStateAction<boolean>>;
    isWithdrawTokenAFromDexChecked: boolean;
    isWithdrawTokenBFromDexChecked: boolean;
    // two-token button state, folded into the mode-aware button state below
    tokenAAllowed: boolean;
    tokenBAllowed: boolean;
    rangeButtonErrorMessageTokenA: string;
    rangeButtonErrorMessageTokenB: string;
    // submission state
    showConfirmation: boolean;
    txError: Error | undefined;
    amountToReduceNativeTokenQty: number;
    activeRangeTxHash: MutableRefObject<string>;
}

// Owns everything specific to the swap-assisted ('single' and 'topup') deposit
// modes: mode state, eligibility, the swap/mint split math, per-mode balance and
// allowance requirements, and the mode-aware submit-button state. Range renders
// from this; it does not recompute any of it.
export function useZapDeposit(args: UseZapDepositArgs) {
    const {
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
    } = args;

    const { tokenA, tokenB, baseToken, quoteToken, poolPriceNonDisplay } =
        useContext(TradeDataContext);
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
    const {
        poolData: { basePrice, quotePrice },
    } = useContext(PoolContext);

    const [depositMode, setDepositMode] = useState<DepositMode>('balanced');
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
    const [twoTokenInputSnapshot, setTwoTokenInputSnapshot] = useState<{
        tokenAInputQty: string;
        tokenBInputQty: string;
        primaryQuantity: string;
        isTokenAPrimary: boolean;
        canOfferTopUp: boolean;
    } | null>(null);

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

    // reset swap-assisted deposit state on a pool change so a stale token-side
    // override (a boolean that would otherwise point at the new pool's tokens)
    // or a carried-over entry/snapshot from the previous pool doesn't leak into
    // the new pool's deposit UI. The auto-zap latch is released so single-token
    // mode can re-engage for the new pool.
    useEffect(() => {
        setDepositMode('balanced');
        setZapInputQty('');
        setZapInputSideAOverride(null);
        setTwoTokenInputSnapshot(null);
        autoZapAppliedRef.current = false;
    }, [baseToken.address, quoteToken.address]);

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
    const clearZapInput = useCallback(() => setZapInputQty(''), []);
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

    // Both top-up legs pull a wallet-funded portion of their token: the swap
    // (tx1) sells the surplus token, and the mint (tx2) pulls the deficient
    // token the user already holds. The deficient side is not covered by the
    // normal per-token approve button, which is gated on wallet-balance
    // sufficiency — false here, since the entered amount deliberately exceeds
    // the wallet balance, which is the whole reason a top-up is needed.
    const topUpApprovalEnabled = isTopUpMode && isPoolInitialized;
    const topUpSurplus = topUpSideApproval({
        token: topUpSurplusToken,
        isNative: topUpDeficientIsA ? isTokenBEth : isTokenAEth,
        allowance: topUpDeficientIsA ? tokenBAllowance : tokenAAllowance,
        walletBalance: topUpDeficientIsA ? tokenBBalance : tokenABalance,
        dexBalance: topUpDeficientIsA ? tokenBDexBalance : tokenADexBalance,
        requiredWei: topUpSurplusRequiredWei,
        nativeGasReserve: amountToReduceNativeTokenQty,
        enabled: topUpApprovalEnabled,
    });
    const topUpDeficient = topUpSideApproval({
        token: topUpDeficientToken,
        isNative: topUpDeficientIsA ? isTokenAEth : isTokenBEth,
        allowance: topUpDeficientIsA ? tokenAAllowance : tokenBAllowance,
        walletBalance: topUpDeficientIsA ? tokenABalance : tokenBBalance,
        dexBalance: topUpDeficientIsA ? tokenADexBalance : tokenBDexBalance,
        requiredWei: topUpDeficientIsA ? neededTokenAWei : neededTokenBWei,
        // tx1 buys the shortfall into the exchange balance, so the mint can
        // draw on it on top of whatever the user already holds there
        extraDexWei: topUpBuyDeficientWei,
        nativeGasReserve: amountToReduceNativeTokenQty,
        enabled: topUpApprovalEnabled,
    });

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
        topUpSurplus.isWalletBalanceSufficient &&
        topUpDeficient.isWalletBalanceSufficient;
    const effectiveTokenAllowed = isZapMode
        ? zapTokenAllowed
        : isTopUpMode
          ? topUpAffordable && topUpTokensAllowed
          : tokenAAllowed && tokenBAllowed;
    const effectiveButtonErrorMessage = isZapMode
        ? zapButtonErrorMessage
        : isTopUpMode
          ? topUpBlockingErrorMessage ||
            (!topUpSurplus.isWalletBalanceSufficient
                ? `${topUpSurplusToken.symbol} Wallet Balance Insufficient to Cover Gas`
                : !topUpDeficient.isWalletBalanceSufficient
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
        return toTokenQtyString(qty, zapInputToken.decimals);
    };

    // switch between the normal, single-token, and top-up deposit modes. The
    // two-token entry is preserved for 'balanced'/'topup' (top-up uses it
    // directly); entering 'single' seeds the zap input from it and clears the
    // two-token fields the single UI replaces.
    const switchDepositMode = (mode: DepositMode) => {
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

    // reset the two-step progress so a re-submission starts from step 1
    const resetZapProgress = useCallback(() => {
        setZapStep(null);
        setIsZapComplete(false);
    }, []);

    return {
        // mode
        depositMode,
        isZapMode,
        isTopUpMode,
        switchDepositMode,
        canOfferZap,
        canSwitchToTopUp,
        // single-token input
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
        // top-up
        topUpDeficientIsA,
        topUpDeficientToken,
        topUpSurplusToken,
        topUpBuyDeficientQty,
        topUpSwapDescription,
        topUpSurplus,
        topUpDeficient,
        // submission progress
        zapSteps,
        setZapStep,
        setIsZapComplete,
        resetZapProgress,
        // mode-aware button state
        effectiveTokenAllowed,
        effectiveButtonErrorMessage,
    };
}
