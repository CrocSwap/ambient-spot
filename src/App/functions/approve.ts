import { useContext, useState } from 'react';
import { CrocEnvContext } from '../../contexts/CrocEnvContext';

import { waitForTransaction } from '../../ambient-utils/dataLayer';
import {
    TokenIF,
    VaultStrategy,
    VaultWithLiveTvlIF,
} from '../../ambient-utils/types';
import { AppStateContext } from '../../contexts';
import { ReceiptContext } from '../../contexts/ReceiptContext';
import { TradeTokenContext } from '../../contexts/TradeTokenContext';
import { UserDataContext } from '../../contexts/UserDataContext';

export function useApprove() {
    const {
        addPendingTx,
        addReceipt,
        addTransactionByType,
        removePendingTx,
        updateTransactionHash,
    } = useContext(ReceiptContext);
    const { userAddress } = useContext(UserDataContext);
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);

    const { crocEnv, provider } = useContext(CrocEnvContext);

    const { setRecheckTokenAApproval, setRecheckTokenBApproval } =
        useContext(TradeTokenContext);
    const [isApprovalPending, setIsApprovalPending] = useState(false);

    const approve = async (
        tokenAddress: string,
        tokenSymbol: string,
        cb?: (b: boolean) => void,
        tokenQuantity?: bigint,
        spender?: string,
    ) => {
        if (!crocEnv) return;
        try {
            setIsApprovalPending(true);
            let tx;
            if (spender) {
                tx = await crocEnv
                    .token(tokenAddress)
                    .approveAddr(spender, tokenQuantity);
            } else {
                tx = await crocEnv.token(tokenAddress).approve(tokenQuantity);
            }
            if (tx) addPendingTx(tx?.hash);
            if (tx?.hash)
                addTransactionByType({
                    chainId: chainId,
                    userAddress: userAddress || '',
                    txHash: tx.hash,
                    txType: 'Approve',
                    txDescription: `Approval of ${tokenSymbol}`,
                });
            if (tx) {
                let receipt;
                try {
                    receipt = await waitForTransaction(
                        provider,
                        tx.hash,
                        removePendingTx,
                        addPendingTx,
                        updateTransactionHash,
                    );
                } catch (e) {
                    console.error({ e });
                }
                if (receipt) {
                    addReceipt(receipt);
                    removePendingTx(receipt.hash);
                }
            }
        } catch (error) {
            if (error.reason === 'sending a transaction requires a signer') {
                location.reload();
            }
            console.error({ error });
        } finally {
            setIsApprovalPending(false);
            setRecheckTokenAApproval(true);
            setRecheckTokenBApproval(true);
            cb && cb(true);
        }
    };

    const approveVault = async (
        vault: VaultWithLiveTvlIF,
        mainAsset: TokenIF,
        secondaryAsset: TokenIF,
        strategy: VaultStrategy,
        cb?: (b: boolean) => void,
        tokenQuantity?: bigint,
    ) => {
        if (!crocEnv) return;
        try {
            setIsApprovalPending(true);
            const tx = await crocEnv
                .tempestVault(vault.address, vault.mainAsset, strategy)
                .approve(tokenQuantity || undefined)
                .catch(console.error);

            if (tx) addPendingTx(tx?.hash);
            if (tx?.hash)
                addTransactionByType({
                    chainId: chainId,
                    userAddress: userAddress || '',
                    txHash: tx.hash,
                    txType: 'Approve',
                    txDescription: `Approve ${mainAsset.symbol}/${secondaryAsset.symbol}`,
                });
            if (tx) {
                let receipt;
                try {
                    receipt = await waitForTransaction(
                        provider,
                        tx.hash,
                        removePendingTx,
                        addPendingTx,
                        updateTransactionHash,
                    );
                } catch (e) {
                    console.error({ e });
                }
                if (receipt) {
                    addReceipt(receipt);
                    removePendingTx(receipt.hash);
                }
            }
        } catch (error) {
            if (error.reason === 'sending a transaction requires a signer') {
                location.reload();
            }
            console.error({ error });
        } finally {
            setIsApprovalPending(false);
            setRecheckTokenAApproval(true);
            setRecheckTokenBApproval(true);
            cb && cb(true);
        }
    };

    return { approve, approveVault, isApprovalPending };
}
