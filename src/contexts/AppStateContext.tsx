import { useWeb3Modal } from '@web3modal/ethers/react';
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import {
    CACHE_UPDATE_FREQ_IN_MS,
    CHAT_ENABLED,
    VIEW_ONLY,
} from '../ambient-utils/constants';
import { NetworkIF } from '../ambient-utils/types';
import {
    globalPopupMethodsIF,
    useGlobalPopup,
} from '../App/components/GlobalPopup/useGlobalPopup';
import { useAppChain } from '../App/hooks/useAppChain';
import { useTermsAgreed } from '../App/hooks/useTermsAgreed';
import useChatApi from '../components/Chat/Service/ChatApi';
import { useModal } from '../components/Global/Modal/useModal';
import {
    snackbarMethodsIF,
    useSnackbar,
} from '../components/Global/SnackbarComponent/useSnackbar';

export interface AppStateContextIF {
    appOverlay: { isActive: boolean; setIsActive: (val: boolean) => void };
    appHeaderDropdown: {
        isActive: boolean;
        setIsActive: (val: boolean) => void;
    };
    globalPopup: globalPopupMethodsIF;
    snackbar: snackbarMethodsIF;
    tutorial: { isActive: boolean; setIsActive: (val: boolean) => void };
    chat: {
        isOpen: boolean;
        setIsOpen: (val: boolean) => void;
        isEnabled: boolean;
        setIsEnabled: (val: boolean) => void;
    };
    server: { isEnabled: boolean };
    isUserOnline: boolean;
    subscriptions: { isEnabled: boolean };
    walletModal: {
        isOpen: boolean;
        open: () => void;
        close: () => void;
    };
    isUserIdle: boolean;
    isUserIdle60min: boolean;
    activeNetwork: NetworkIF;
    chooseNetwork: (network: NetworkIF) => void;
    layout: {
        contentHeight: number;
        viewportHeight: number;
    };
}

export const AppStateContext = createContext({} as AppStateContextIF);

