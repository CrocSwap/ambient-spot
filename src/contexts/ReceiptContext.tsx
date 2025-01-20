import { TransactionReceipt } from 'ethers';
import React, { createContext } from 'react';

export interface ReceiptContextIF {
    sessionReceipts: Array<TransactionReceipt>;
    allReceipts: Array<TransactionReceipt>;
    pendingTransactions: Array<string>;
    transactionsByType: Array<TransactionByType>;
    sessionPositionUpdates: PositionUpdateIF[];
    addTransactionByType: (txByType: TransactionByType) => void;
    addReceipt: (receipt: TransactionReceipt) => void;
    addPendingTx: (tx: string) => void;
    addPositionUpdate: (positionUpdate: PositionUpdateIF) => void;
    updateTransactionHash: (oldHash: string, newHash: string) => void;
    removePendingTx: (pendingTx: string, isRemoved?: boolean) => void;
    removeReceipt: (txHash: string) => void;
    resetReceiptData: () => void;
    showRedDot: boolean;
    setShowRedDot: React.Dispatch<React.SetStateAction<boolean>>;
}

interface TransactionByType {
    chainId: string;
    userAddress: string;
    txHash: string;
    txAction?:
        | 'Sell'
        | 'Buy'
        | 'Add'
        | 'Remove'
        | 'Harvest'
        | 'Claim'
        | 'Reposition';
    txType:
        | 'Market'
        | 'Limit'
        | 'Range'
        | 'Deposit'
        | 'Withdraw'
        | 'Transfer'
        | 'Init'
        | 'Approve';
    txDescription: string;
    txDetails?: {
        baseAddress: string;
        quoteAddress: string;
        poolIdx: number;
        baseSymbol?: string;
        quoteSymbol?: string;
        baseTokenDecimals?: number;
        quoteTokenDecimals?: number;
        isAmbient?: boolean;
        lowTick?: number;
        highTick?: number;
        isBid?: boolean;
        gridSize?: number;
        originalLowTick?: number;
        originalHighTick?: number;
    };
    isRemoved?: boolean;
}

export interface PositionUpdateIF {
    positionID: string;
    isLimit: boolean;
    isFullRemoval?: boolean;
    txHash?: string;
    unixTimeAdded?: number;
    unixTimeIndexed?: number;
    unixTimeReceipt?: number;
}

export const ReceiptContext = createContext({} as ReceiptContextIF);

export const ReceiptContextProvider = (props: {
    children: React.ReactNode;
}) => {
    const [sessionReceipts, setSessionReceipts] = React.useState<
        TransactionReceipt[]
    >([]);
    const [allReceipts, setAllReceipts] = React.useState<TransactionReceipt[]>(
        [],
    );
    const [pendingTransactions, setPendingTransactions] = React.useState<
        string[]
    >([]);

    const [sessionPositionUpdates, setSessionPositionUpdates] = React.useState<
        Array<PositionUpdateIF>
    >([]);

    const [transactionsByType, setTransactionsByType] = React.useState<
        TransactionByType[]
    >([]);

    const [showRedDot, setShowRedDot] = React.useState(true);

    const addTransactionByType = (txByType: TransactionByType) => {
        setTransactionsByType((prev) => [...prev, txByType]);
    };
    const addReceipt = (receipt: TransactionReceipt) => {
        setSessionReceipts((prev) => [receipt, ...prev]);
        setAllReceipts((prev) => [receipt, ...prev]);
    };
    const addPendingTx = (pendingTx: string) => {
        setPendingTransactions((prev) => [pendingTx, ...prev]);
    };
    const removePendingTx = (nonPendingTx: string, isRemoved?: boolean) => {
        // Remove the transaction from pendingTransactions
        setPendingTransactions((pendingTransactions) =>
            pendingTransactions.filter((p) => p !== nonPendingTx),
        );

        // Update the isRemoved property in transactionsByType
        isRemoved &&
            setTransactionsByType((transactionsByType) =>
                transactionsByType.map((tx) =>
                    tx.txHash === nonPendingTx
                        ? { ...tx, isRemoved: true } // Add or update the isRemoved property
                        : tx,
                ),
            );
    };

    const addPositionUpdate = (positionUpdate: PositionUpdateIF) => {
        setSessionPositionUpdates((prev) => [positionUpdate, ...prev]);
    };
    const updateTransactionHash = (oldHash: string, newHash: string) => {
        const txIndex = transactionsByType.findIndex(
            (tx) => tx.txHash === oldHash,
        );
        if (txIndex !== -1) {
            transactionsByType[txIndex] = {
                ...transactionsByType[txIndex],
                txHash: newHash,
                isRemoved: false,
            };
        }
    };

    const removeReceipt = (txHash: string) => {
        removePendingTx(txHash);

        setSessionReceipts((sessionReceipts) =>
            sessionReceipts.filter(
                (r) => r.hash.toLowerCase() !== txHash.toLowerCase(),
            ),
        );
    };

    const resetReceiptData = () => {
        setSessionReceipts([]);
        setPendingTransactions([]);
        setTransactionsByType([]);
    };

    const receiptContext: ReceiptContextIF = {
        sessionReceipts,
        allReceipts,
        transactionsByType,
        pendingTransactions,
        sessionPositionUpdates,
        addTransactionByType,
        addReceipt,
        addPendingTx,
        addPositionUpdate,
        updateTransactionHash,
        removePendingTx,
        removeReceipt,
        resetReceiptData,
        showRedDot,
        setShowRedDot,
    };

    return (
        <ReceiptContext.Provider value={receiptContext}>
            {props.children}
        </ReceiptContext.Provider>
    );
};
