import { TransactionResponse } from 'ethers';
import { MutableRefObject, useContext } from 'react';
import { CrocEnvContext } from '../../contexts/CrocEnvContext';

import { waitForTransaction } from '../../ambient-utils/dataLayer';
import { getPositionHash } from '../../ambient-utils/dataLayer/functions/getPositionHash';
import { createRangePositionTx } from '../../ambient-utils/dataLayer/transactions/range';
import { performSwap } from '../../ambient-utils/dataLayer/transactions/swap';
import { computeZapSplit } from '../../ambient-utils/dataLayer/transactions/zap';
import { AppStateContext } from '../../contexts';
import { ReceiptContext } from '../../contexts/ReceiptContext';
import { TradeDataContext } from '../../contexts/TradeDataContext';
import { TradeTokenContext } from '../../contexts/TradeTokenContext';
import { UserDataContext } from '../../contexts/UserDataContext';

export type ZapOutcome = 'complete' | 'failed';

// UI callbacks shared by both swap-assisted deposit flows
interface SwapThenMintProgress {
    isAmbient: boolean;
    defaultLowTick: number;
    defaultHighTick: number;
    isAdd: boolean;
    setNewRangeTransactionHash: (value: React.SetStateAction<string>) => void;
    setTxError: (s: Error) => void;
    activeRangeTxHash: MutableRefObject<string>;
    setZapStep: (step: 'swap' | 'mint') => void;
    setZapOutcome: (outcome: ZapOutcome) => void;
}

// What a flow submits: the swap leg, then the mint leg. `sendMint` is only
// called once the swap has confirmed successfully.
interface SwapThenMintPlan {
    sellTokenAddress: string;
    buyTokenAddress: string;
    swapLabel: string;
    sendSwap: () => Promise<TransactionResponse>;
    sendMint: () => Promise<TransactionResponse>;
    // the mint's primary-side display qty, for the pending-tx record
    mintPrimaryQty: string;
}