export const AppStateContextProvider = (props: {
    children: React.ReactNode;
}) => {
    const [isAppOverlayActive, setIsAppOverlayActive] = useState(false);
    const [isAppHeaderDropdown, setIsAppHeaderDropdown] = useState(false);
    const [isTutorialMode, setIsTutorialMode] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatEnabled, setIsChatEnabled] = useState(CHAT_ENABLED);
    const [isUserOnline, setIsUserOnline] = useState(navigator.onLine);
    const [isUserIdle, setIsUserIdle] = useState(false);
    const [isUserIdle60min, setIsUserIdle60min] = useState(false);

    // layout---------------

    const NAVBAR_HEIGHT = 56;
    const FOOTER_HEIGHT = 56;
    const TOTAL_FIXED_HEIGHT = NAVBAR_HEIGHT + FOOTER_HEIGHT;

    const [dimensions, setDimensions] = useState({
        contentHeight: window.innerHeight - TOTAL_FIXED_HEIGHT,
        viewportHeight: window.innerHeight,
    });
    // Add this useEffect for handling resize
    useEffect(() => {
        const calculateHeights = () => {
            const viewportHeight = window.innerHeight;
            setDimensions({
                contentHeight: viewportHeight - TOTAL_FIXED_HEIGHT,
                viewportHeight,
            });
        };

        // Debounced resize handler for performance
        let timeoutId: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(calculateHeights, 150);
        };

        // Add event listener
        window.addEventListener('resize', handleResize);

        // Initial calculation
        calculateHeights();

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    //  end of layout------------

    window.ononline = () => setIsUserOnline(true);
    window.onoffline = () => setIsUserOnline(false);

    // allow a local environment variable to be defined in [app_repo]/.env.local to turn off connections to the cache server
    const isServerEnabled =
        import.meta.env.VITE_CACHE_SERVER_IS_ENABLED !== undefined
            ? import.meta.env.VITE_CACHE_SERVER_IS_ENABLED.toLowerCase() ===
              'true'
            : true;

    // allow a local environment variable to be defined in [app_repo]/.env.local to turn off subscriptions to the cache and chat servers
    const areSubscriptionsEnabled =
        import.meta.env.VITE_SUBSCRIPTIONS_ARE_ENABLED !== undefined
            ? import.meta.env.VITE_SUBSCRIPTIONS_ARE_ENABLED.toLowerCase() ===
              'true'
            : true;

    // All of these objects results from use*() functions are assumed to be memoized correct,
    // I.e. updated if and only if their conrents need to be updated.
    const snackbar = useSnackbar();
    const globalPopup = useGlobalPopup();

    const [isGateWalletModalOpen, openGateWalletModal, closeGateWalletModal] =
        useModal();

    const [_, hasAgreedTerms] = useTermsAgreed();
    const { open: openW3Modal } = useWeb3Modal();

    const onIdle = () => {
        setIsUserIdle(true);
    };

    const onIdle60min = () => {
        setIsUserIdle60min(true);
    };

    const onActive = () => {
        setIsUserIdle(false);
        setIsUserIdle60min(false);
    };

    // Custom visibility change handler to trigger onActive when the tab becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // If the tab is visible, manually trigger onActive
                onActive();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Clean up the event listener on component unmount
        return () => {
            document.removeEventListener(
                'visibilitychange',
                handleVisibilityChange,
            );
        };
    }, [onActive]);

    useIdleTimer({
        onIdle,
        onActive,
        timeout: 1000 * 60 * 1, // set user to idle after 1 minute
        promptTimeout: 0,
        events: [
            'mousemove',
            'keydown',
            'wheel',
            'DOMMouseScroll',
            'mousewheel',
            'mousedown',
            'touchstart',
            'touchmove',
            'MSPointerDown',
            'MSPointerMove',
            'visibilitychange', // triggers on tab change
        ],
        immediateEvents: [],
        debounce: 0,
        throttle: 0,
        eventsThrottle: 200,
        element: document,
        startOnMount: true,
        startManually: false,
        stopOnIdle: false,
        crossTab: false,
        name: 'idle-timer',
        syncTimers: 0,
        leaderElection: false,
    });

    useIdleTimer({
        onIdle: onIdle60min,
        onActive,
        timeout: 1000 * 60 * 60, // set user to idle after 60 minutes
        promptTimeout: 0,
        events: [
            'mousemove',
            'keydown',
            'wheel',
            'DOMMouseScroll',
            'mousewheel',
            'mousedown',
            'touchstart',
            'touchmove',
            'MSPointerDown',
            'MSPointerMove',
            'visibilitychange',
        ],
        immediateEvents: [],
        debounce: 0,
        throttle: 0,
        eventsThrottle: 200,
        element: document,
        startOnMount: true,
        startManually: false,
        stopOnIdle: false,
        crossTab: false,
        name: 'idle-timer-10',
        syncTimers: 0,
        leaderElection: false,
    });

    // Heartbeat that checks if the chat server is reachable and has a stable db connection every 60 seconds.
    const { getStatus } = useChatApi();
    useEffect(() => {
        if (CHAT_ENABLED && isUserOnline) {
            const interval = setInterval(() => {
                getStatus().then((isChatUp) => {
                    setIsChatEnabled(isChatUp);
                });
            }, CACHE_UPDATE_FREQ_IN_MS);
            return () => clearInterval(interval);
        }
    }, [isUserOnline, isChatEnabled, CHAT_ENABLED]);

    const { activeNetwork, chooseNetwork } = useAppChain();

    const appStateContext = useMemo(
        () => ({
            appOverlay: {
                isActive: isAppOverlayActive,
                setIsActive: setIsAppOverlayActive,
            },
            layout: {
                contentHeight: dimensions.contentHeight,
                viewportHeight: dimensions.viewportHeight,
            },
            appHeaderDropdown: {
                isActive: isAppHeaderDropdown,
                setIsActive: setIsAppHeaderDropdown,
            },
            globalPopup,
            snackbar,
            tutorial: {
                isActive: isTutorialMode,
                setIsActive: setIsTutorialMode,
            },
            chat: {
                isOpen: isChatOpen,
                setIsOpen: setIsChatOpen,
                isEnabled: isChatEnabled,
                setIsEnabled: setIsChatEnabled,
            },
            server: { isEnabled: isServerEnabled },
            isUserOnline,
            isUserIdle,
            isUserIdle60min,
            subscriptions: { isEnabled: areSubscriptionsEnabled },
            walletModal: {
                isOpen: isGateWalletModalOpen,
                open: () => {
                    if (!hasAgreedTerms || VIEW_ONLY) openGateWalletModal();
                    else openW3Modal();
                },
                close: closeGateWalletModal,
            },
            activeNetwork,
            chooseNetwork,
        }),
        [
            // Dependency list includes the memoized use*() values from above and any primitives
            // directly references in above appState object
            snackbar,
            globalPopup,
            isChatOpen,
            isChatEnabled,
            isServerEnabled,
            isUserOnline,
            isUserIdle,
            areSubscriptionsEnabled,
            isAppOverlayActive,
            isTutorialMode,
            isGateWalletModalOpen,
            openGateWalletModal,
            closeGateWalletModal,
            isAppHeaderDropdown,
            setIsAppHeaderDropdown,
            dimensions.contentHeight,
            dimensions.viewportHeight,
            activeNetwork,
            chooseNetwork,
        ],
    );

    return (
        <AppStateContext.Provider value={appStateContext}>
            {props.children}
        </AppStateContext.Provider>
    );
};
