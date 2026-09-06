import { fromDisplayQty } from '@crocswap-libs/sdk';
import { MutableRefObject, useContext, useEffect, useMemo } from 'react';
import { ZERO_ADDRESS } from '../../ambient-utils/constants';
import { TokenIF } from '../../ambient-utils/types';
import { AppStateContext } from '../../contexts';
import { ReceiptContext } from '../../contexts/ReceiptContext';

export function useHandleRangeButtonMessage(
    token: TokenIF,
    tokenAmount: string,
    tokenBalance: string,
    tokenDexBalance: string,
    isTokenInputDisabled: boolean,
    isWithdrawTokenFromDexChecked: boolean,
    isPoolInitialized: boolean,
    tokenQtyCoveredByWalletBalance: bigint,
    amountToReduceNativeTokenQty: number,
    activeRangeTxHash: MutableRefObject<string>,
    clearTokenInputs: () => void,
    isMintLiqEnabled = true,
    isInitPage = false,
) {
    const { pendingTransactions } = useContext(ReceiptContext);

    const { isUserOnline } = useContext(AppStateContext);

    const { tokenAllowed, rangeButtonErrorMessage } = useMemo(() => {
        let tokenAllowed = false;
        let rangeButtonErrorMessage = '';

        const isNativeToken = token.address === ZERO_ADDRESS;
        if (!isUserOnline) {
            rangeButtonErrorMessage = 'Currently Offline';
        } else if (!isPoolInitialized) {
            rangeButtonErrorMessage = 'Pool Not Initialized';
        } else if (
            isInitPage &&
            fromDisplayQty(tokenBalance || '0', token.decimals) <= 0
        ) {
            tokenAllowed = false;
            rangeButtonErrorMessage = `${token.symbol} Wallet Balance Insufficient`;
        } else if (
            (tokenAmount === '0' ||
                tokenAmount === '0.00' ||
                tokenAmount === '' ||
                parseFloat(tokenAmount) < 0) &&
            !isTokenInputDisabled
        ) {
            rangeButtonErrorMessage = 'Enter an Amount';
        } else {
            if (isWithdrawTokenFromDexChecked) {
                if (
                    !isTokenInputDisabled &&
                    fromDisplayQty(tokenAmount || '0', token.decimals) >
                        fromDisplayQty(tokenDexBalance || '0', token.decimals) +
                            fromDisplayQty(tokenBalance || '0', token.decimals)
                ) {
                    rangeButtonErrorMessage = `${token.symbol} Amount Exceeds Combined Wallet and Exchange Balance`;
                } else if (
                    isNativeToken &&
                    tokenQtyCoveredByWalletBalance +
                        fromDisplayQty(
                            amountToReduceNativeTokenQty.toString(),
                            token.decimals,
                        ) >
                        fromDisplayQty(tokenBalance || '0', token.decimals)
                ) {
                    tokenAllowed = false;
                    rangeButtonErrorMessage = `${token.symbol} Wallet Balance Insufficient to Cover Gas`;
                } else {
                    tokenAllowed = true;
                }
            } else {
                if (
                    !isTokenInputDisabled &&
                    fromDisplayQty(tokenAmount || '0', token.decimals) >
                        fromDisplayQty(tokenBalance || '0', token.decimals)
                ) {
                    rangeButtonErrorMessage = `${token.symbol} Amount Exceeds Wallet Balance`;
                } else if (
                    isNativeToken &&
                    tokenQtyCoveredByWalletBalance +
                        fromDisplayQty(
                            amountToReduceNativeTokenQty.toString(),
                            token.decimals,
                        ) >
                        fromDisplayQty(tokenBalance || '0', token.decimals)
                ) {
                    tokenAllowed = false;
                    rangeButtonErrorMessage = `${token.symbol} Wallet Balance Insufficient to Cover Gas`;
                } else {
                    tokenAllowed = true;
                }
            }
        }
        return {
            tokenAllowed,
            rangeButtonErrorMessage,
        };
    }, [
        isUserOnline,
        isMintLiqEnabled,
        isInitPage,
        token.address,
        token.decimals,
        token.symbol,
        tokenAmount,
        tokenQtyCoveredByWalletBalance,
        amountToReduceNativeTokenQty,
        tokenBalance,
        tokenDexBalance,
        isTokenInputDisabled,
        isWithdrawTokenFromDexChecked,
        isPoolInitialized,
    ]);

    useEffect(() => {
        if (
            rangeButtonErrorMessage.includes('Amount Exceeds') &&
            pendingTransactions.some((tx) => tx === activeRangeTxHash.current)
        ) {
            clearTokenInputs();
        }
    }, [
        rangeButtonErrorMessage,
        pendingTransactions,
        activeRangeTxHash,
        clearTokenInputs,
    ]);

    return {
        tokenAllowed,
        rangeButtonErrorMessage,
    };
}
