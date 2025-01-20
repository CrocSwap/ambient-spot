import { AnimateSharedLayout } from 'framer-motion';
import {
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { getReceiptTxHashes } from '../../../ambient-utils/dataLayer';
import { ReceiptContext } from '../../../contexts/ReceiptContext';
import { useMediaQuery } from '../../../utils/hooks/useMediaQuery';
import useOnClickOutside from '../../../utils/hooks/useOnClickOutside';
import ActivityIndicator from './ActivityIndicator/ActivityIndicator';
import NotificationTable from './NotificationTable/NotificationTable';

const NotificationCenter = () => {
    const [showNotificationTable, setShowNotificationTable] =
        useState<boolean>(false);

    const smallScreen = useMediaQuery('(max-width: 768px)');

    const { pendingTransactions, sessionReceipts, showRedDot, setShowRedDot } =
        useContext(ReceiptContext);

    const txCount = pendingTransactions.length + sessionReceipts.length;

    useEffect(() => {
        if (txCount === 0) {
            setShowNotificationTable(false);
        }
    }, [txCount]);

    const receivedReceiptHashes = useMemo(
        () => getReceiptTxHashes(sessionReceipts),
        [JSON.stringify(sessionReceipts)],
    );

    const currentPendingTransactionsArray = pendingTransactions.filter(
        (hash: string) => !receivedReceiptHashes.includes(hash),
    );

    const notificationItemRef = useRef<HTMLDivElement>(null);
    const activityCenterRef = useRef<HTMLDivElement>(null);

    const clickOutsideHandler = (event: Event) => {
        if (smallScreen) return null;
        if (
            !activityCenterRef.current?.contains(event?.target as Node) &&
            !notificationItemRef.current?.contains(event?.target as Node)

            // event.target !== activityCenterRef.current &&
            // event.target !== notificationItemRef.current
        ) {
            setShowNotificationTable(false);
        }
    };
    const prevTxCountRef = useRef(txCount);

    useEffect(() => {
        if (txCount > prevTxCountRef.current) {
            setShowRedDot(true);
        }
        prevTxCountRef.current = txCount;
    }, [txCount]);

    const escFunction = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowNotificationTable(false);
            }
        },
        [showNotificationTable],
    );

    useEffect(() => {
        document.addEventListener('keydown', escFunction, false);
        return () => {
            document.removeEventListener('keydown', escFunction, false);
        };
    }, [escFunction]);
    useOnClickOutside(activityCenterRef, clickOutsideHandler);
    useOnClickOutside(notificationItemRef, clickOutsideHandler);

    return (
        <AnimateSharedLayout>
            <div>
                <span ref={activityCenterRef}>
                    <ActivityIndicator
                        value={receivedReceiptHashes.length}
                        pending={currentPendingTransactionsArray.length > 0}
                        showNotificationTable={showNotificationTable}
                        setShowNotificationTable={setShowNotificationTable}
                        showRedDot={showRedDot}
                        setShowRedDot={setShowRedDot}
                    />
                </span>

                <div>
                    <NotificationTable
                        showNotificationTable={showNotificationTable}
                        setShowNotificationTable={setShowNotificationTable}
                        pendingTransactions={currentPendingTransactionsArray}
                        notificationItemRef={notificationItemRef}
                    />
                </div>
                <div></div>
            </div>
        </AnimateSharedLayout>
    );
};

export default NotificationCenter;
