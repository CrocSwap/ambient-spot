import { Dispatch, RefObject, SetStateAction, useContext } from 'react';
import ReceiptDisplay from '../ReceiptDisplay/ReceiptDisplay';

import { ReceiptContext } from '../../../../contexts/ReceiptContext';
import { FlexContainer } from '../../../../styled/Common';
import useMediaQuery from '../../../../utils/hooks/useMediaQuery';
import Modal from '../../Modal/Modal';
import ModalHeader from '../../ModalHeader/ModalHeader';
import styles from './NotificationTable.module.css';

interface NotificationTableProps {
    showNotificationTable: boolean;
    setShowNotificationTable: Dispatch<SetStateAction<boolean>>;
    pendingTransactions: string[];
    notificationItemRef: RefObject<HTMLDivElement | null>;
}

const NotificationTable = (props: NotificationTableProps) => {
    const {
        showNotificationTable,
        pendingTransactions,
        notificationItemRef,
        setShowNotificationTable,
    } = props;
    const showMobileVersion = useMediaQuery('(max-width: 768px)');

    const { resetReceiptData, transactionsByType, sessionReceipts } =
        useContext(ReceiptContext);

    const sessionReceiptsDisplay = sessionReceipts.map((receipt, idx) => (
        <ReceiptDisplay
            key={idx}
            status={receipt?.status === 1 ? 'successful' : 'failed'}
            hash={receipt?.hash}
            provider={receipt?.provider}
            txBlockNumber={receipt?.blockNumber}
            txType={
                transactionsByType.find((e) => e.txHash === receipt?.hash)
                    ?.txDescription
            }
            chainId={
                transactionsByType.find((e) => e.txHash === receipt?.hash)
                    ?.chainId
            }
        />
    ));

    const pendingTransactionsDisplay = pendingTransactions.map((tx, idx) => (
        <ReceiptDisplay
            key={idx}
            status='pending'
            hash={tx}
            txType={
                transactionsByType.find((e) => e.txHash === tx)?.txDescription
            }
            chainId={transactionsByType.find((e) => e.txHash === tx)?.chainId}
        />
    ));

    const mainContent = (
        <div className={styles.mainContainer}>
            <div className={styles.container} ref={notificationItemRef}>
                {<h3 className={styles.header}>Recent Transactions</h3>}

                <div className={styles.content}>
                    {pendingTransactionsDisplay}
                    {sessionReceiptsDisplay}
                </div>

                <FlexContainer justifyContent='center' margin='auto'>
                    <button
                        className={styles.footerButton}
                        style={{ color: 'var(--accent5)' }}
                        onClick={() => {
                            resetReceiptData();
                        }}
                        aria-label='Clear all'
                    >
                        Clear all
                    </button>
                </FlexContainer>
            </div>
        </div>
    );
    const modalVersion = (
        <div className={styles.container}>
            <Modal
                usingCustomHeader
                onClose={() => setShowNotificationTable(false)}
            >
                <ModalHeader
                    title={'Recent Transactions'}
                    onClose={() => setShowNotificationTable(false)}
                />
                {mainContent}
            </Modal>
        </div>
    );

    if (!showNotificationTable) return null;

    return showMobileVersion ? modalVersion : mainContent;
};

export default NotificationTable;
