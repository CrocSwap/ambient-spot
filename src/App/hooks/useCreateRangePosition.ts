import { MutableRefObject, useContext } from 'react';
import { CrocEnvContext } from '../../contexts/CrocEnvContext';

import {
    DISABLE_WORKAROUNDS,
    IS_LOCAL_ENV,
    ZERO_ADDRESS,
} from '../../ambient-utils/constants';
import { waitForTransaction } from '../../ambient-utils/dataLayer';
import { getPositionHash } from '../../ambient-utils/dataLayer/functions/getPositionHash';
import { createRangePositionTx } from '../../ambient-utils/dataLayer/transactions/range';
import { AppStateContext } from '../../contexts';
import { ReceiptContext } from '../../contexts/ReceiptContext';
import { TradeDataContext } from '../../contexts/TradeDataContext';
import { TradeTokenContext } from '../../contexts/TradeTokenContext';
import { UserDataContext } from '../../contexts/UserDataContext';
import {
    TxOutcome,
    txOutcomeFromError,
    txOutcomeFromReceipt,
} from '../../utils/analytics';
import {
    isTransactionDeniedError,
    isTransactionFailedError,
    isTransactionReplacedError,
    TransactionError,
} from '../../utils/TransactionError';

export function useCreateRangePosition() {
    const { crocEnv, provider } = useContext(CrocEnvContext);

    const {
        activeNetwork: { gridSize, poolIndex, chainId },
    } = useContext(AppStateContext);

    const { userAddress } = useContext(UserDataContext);

    const {
        baseToken: { address: baseTokenAddress },
    } = useContext(TradeTokenContext);

    const { tokenA, tokenB, baseToken, quoteToken, isTokenAPrimary } =
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
    const tokenADecimals = tokenA.decimals;
    const tokenBDecimals = tokenB.decimals;
    const baseTokenDecimals = isTokenABase ? tokenADecimals : tokenBDecimals;
    const quoteTokenDecimals = !isTokenABase ? tokenADecimals : tokenBDecimals;

    const createRangePosition = async (params: {
        slippageTolerancePercentage: number;
        isAmbient: boolean;
        tokenAInputQty: string;
        tokenBInputQty: string;
        isWithdrawTokenAFromDexChecked: boolean;
        isWithdrawTokenBFromDexChecked: boolean;
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
    }): Promise<TxOutcome | undefined> => {
        const {
            slippageTolerancePercentage,
            isAmbient,
            tokenAInputQty,
            tokenBInputQty,
            isWithdrawTokenAFromDexChecked,
            isWithdrawTokenBFromDexChecked,
            defaultLowTick,
            defaultHighTick,
            isAdd,
            setNewRangeTransactionHash,
            setTxError,
            setIsTxCompletedRange,
            activeRangeTxHash,
        } = params;

        if (!crocEnv) return;

        let tx;

        const posHash = getPositionHash(undefined, {
            isPositionTypeAmbient: isAmbient,
            user: userAddress ?? '',
            baseAddress: baseToken.address,
            quoteAddress: quoteToken.address,
            poolIdx: poolIndex,
            bidTick: defaultLowTick,
            askTick: defaultHighTick,
        });

        try {
            const pos = crocEnv.positions(
                baseToken.address,
                quoteToken.address,
                userAddress ?? '',
            );

            const currentLiqBigInt = isAmbient
                ? (await pos.queryAmbientPos()).liq
                : (await pos.queryRangePos(defaultLowTick, defaultHighTick))
                      .liq;
            try {
                tx = await createRangePositionTx({
                    crocEnv,
                    isAmbient,
                    slippageTolerancePercentage,
                    tokenA: {
                        address: tokenA.address,
                        qty: tokenAInputQty,
                        isWithdrawFromDexChecked:
                            isWithdrawTokenAFromDexChecked,
                    },
                    tokenB: {
                        address: tokenB.address,
                        qty: tokenBInputQty,
                        isWithdrawFromDexChecked:
                            isWithdrawTokenBFromDexChecked,
                    },
                    isTokenAPrimary,
                    tick: { low: defaultLowTick, high: defaultHighTick },
                });
            } catch (error) {
                // If the user's requested position fails to create and its the non-primary side is ETH,
                // try to create the same position but with the ETH amount static instead of floating.
                if (
                    (isTokenAPrimary && tokenB.address != ZERO_ADDRESS) ||
                    (!isTokenAPrimary && tokenA.address != ZERO_ADDRESS) ||
                    isTransactionDeniedError(error) ||
                    DISABLE_WORKAROUNDS
                ) {
                    throw error;
                }
                console.log(
                    'position creation with floating ETH failed, trying static ETH',
                    error,
                );
                try {
                    tx = await createRangePositionTx({
                        crocEnv,
                        isAmbient,
                        slippageTolerancePercentage,
                        tokenA: {
                            address: tokenA.address,
                            qty: tokenAInputQty,
                            isWithdrawFromDexChecked:
                                isWithdrawTokenAFromDexChecked,
                        },
                        tokenB: {
                            address: tokenB.address,
                            qty: tokenBInputQty,
                            isWithdrawFromDexChecked:
                                isWithdrawTokenBFromDexChecked,
                        },
                        isTokenAPrimary: !isTokenAPrimary,
                        tick: { low: defaultLowTick, high: defaultHighTick },
                    });
                } catch (error2) {
                    if (isTransactionDeniedError(error2)) throw error2;
                    else throw error;
                }
            }

            setNewRangeTransactionHash(tx?.hash);
            addPendingTx(tx?.hash);
            activeRangeTxHash.current = tx?.hash;

            if (tx?.hash)
                addTransactionByType({
                    chainId: chainId,
                    userAddress: userAddress || '',
                    txHash: tx.hash,
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
                        initialTokenQty: tokenAInputQty,
                        secondaryTokenQty: tokenBInputQty,
                        currentLiquidity: currentLiqBigInt,
                    },
                });

            addPositionUpdate({
                txHash: tx.hash,
                positionID: posHash,
                isLimit: false,
                unixTimeAdded: Math.floor(Date.now() / 1000),
            });
        } catch (error) {
            console.error({ error });
            setTxError(error);
            return txOutcomeFromError(error);
        }
        if (tx) {
            let receipt;
            try {
                receipt = await waitForTransaction(
                    provider,
                    tx.hash,
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
                // The user used "speed up" or something similar
                // in their client, but we now have the updated info
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
                    receipt = error.receipt;
                }
            }
            if (receipt) {
                addReceipt(receipt);
                removePendingTx(receipt.hash);
                if (setIsTxCompletedRange) {
                    setIsTxCompletedRange(true);
                }
                return txOutcomeFromReceipt(receipt);
            }
            return 'error';
        }
    };

    return { createRangePosition };
}
