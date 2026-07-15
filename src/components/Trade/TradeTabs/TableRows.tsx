import {
    memo,
    MutableRefObject,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { getMoneynessRank } from '../../../ambient-utils/dataLayer';
import {
    LimitModalAction,
    LimitOrderIF,
    PositionIF,
    RangeModalAction,
    TransactionIF,
} from '../../../ambient-utils/types';
import { TradeTableContext } from '../../../contexts/TradeTableContext';
import OrderDetailsModal from '../../Global/DetailModals/OrderDetails/OrderDetailsModal/OrderDetailsModal';
import RangeDetailsModal from '../../Global/DetailModals/RangeDetails/RangeDetailsModal/RangeDetailsModal';
import TransactionDetailsModal from '../../Global/DetailModals/TransactionDetails/TransactionDetailsModal';
import { useModal } from '../../Global/Modal/useModal';
import LimitActionModal from '../../LimitActionModal/LimitActionModal';
import RangeActionModal from '../../RangeActionModal/RangeActionModal';
import OrderRow from './Orders/OrderTable/OrderRow';
import RangesRow from './Ranges/RangesTable/RangesRow';
import TransactionRow from './Transactions/TransactionsTable/TransactionRow';

interface propsIF {
    type: 'Transaction' | 'Order' | 'Range';
    data: TransactionIF[] | LimitOrderIF[] | PositionIF[];
    fullData: TransactionIF[] | LimitOrderIF[] | PositionIF[];
    tableView: 'small' | 'medium' | 'large';
    isAccountView: boolean;
    firstRowRef?: MutableRefObject<HTMLDivElement | null>;
    lastRowRef?: MutableRefObject<HTMLDivElement | null>;
}

type ActiveRecord = TransactionIF | LimitOrderIF | PositionIF | undefined;

function TableRows({
    type,
    data,
    fullData,
    isAccountView,
    tableView,
    firstRowRef,
    lastRowRef,
}: propsIF) {
    // console.log({
    //     dataLength: data.length,
    //     type,
    //     fullDataLength: fullData.length,
    //     firstRowRef,
    //     lastRowRef,
    // });
    const [isDetailsModalOpen, openDetailsModal, closeDetailsModal] =
        useModal();

    const [isActionModalOpen, openActionModal, closeActionModal] = useModal();

    const {
        currentPositionActive,
        setCurrentPositionActive,
        currentTxActiveInTransactions,
        setCurrentTxActiveInTransactions,
        currentLimitOrderActive,
        setCurrentLimitOrderActive,
    } = useContext(TradeTableContext);

    // Range Modal Controls
    const [rangeModalAction, setRangeModalAction] =
        useState<RangeModalAction>('Harvest');

    const closeRangeModal = (modalType: 'action' | 'details') => {
        modalType === 'action' ? closeActionModal() : closeDetailsModal();
        setActiveRecord(undefined);
    };

    const openRangeModal = (
        recordId: string,
        modalType: 'action' | 'details',
    ) => {
        setCurrentPositionActive(recordId);
        modalType === 'action' ? openActionModal() : openDetailsModal();
    };
    // ----------------------

    // Transaction Modal Controls
    const closeTransactionModal = () => {
        closeDetailsModal();
        setActiveRecord(undefined);
    };

    const openTransactionModal = (recordId: string) => {
        setCurrentTxActiveInTransactions(recordId);
        openDetailsModal();
    };

    const getBaseTokenMoneynessGreaterOrEqual = (
        record: TransactionIF | LimitOrderIF,
    ) =>
        getMoneynessRank(record.baseSymbol) -
            getMoneynessRank(record.quoteSymbol) >=
        0;
    // ----------------------

    // Limit Modal Controls
    const [limitModalAction, setLimitModalAction] =
        useState<LimitModalAction>('Remove');

    const closeLimitModal = (modalType: 'action' | 'details') => {
        modalType === 'action' ? closeActionModal() : closeDetailsModal();
        setActiveRecord(undefined);
    };

    const openLimitModal = (
        recordId: string,
        modalType: 'action' | 'details',
    ) => {
        setCurrentLimitOrderActive(recordId);
        modalType === 'action' ? openActionModal() : openDetailsModal();
    };

    // ----------------------

    // Determine active/selected record
    const [activeRecord, setActiveRecord] = useState<ActiveRecord>(undefined);

    useEffect(() => {
        if (isDetailsModalOpen || isActionModalOpen) {
            if (type === 'Range') {
                setActiveRecord(
                    (fullData as PositionIF[]).find((position) => {
                        return position.positionId === currentPositionActive;
                    }),
                );
            } else if (type === 'Order') {
                setActiveRecord(
                    (fullData as LimitOrderIF[]).find((order) => {
                        return order.limitOrderId === currentLimitOrderActive;
                    }),
                );
            } else {
                setActiveRecord(
                    (fullData as TransactionIF[]).find((tx) => {
                        return tx.txId === currentTxActiveInTransactions;
                    }),
                );
            }
        }
    }, [
        type,
        fullData,
        currentPositionActive,
        currentLimitOrderActive,
        currentTxActiveInTransactions,
        isDetailsModalOpen,
        isActionModalOpen,
    ]);

    const rangeContent = () => {
        return (
            <>
                {(data as PositionIF[]).map((position, idx) => (
                    <RangesRow
                        key={position.positionId}
                        position={position}
                        observedRowRef={
                            idx === 0
                                ? firstRowRef
                                : idx === data.length - 1
                                  ? lastRowRef
                                  : undefined
                        }
                        tableView={tableView}
                        isAccountView={isAccountView}
                        openDetailsModal={() =>
                            openRangeModal(position.positionId, 'details')
                        }
                        openActionModal={() =>
                            openRangeModal(position.positionId, 'action')
                        }
                        setRangeModalAction={setRangeModalAction}
                    />
                ))}
                {isDetailsModalOpen && activeRecord && (
                    <RangeDetailsModal
                        position={activeRecord as PositionIF}
                        isAccountView={isAccountView}
                        onClose={() => closeRangeModal('details')}
                    />
                )}
                {isActionModalOpen && activeRecord && (
                    <RangeActionModal
                        type={rangeModalAction}
                        position={activeRecord as PositionIF}
                        onClose={() => closeRangeModal('action')}
                        isAccountView={isAccountView}
                    />
                )}
            </>
        );
    };

    const txDataToDisplay = useMemo(
        () => (isAccountView ? data : data.slice(0, 100)),
        [isAccountView, data],
    );

    const transactionContent = () => {
        return (
            <>
                {(txDataToDisplay as TransactionIF[]).map((tx, idx) => (
                    <TransactionRow
                        key={tx.txId || tx.txHash}
                        idForDOM={`tx_row_${tx.txId || tx.txHash}`}
                        observedRowRef={
                            idx === 0
                                ? firstRowRef
                                : idx === txDataToDisplay.length - 1
                                  ? lastRowRef
                                  : undefined
                        }
                        tx={tx}
                        tableView={tableView}
                        isAccountView={isAccountView}
                        openDetailsModal={() => openTransactionModal(tx.txId)}
                    />
                ))}
                {isDetailsModalOpen && activeRecord && (
                    <TransactionDetailsModal
                        tx={activeRecord as TransactionIF}
                        isBaseTokenMoneynessGreaterOrEqual={getBaseTokenMoneynessGreaterOrEqual(
                            activeRecord as TransactionIF,
                        )}
                        isAccountView={isAccountView}
                        onClose={closeTransactionModal}
                    />
                )}
            </>
        );
    };

    const limitContent = () => {
        return (
            <>
                {(data as LimitOrderIF[]).map((order, idx) => (
                    <OrderRow
                        key={order.limitOrderId}
                        limitOrder={order}
                        tableView={tableView}
                        isAccountView={isAccountView}
                        observedRowRef={
                            idx === 0
                                ? firstRowRef
                                : idx === data.length - 1
                                  ? lastRowRef
                                  : undefined
                        }
                        openDetailsModal={() =>
                            openLimitModal(order.limitOrderId, 'details')
                        }
                        openActionModal={() =>
                            openLimitModal(order.limitOrderId, 'action')
                        }
                        setLimitModalAction={setLimitModalAction}
                    />
                ))}
                {isDetailsModalOpen && activeRecord && (
                    <OrderDetailsModal
                        limitOrder={activeRecord as LimitOrderIF}
                        isBaseTokenMoneynessGreaterOrEqual={getBaseTokenMoneynessGreaterOrEqual(
                            activeRecord as LimitOrderIF,
                        )}
                        isAccountView={isAccountView}
                        onClose={() => closeLimitModal('details')}
                    />
                )}
                {isActionModalOpen && activeRecord && (
                    <LimitActionModal
                        limitOrder={activeRecord as LimitOrderIF}
                        type={limitModalAction}
                        isAccountView={isAccountView}
                        onClose={() => closeLimitModal('action')}
                    />
                )}
            </>
        );
    };

    return (
        <>
            {type === 'Transaction' && transactionContent()}
            {type == 'Order' && limitContent()}
            {type === 'Range' && rangeContent()}
        </>
    );
}

export default memo(TableRows);
