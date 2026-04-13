import { motion } from 'framer-motion';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { BiArrowBack } from 'react-icons/bi';
import { RiCloseFill } from 'react-icons/ri';
import { GLOBAL_MODAL_COMPONENT_ID } from '../../../ambient-utils/constants';
import { useBottomSheet } from '../../../contexts/BottomSheetContext';
import { Container } from '../../../styled/Common';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import GlobalModalPortal from '../../GlobalModalPortal';
import styles from './Modal.module.css';

interface ModalPropsIF {
    onClose: () => void;
    handleBack?: () => void;
    showBackButton?: boolean;
    title?: string;
    footer?: ReactNode;
    noBackground?: boolean;
    children: ReactNode;
    centeredTitle?: boolean;
    headerRightItems?: ReactNode;
    usingCustomHeader?: boolean;
    isEscapeKeyEnabled?: boolean;
}

export default function Modal(props: ModalPropsIF) {
    const {
        handleBack,
        title = '',
        footer,
        noBackground,
        children,
        showBackButton,
        headerRightItems,
        centeredTitle = true,
        usingCustomHeader = false,
        onClose = () => null,
        isEscapeKeyEnabled = true,
    } = props;

    const { openBottomSheet, closeBottomSheet, isBottomSheetOpen } =
        useBottomSheet();
    const isMobile = useMediaQuery('(max-width: 500px)');

    // Track initialization to avoid rendering until states are fully resolved
    const [isInitialized, setIsInitialized] = useState(false);

    // Handle closing both modal and bottom sheet
    const handleClose = () => {
        onClose();
        closeBottomSheet();
    };

    const escFunction = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isEscapeKeyEnabled) {
                handleClose();
            }
        },
        [isEscapeKeyEnabled, handleClose],
    );

    useEffect(() => {
        document.addEventListener('keydown', escFunction, false);
        return () => {
            document.removeEventListener('keydown', escFunction, false);
        };
    }, [escFunction]);

    // Open bottom sheet on mobile, close on desktop transition
    useEffect(() => {
        if (isMobile && !isBottomSheetOpen) {
            openBottomSheet();
        } else if (!isMobile && isBottomSheetOpen) {
            closeBottomSheet();
        }
        setIsInitialized(true); // Mark as initialized after states resolve
    }, [isMobile, isBottomSheetOpen, openBottomSheet, closeBottomSheet]);

    const headerJSX = !usingCustomHeader ? (
        <header className={styles.modal_header}>
            {showBackButton && (
                <div style={{ cursor: 'pointer' }}>
                    <BiArrowBack size={27} onClick={handleBack} />
                </div>
            )}
            {centeredTitle && <div />}
            <h2 className={styles.modal_title}>{title}</h2>
            <div className={styles.header_right}>
                {headerRightItems}
                <span />
                {!isMobile && (
                    <RiCloseFill
                        id='close_modal_button'
                        size={27}
                        className={styles.close_button}
                        onClick={handleClose}
                        role='button'
                        tabIndex={-1}
                        aria-label='Close modal button'
                        style={{ cursor: 'pointer' }}
                    />
                )}
            </div>
        </header>
    ) : null;

    const footerJSX = footer ? (
        <footer className={styles.modal_footer}>{footer}</footer>
    ) : null;

    // Avoid rendering anything until initialization is complete
    if (!isInitialized) {
        return null; // Prevent rendering modal or bottom sheet until initialization
    }

    if (isBottomSheetOpen) {
        // Render Bottom Sheet style for mobile
        return (
            <>
                <motion.div
                    className={styles.modal_overlay}
                    initial='hidden'
                    animate={{ opacity: 1 }}
                    exit='hidden'
                    onClick={handleClose}
                />
                <motion.div
                    className={styles.bottom_sheet}
                    initial={{ y: window.innerHeight, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        duration: 0.5,
                        type: 'spring',
                        damping: 25,
                        stiffness: 200,
                    }}
                    drag='y'
                    dragConstraints={{ top: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(e, info) => {
                        if (info.offset.y > 100) handleClose();
                    }}
                >
                    <div className={styles.sheet_handle}>
                        <div
                            className={styles.drag_handle}
                            style={{ background: '#7371fc' }}
                        />
                    </div>
                    {headerJSX}
                    <section className={styles.modal_content}>
                        {children}
                    </section>
                    {footerJSX}
                </motion.div>
            </>
        );
    }

    // Render traditional modal for non-mobile views
    return (
        <GlobalModalPortal>
            <aside
                id={GLOBAL_MODAL_COMPONENT_ID}
                className={styles.outside_modal}
                onMouseDown={handleClose}
                role='dialog'
                aria-modal='true'
            >
                <motion.div
                    // initial={{ opacity: 0, scale: 0.5 }}
                    // animate={{ opacity: 1, scale: 1 }}
                    // transition={{ duration: 0.4 }}
                    className={`
                        ${styles.modal_body}
                        ${noBackground ? styles.no_background_modal : null}
                    `}
                    onMouseDown={(e) => e.stopPropagation()}
                    tabIndex={0}
                    aria-label={`${title} modal`}
                >
                    <Container boxShadow='gradient'>
                        {headerJSX}
                        <section className={styles.modal_content}>
                            {children}
                        </section>
                        {footerJSX}
                    </Container>
                </motion.div>
            </aside>
        </GlobalModalPortal>
    );
}
