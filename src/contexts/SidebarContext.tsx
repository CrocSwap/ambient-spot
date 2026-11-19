import { TransactionReceipt } from 'ethers';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import {
    recentPoolsMethodsIF,
    useRecentPools,
} from '../App/hooks/useRecentPools';
import { sidebarMethodsIF, useSidebar } from '../App/hooks/useSidebar';
import { diffHashSig, getBlockExplorerUrl } from '../ambient-utils/dataLayer';
import useMediaQuery from '../utils/hooks/useMediaQuery';
import { AppStateContext } from './AppStateContext';
import { PoolContext } from './PoolContext';
import { ReceiptContext } from './ReceiptContext';
import { TradeDataContext } from './TradeDataContext';

export interface SidebarContextIF {
    recentPools: recentPoolsMethodsIF;
    sidebar: sidebarMethodsIF;
    hideOnMobile: boolean;
    toggleMobileModeVisibility: () => void;
    setIsPoolDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isPoolDropdownOpen: boolean;
}

export const SidebarContext = createContext({} as SidebarContextIF);

export const SidebarContextProvider = (props: { children: ReactNode }) => {
    // logic to open a snackbar notification
    const {
        activeNetwork: { chainId, poolIndex },
        snackbar: { open: openSnackbar, close: closeSnackbar },
    } = useContext(AppStateContext);

    const { isPoolInitialized } = useContext(PoolContext);

    const { baseToken, quoteToken } = useContext(TradeDataContext);

    // all receipts stored in the current user session (array of stringified JSONs)
    const { allReceipts, transactionsByType, setShowRedDot } =
        useContext(ReceiptContext);

    // parsed JSON on the most recent receipt in the stack
    const lastReceipt: TransactionReceipt | null =
        allReceipts.length > 0 ? allReceipts[0] : null;

    // boolean representing whether most recent receipt parsed successfully
    const isLastReceiptSuccess: boolean = lastReceipt?.status === 1;

    // hash representation of the most recent receipt
    const lastReceiptHash = useMemo<string | undefined>(
        () => (lastReceipt ? diffHashSig(lastReceipt) : undefined),
        [lastReceipt],
    );

    // determine whether the user screen width is less than min width to show the sidebar
    const smallScreen: boolean = useMediaQuery('(max-width: 500px)');
    const showSidebarByDefault: boolean = useMediaQuery('(min-width: 1600px)');

    // hook to manage sidebar state (probably doesn't need to be extracted anymore)
    const sidebar = useSidebar(location.pathname, showSidebarByDefault);

    // hook to manage recent pool data in-session
    const recentPools: recentPoolsMethodsIF = useRecentPools(chainId);

    // value showing whether the screen size warrants hiding the sidebar
    const [hideOnMobile, setHideOnMobile] = useState<boolean>(true);

    // update sidebar hidden vs not hidden if screen width changes
    useEffect(() => setHideOnMobile(smallScreen), [smallScreen]);

    // fn to toggle visibility when the user is in mobile mode
    const toggleMobileModeVisibility = () => setHideOnMobile((prev) => !prev);

    // logic to open or close the sidebar automatically when the URL route changes
    useEffect(() => {
        if (
            sidebar.getStoredStatus() === 'open' ||
            showSidebarByDefault ||
            smallScreen
        ) {
            sidebar.open();
        } else {
            sidebar.close();
        }
    }, [
        location.pathname.includes('/trade'),
        location.pathname.includes('/explore'),
        showSidebarByDefault,
    ]);

    // logic to show a snackbar notification when a new receipt is received
    // I'm not really sure why we put this logic in this file? should move later
    const lastReceiptChainId = transactionsByType.find(
        (e) => e.txHash === lastReceipt?.hash,
    )?.chainId;
    const blockExplorer = lastReceiptChainId
        ? getBlockExplorerUrl(lastReceiptChainId)
        : getBlockExplorerUrl(chainId);

    const snackBarContentDisplay = (
        <div className='flexColumn'>
            {lastReceipt
                ? isLastReceiptSuccess
                    ? `Transaction ${lastReceipt.hash} successfully completed`
                    : `Transaction ${lastReceipt.hash} failed`
                : ''}
            <a
                href={`${blockExplorer}tx/${lastReceipt?.hash}`}
                target='_blank'
                rel='noreferrer'
                className='customLink'
                onClick={() => {
                    setShowRedDot(false);
                    closeSnackbar();
                }}
            >
                View on Explorer
            </a>
        </div>
    );
    useEffect(() => {
        if (lastReceiptHash) {
            openSnackbar(
                snackBarContentDisplay,
                isLastReceiptSuccess ? 'info' : 'warning',
            );
        }
    }, [lastReceiptHash]);

    const [isPoolDropdownOpen, setIsPoolDropdownOpen] = useState(false);

    useEffect(() => {
        if (isPoolInitialized && isPoolDropdownOpen) {
            recentPools.add(baseToken, quoteToken, chainId, poolIndex);
        }
    }, [
        isPoolInitialized,
        baseToken.address + quoteToken.address,
        isPoolDropdownOpen,
    ]);

    // data to return from this context
    const sidebarState = {
        sidebar,
        recentPools,
        hideOnMobile,
        toggleMobileModeVisibility,
        isPoolDropdownOpen,
        setIsPoolDropdownOpen,
    };

    return (
        <SidebarContext value={sidebarState}>{props.children}</SidebarContext>
    );
};
