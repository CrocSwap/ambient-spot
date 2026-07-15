import { MutableRefObject, useContext } from 'react';
import { CrocEnvContext } from '../../contexts/CrocEnvContext';

import { IS_LOCAL_ENV } from '../../ambient-utils/constants';
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
import {
    isTransactionFailedError,
    isTransactionReplacedError,
    TransactionError,
} from '../../utils/TransactionError';

// Single-token ("zap") deposit implemented as TWO transactions:
//   1. swap the correct portion of the deposited token into the counterpart
//      (output saved to the exchange/surplus balance), then
//   2. mint a balanced range/ambient position with the deposited token as the
//      primary side while the pool pulls the balanced counterpart from surplus.
//
// The atomic single-tx (OrderDirective rollType) approach was abandoned: a
// wallet-funded swap only seeds ONE side into the roll flow, which cannot mint
// a NEW two-sided position (verified on-chain — it reverts). The two-tx flow
// reuses the proven performSwap + createRangePositionTx paths, which work for
// new and existing positions alike.
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

    const createZapPosition = async (params: {
        slippageTolerancePercentage: number;
        isAmbient: boolean;
        inputTokenAddress: string;
        inputTokenQty: string;
        // where the input token is drawn from (exchange/surplus vs wallet)
        isWithdrawFromDexChecked: boolean;
        defaultLowTick: number;
        defaultHighTick: number;
        isAdd: boolean;
        setNewRangeTransactionHash: (
            value: React.SetStateAction<string>,
        ) => void;
        setTxError: (s: Error) => void;
        resetConfirmation: () => void;
        setIsTxCompletedRange?: React.Dispatch<React.SetStateAction<boolean>>;
        activeRangeTxHash: MutableRefObject<string>;
        // optional progress callback: 'swap' | 'mint'
        setZapStep?: (step: 'swap' | 'mint') => void;
    }) => {
        const {
            slippageTolerancePercentage,
            isAmbient,
            inputTokenAddress,
            inputTokenQty,
            isWithdrawFromDexChecked,
            defaultLowTick,
            defaultHighTick,
            isAdd,
            setNewRangeTransactionHash,
            setTxError,
            setIsTxCompletedRange,
            activeRangeTxHash,
            setZapStep,
        } = params;

        if (!crocEnv) return;

        const inputIsTokenA =
            inputTokenAddress.toLowerCase() === tokenA.address.toLowerCase();

        try {
            const split = await computeZapSplit({
                crocEnv,
                tokenA: tokenA.address,
                tokenB: tokenB.address,
                inputTokenAddress,
                inputTokenQty,
                isAmbient,
                tick: { low: defaultLowTick, high: defaultHighTick },
            });

            // ----- Transaction 1: swap the portion into the counterpart -----
            setZapStep?.('swap');
            const swapTx = await performSwap({
                crocEnv,
                isQtySell: true,
                qty: split.swapQty,
                sellTokenAddress: inputTokenAddress,
                buyTokenAddress: split.counterpartAddress,
                slippageTolerancePercentage,
                isWithdrawFromDexChecked,
                // keep the bought counterpart in the exchange balance so the
                // mint can consume it without another wallet approval
                isSaveAsDexSurplusChecked: true,
            });
            // NB: intentionally do NOT feed the swap hash to
            // setNewRangeTransactionHash — the modal footer derives its
            // confirmed/pending state from that hash, and surfacing the swap
            // there makes it flash "Transaction Confirmed" between the two
            // steps. The footer stays on the pending message and the stepper
            // conveys per-step progress; only the mint sets the range hash.
            activeRangeTxHash.current = swapTx?.hash;
            if (swapTx?.hash) {
                addPendingTx(swapTx.hash);
                addTransactionByType({
                    chainId,
                    userAddress: userAddress || '',
                    txHash: swapTx.hash,
                    txAction:
                        split.counterpartAddress.toLowerCase() ===
                        quoteToken.address.toLowerCase()
                            ? 'Buy'
                            : 'Sell',
                    txType: 'Market',
                    txDescription: `Swap for ${tokenA.symbol}/${tokenB.symbol} Zap`,
                    txDetails: {
                        baseAddress: baseToken.address,
                        quoteAddress: quoteToken.address,
                        poolIdx: poolIndex,
                        baseSymbol: baseToken.symbol,
                        quoteSymbol: quoteToken.symbol,
                        isBid: isTokenABase,
                    },
                });
            }

            // wait for the swap to confirm before minting
            let swapReceipt;
            try {
                swapReceipt = await provider?.waitForTransaction(swapTx.hash);
            } catch (e) {
                const err = e as TransactionError;
                if (isTransactionReplacedError(err)) {
                    removePendingTx(err.hash);
                    addPendingTx(err.replacement.hash);
                    swapReceipt = err.receipt;
                } else {
                    throw e;
                }
            }
            if (swapReceipt) {
                addReceipt(swapReceipt);
                removePendingTx(swapReceipt.hash);
            }

            // ----- Transaction 2: mint the balanced position ----------------
            setZapStep?.('mint');
            const posHash = getPositionHash(undefined, {
                isPositionTypeAmbient: isAmbient,
                user: userAddress ?? '',
                baseAddress: baseToken.address,
                quoteAddress: quoteToken.address,
                poolIdx: poolIndex,
                bidTick: defaultLowTick,
                askTick: defaultHighTick,
            });

            // input token keeps its own surplus/wallet source; the counterpart
            // was saved to surplus by the swap above
            const inputSide = {
                address: inputTokenAddress,
                qty: split.mintPrimaryQty,
                isWithdrawFromDexChecked,
            };
            const counterpartSide = {
                address: split.counterpartAddress,
                qty: '0',
                isWithdrawFromDexChecked: true,
            };

            const mintTx = await createRangePositionTx({
                crocEnv,
                isAmbient,
                slippageTolerancePercentage,
                tokenA: inputIsTokenA ? inputSide : counterpartSide,
                tokenB: inputIsTokenA ? counterpartSide : inputSide,
                // primary is the deposited (input) token, so the pool derives &
                // pulls the balanced counterpart from surplus
                isTokenAPrimary: inputIsTokenA,
                tick: { low: defaultLowTick, high: defaultHighTick },
            });

            setNewRangeTransactionHash(mintTx?.hash);
            addPendingTx(mintTx?.hash);
            activeRangeTxHash.current = mintTx?.hash;

            if (mintTx?.hash)
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
                        initialTokenQty: split.mintPrimaryQty,
                        secondaryTokenQty: '',
                    },
                });

            addPositionUpdate({
                txHash: mintTx.hash,
                positionID: posHash,
                isLimit: false,
                unixTimeAdded: Math.floor(Date.now() / 1000),
            });

            let mintReceipt;
            try {
                mintReceipt = await waitForTransaction(
                    provider,
                    mintTx.hash,
                    removePendingTx,
                    addPendingTx,
                    updateTransactionHash,
                    setNewRangeTransactionHash,
                    posHash,
                    addPositionUpdate,
                );
            } catch (e) {
                const error = e as TransactionError;
                console.error({ error });
                if (isTransactionReplacedError(error)) {
                    IS_LOCAL_ENV && console.debug('repriced');
                    removePendingTx(error.hash);
                    const newTransactionHash = error.replacement.hash;
                    addPendingTx(newTransactionHash);
                    activeRangeTxHash.current = newTransactionHash;
                    addPositionUpdate({
                        txHash: newTransactionHash,
                        positionID: posHash,
                        isLimit: false,
                        unixTimeAdded: Math.floor(Date.now() / 1000),
                    });
                    updateTransactionHash(error.hash, error.replacement.hash);
                    setNewRangeTransactionHash(newTransactionHash);
                } else if (isTransactionFailedError(error)) {
                    activeRangeTxHash.current = '';
                    mintReceipt = error.receipt;
                }
            }
            if (mintReceipt) {
                addReceipt(mintReceipt);
                removePendingTx(mintReceipt.hash);
                if (setIsTxCompletedRange) {
                    setIsTxCompletedRange(true);
                }
            }
        } catch (error) {
            console.error({ error });
            setTxError(error as Error);
        }
    };

    return { createZapPosition };
}