// Swap-assisted deposits are TWO transactions: a swap that leaves the bought
// token in the exchange balance, then a mint that consumes it. The atomic
// single-tx (OrderDirective rollType) approach was abandoned: a wallet-funded
// swap only seeds ONE side into the roll flow, which cannot mint a NEW
// two-sided position (verified on-chain — it reverts).
export function useCreateZapPosition() {
    const { crocEnv, provider } = useContext(CrocEnvContext);

    const {
        activeNetwork: { gridSize, poolIndex, chainId },
    } = useContext(AppStateContext);

    const { userAddress } = useContext(UserDataContext);

    const {
        baseToken: { address: baseTokenAddress },
    } = useContext(TradeTokenContext);

    const { tokenA, tokenB, baseToken, quoteToken } =
        useContext(TradeDataContext);
    const {
        addPendingTx,
        addReceipt,
        addPositionUpdate,
        addTransactionByType,
        removePendingTx,
        updateTransactionHash,
    } = useContext(ReceiptContext);

    const isTokenABase = tokenA.address === baseTokenAddress;
    const baseTokenDecimals = isTokenABase ? tokenA.decimals : tokenB.decimals;
    const quoteTokenDecimals = !isTokenABase
        ? tokenA.decimals
        : tokenB.decimals;

    const runSwapThenMint = async (
        progress: SwapThenMintProgress,
        buildPlan: () => Promise<SwapThenMintPlan>,
    ) => {
        const {
            isAmbient,
            defaultLowTick,
            defaultHighTick,
            isAdd,
            setNewRangeTransactionHash,
            setTxError,
            activeRangeTxHash,
            setZapStep,
            setZapOutcome,
        } = progress;

        // set before planning so a planning failure surfaces on the swap step
        setZapStep('swap');
        try {
            const plan = await buildPlan();

            // ----- Transaction 1: swap ---------------------------------------
            // The swap hash is deliberately NOT fed to setNewRangeTransactionHash
            // (the footer would flash "Transaction Confirmed" between steps) nor
            // to activeRangeTxHash (input-clearing keys on it, and a top-up
            // entry exceeds its balance by design, so it would clear mid-flow).
            const swapTx = await plan.sendSwap();
            addPendingTx(swapTx.hash);
            addTransactionByType({
                chainId,
                userAddress: userAddress || '',
                txHash: swapTx.hash,
                txAction:
                    plan.buyTokenAddress.toLowerCase() ===
                    quoteToken.address.toLowerCase()
                        ? 'Buy'
                        : 'Sell',
                txType: 'Market',
                txDescription: `Swap for ${tokenA.symbol}/${tokenB.symbol} ${plan.swapLabel}`,
                txDetails: {
                    baseAddress: baseToken.address,
                    quoteAddress: quoteToken.address,
                    poolIdx: poolIndex,
                    baseSymbol: baseToken.symbol,
                    quoteSymbol: quoteToken.symbol,
                    isBid:
                        plan.sellTokenAddress.toLowerCase() ===
                        baseToken.address.toLowerCase(),
                },
            });

            // follows wallet speed-ups/replacements; resolves on revert too
            const swapReceipt = await waitForTransaction(
                provider,
                swapTx.hash,
                removePendingTx,
                addPendingTx,
                updateTransactionHash,
            );
            if (!swapReceipt) throw new Error('Swap receipt not found');
            addReceipt(swapReceipt);
            removePendingTx(swapReceipt.hash);
            if (swapReceipt.status !== 1) {
                throw new Error(
                    'The swap transaction failed, so no position was minted.',
                );
            }

            // ----- Transaction 2: mint -------------------------------------
            setZapStep('mint');
            const posHash = getPositionHash(undefined, {
                isPositionTypeAmbient: isAmbient,
                user: userAddress ?? '',
                baseAddress: baseToken.address,
                quoteAddress: quoteToken.address,
                poolIdx: poolIndex,
                bidTick: defaultLowTick,
                askTick: defaultHighTick,
            });

            const mintTx = await plan.sendMint();
            setNewRangeTransactionHash(mintTx.hash);
            addPendingTx(mintTx.hash);
            activeRangeTxHash.current = mintTx.hash;
            addTransactionByType({
                chainId,
                userAddress: userAddress || '',
                txHash: mintTx.hash,
                txAction: 'Add',
                txType: 'Range',
                txDescription: isAdd
                    ? `Add to Range ${tokenA.symbol}+${tokenB.symbol}`
                    : `Create Range ${tokenA.symbol}+${tokenB.symbol}`,
                txDetails: {
                    baseAddress: baseToken.address,
                    quoteAddress: quoteToken.address,
                    poolIdx: poolIndex,
                    baseSymbol: baseToken.symbol,
                    quoteSymbol: quoteToken.symbol,
                    baseTokenDecimals: baseTokenDecimals,
                    quoteTokenDecimals: quoteTokenDecimals,
                    isAmbient: isAmbient,
                    lowTick: defaultLowTick,
                    highTick: defaultHighTick,
                    gridSize: gridSize,
                    initialTokenQty: plan.mintPrimaryQty,
                    secondaryTokenQty: '',
                },
            });
            addPositionUpdate({
                txHash: mintTx.hash,
                positionID: posHash,
                isLimit: false,
                unixTimeAdded: Math.floor(Date.now() / 1000),
            });

            const mintReceipt = await waitForTransaction(
                provider,
                mintTx.hash,
                removePendingTx,
                addPendingTx,
                updateTransactionHash,
                setNewRangeTransactionHash,
                posHash,
                addPositionUpdate,
            );
            if (!mintReceipt) throw new Error('Mint receipt not found');
            addReceipt(mintReceipt);
            removePendingTx(mintReceipt.hash);
            if (mintReceipt.status === 1) {
                setZapOutcome('complete');
            } else {
                // the footer reports the failed receipt; the stepper marks it
                activeRangeTxHash.current = '';
                setZapOutcome('failed');
            }
        } catch (error) {
            console.error({ error });
            setTxError(error as Error);
        }
    };

    // Single-token deposit: swap the computed portion of the input token into
    // the counterpart, then mint with the input token as primary while the
    // pool pulls the balanced counterpart from the exchange balance.
    const createZapPosition = async (
        params: SwapThenMintProgress & {
            slippageTolerancePercentage: number;
            inputTokenAddress: string;
            inputTokenQty: string;
            // where the input token is drawn from (exchange/surplus vs wallet)
            isWithdrawFromDexChecked: boolean;
        },
    ) => {
        if (!crocEnv) return;
        const {
            slippageTolerancePercentage,
            isAmbient,
            inputTokenAddress,
            inputTokenQty,
            isWithdrawFromDexChecked,
            defaultLowTick,
            defaultHighTick,
        } = params;
        const inputIsTokenA =
            inputTokenAddress.toLowerCase() === tokenA.address.toLowerCase();

        await runSwapThenMint(params, async () => {
            const split = await computeZapSplit({
                crocEnv,
                tokenA: tokenA.address,
                tokenB: tokenB.address,
                inputTokenAddress,
                inputTokenQty,
                isAmbient,
                tick: { low: defaultLowTick, high: defaultHighTick },
            });
            const inputSide = {
                address: inputTokenAddress,
                qty: split.mintPrimaryQty,
                isWithdrawFromDexChecked,
            };
            // the swap saved the counterpart to the exchange balance
            const counterpartSide = {
                address: split.counterpartAddress,
                qty: '0',
                isWithdrawFromDexChecked: true,
            };
            return {
                sellTokenAddress: inputTokenAddress,
                buyTokenAddress: split.counterpartAddress,
                swapLabel: 'Zap',
                mintPrimaryQty: split.mintPrimaryQty,
                sendSwap: () =>
                    performSwap({
                        crocEnv,
                        isQtySell: true,
                        qty: split.swapQty,
                        sellTokenAddress: inputTokenAddress,
                        buyTokenAddress: split.counterpartAddress,
                        slippageTolerancePercentage,
                        isWithdrawFromDexChecked,
                        isSaveAsDexSurplusChecked: true,
                    }),
                sendMint: () =>
                    createRangePositionTx({
                        crocEnv,
                        isAmbient,
                        slippageTolerancePercentage,
                        tokenA: inputIsTokenA ? inputSide : counterpartSide,
                        tokenB: inputIsTokenA ? counterpartSide : inputSide,
                        isTokenAPrimary: inputIsTokenA,
                        tick: { low: defaultLowTick, high: defaultHighTick },
                    }),
            };
        });
    };

    // Top-up deposit: the user holds some of both tokens but the entry
    // overflows one side. Buy ONLY the deficient token's shortfall with the
    // surplus token, then mint from combined wallet+exchange balances.
    //
    // The SURPLUS token is the mint's primary (fixed) side. The swap buys the
    // deficient token, raising its price, which raises the surplus amount a
    // fixed deficient qty would need — beyond what affordability and approvals
    // were sized for. Fixing the surplus side instead means the higher price
    // LOWERS the derived deficient amount, which the buffered buy covers.
    const createTopUpPosition = async (
        params: SwapThenMintProgress & {
            slippageTolerancePercentage: number;
            // deficient token to buy, and the shortfall to buy (display)
            buyTokenAddress: string;
            buyTokenQty: string;
            // surplus token sold to fund the swap
            sellTokenAddress: string;
            // the entered surplus-side amount, minted as the primary
            surplusTokenQty: string;
            surplusIsTokenA: boolean;
        },
    ) => {
        if (!crocEnv) return;
        const {
            slippageTolerancePercentage,
            isAmbient,
            buyTokenAddress,
            buyTokenQty,
            sellTokenAddress,
            surplusTokenQty,
            surplusIsTokenA,
            defaultLowTick,
            defaultHighTick,
        } = params;

        // both sides draw from exchange+wallet so existing balances plus the
        // swapped shortfall fund the mint
        const surplusSide = {
            address: sellTokenAddress,
            qty: surplusTokenQty,
            isWithdrawFromDexChecked: true,
        };
        const deficientSide = {
            address: buyTokenAddress,
            qty: '0',
            isWithdrawFromDexChecked: true,
        };

        await runSwapThenMint(params, async () => ({
            sellTokenAddress,
            buyTokenAddress,
            swapLabel: 'Top-Up',
            mintPrimaryQty: surplusTokenQty,
            sendSwap: () =>
                performSwap({
                    crocEnv,
                    isQtySell: false,
                    qty: buyTokenQty,
                    sellTokenAddress,
                    buyTokenAddress,
                    slippageTolerancePercentage,
                    isWithdrawFromDexChecked: true,
                    isSaveAsDexSurplusChecked: true,
                }),
            sendMint: () =>
                createRangePositionTx({
                    crocEnv,
                    isAmbient,
                    slippageTolerancePercentage,
                    tokenA: surplusIsTokenA ? surplusSide : deficientSide,
                    tokenB: surplusIsTokenA ? deficientSide : surplusSide,
                    isTokenAPrimary: surplusIsTokenA,
                    tick: { low: defaultLowTick, high: defaultHighTick },
                }),
        }));
    };

    return { createZapPosition, createTopUpPosition };
}
