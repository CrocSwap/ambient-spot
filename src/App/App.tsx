import { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SnackbarComponent from '../components/Global/SnackbarComponent/SnackbarComponent';

import PageHeader from './components/PageHeader/PageHeader';
import FogoPresaleBanner from './components/FogoPresaleBanner/FogoPresaleBanner';

import ChatPanel from '../components/Chat/ChatPanel';
import AppOverlay from '../components/Global/AppOverlay/AppOverlay';
import { AppStateContext } from '../contexts/AppStateContext';
import { BrandContext } from '../contexts/BrandContext';
import { SidebarContext } from '../contexts/SidebarContext';
import './App.css';
import GlobalPopup from './components/GlobalPopup/GlobalPopup';
import GateWalletModal from './components/WalletModal/GateWalletModal';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import useKeyPress from './hooks/useKeyPress';

import FooterNav from '../components/Global/FooterNav/FooterNav';
import { FlexContainer } from '../styled/Common';
import useMediaQuery from '../utils/hooks/useMediaQuery';

import { useModal } from '../components/Global/Modal/useModal';
import { ChartContext } from '../contexts';
import { useBottomSheet } from '../contexts/BottomSheetContext';
import CSSModal from '../pages/common/CSSDebug/CSSModal';
import { RouteRenderer } from '../routes';

/** ***** React Function *******/
export default function App() {
    const navigate = useNavigate();
    const location = useLocation();
    const currentLocation = location.pathname;
    const { isFullScreen } = useContext(ChartContext);

    const {
        chat: {
            isOpen: isChatOpen,
            setIsOpen: setChatOpen,
            isEnabled: isChatEnabled,
        },
        walletModal: { isOpen: isWalletModalOpen },
        appHeaderDropdown,
    } = useContext(AppStateContext);
    const { platformName, skin } = useContext(BrandContext);
    const {
        sidebar: { toggle: toggleSidebar },
    } = useContext(SidebarContext);
    const { isBottomSheetOpen } = useBottomSheet();

    const containerStyle = currentLocation.includes('trade')
        ? 'content-container-trade'
        : 'content-container';

    // CONTEXT: investigate
    // KEYBOARD SHORTCUTS ROUTES
    const routeShortcuts = {
        S: '/swap',
        T: '/trade',
        M: 'trade/market',
        R: 'trade/pool',
        L: 'trade/limit',
        P: '/account',
        C: '/chat',
    };
    Object.entries(routeShortcuts).forEach(([key, route]) => {
        useKeyboardShortcuts({ modifierKeys: ['Shift'], key }, () => {
            navigate(route);
        });
    });
    // KEYBOARD SHORTCUTS STATES
    // keyboard shortcuts for states will require multiple modifier keys.
    useKeyboardShortcuts(
        { modifierKeys: ['Shift', 'Control'], key: ' ' },
        () => {
            toggleSidebar(true);
        },
    );
    useKeyboardShortcuts(
        { modifierKeys: ['Shift', 'Control'], key: 'C' },
        () => {
            setChatOpen(!isChatOpen);
        },
    );
    // Since input field are autofocused on each route, we need a way for the user to exit that focus on their keyboard. This achieves that.
    const isEscapePressed = useKeyPress('Escape');
    useEffect(() => {
        if (isEscapePressed) {
            const focusedInput = document?.querySelector(
                ':focus',
            ) as HTMLInputElement;
            if (focusedInput) {
                focusedInput.blur();
            }
        }
    }, [isEscapePressed]);

    useEffect(() => {
        appHeaderDropdown.setIsActive(false);
    }, [location]);

    const showMobileVersion = useMediaQuery('(max-width: 800px)');
    const ambientFooter = (
        <div data-theme={skin.active} className='footer_container'>
            {currentLocation !== '/' &&
                currentLocation !== '/404' &&
                currentLocation !== '/terms' &&
                currentLocation !== '/privacy' &&
                currentLocation !== '/faq' &&
                !currentLocation.includes('/chat') &&
                isChatEnabled &&
                !isFullScreen && <ChatPanel isFullScreen={false} />}
        </div>
    );

    // logic to handle opening and closing of the CSS modal
    const [isCSSModalOpen, openCSSModal, closeCSSModal] = useModal();
    // bind keyboard event to toggle CSS modal open or closed
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if (
                (e.ctrlKey || e.metaKey) &&
                e.shiftKey &&
                e.key.toLowerCase() === 'k'
            ) {
                isCSSModalOpen ? closeCSSModal() : openCSSModal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isCSSModalOpen]);

    const footerDisplay = showMobileVersion && <FooterNav />;

    return (
        <>
            {import.meta.env.VITE_FOGO_SHOW_PRESALE_BANNER === 'true' && (
                <FogoPresaleBanner />
            )}
            {location.pathname == '/' && <PageHeader />}
            <FlexContainer
                flexDirection='column'
                className={containerStyle}
                data-theme={skin.active}
                style={{
                    height:
                        location.pathname == '/'
                            ? 'calc(100vh - 56px)'
                            : '100dvh',
                }}
            >
                <AppOverlay />
                {location.pathname !== '/' && <PageHeader />}
                <RouteRenderer platformName={platformName} />
                {isWalletModalOpen && <GateWalletModal />}
            </FlexContainer>

            <GlobalPopup data-theme={skin.active} />
            <SnackbarComponent />

            {ambientFooter}
            {!isBottomSheetOpen && footerDisplay}

            {isCSSModalOpen && <CSSModal close={() => closeCSSModal()} />}
        </>
    );
}
