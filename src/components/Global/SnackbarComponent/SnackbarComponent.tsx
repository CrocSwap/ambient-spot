import { Snackbar } from '@material-ui/core';
import { Alert, AlertProps } from '@mui/material';
import { motion } from 'framer-motion';
import {
    forwardRef,
    memo,
    SyntheticEvent,
    useContext,
    useEffect,
    useRef,
} from 'react';
import { IoMdClose } from 'react-icons/io';
import { AppStateContext } from '../../../contexts/AppStateContext';
import { useMediaQuery } from '../../../utils/hooks/useMediaQuery';
import useOnClickOutside from '../../../utils/hooks/useOnClickOutside';
import styles from './SnackbarComponent.module.css';

const duration = 8000;

const SnackbarAlert = forwardRef<HTMLDivElement, AlertProps>(
    function SnackbarAlert(props, ref) {
        return (
            <Alert
                elevation={6}
                ref={ref}
                {...props}
                sx={{
                    backgroundColor: '#171D27',
                    color: 'white',
                }}
            />
        );
    },
);

// React functional component
function SnackbarComponent() {
    const isSmallScreen = useMediaQuery('(max-width: 500px)');

    const {
        snackbar: {
            isOpen: isSnackbarOpen,
            close,
            content,
            severity,
            anchorOrigin,
        },
    } = useContext(AppStateContext);

    const handleClose = (event?: SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        close();
    };

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        if (isSnackbarOpen && isSmallScreen) {
            timeoutId = setTimeout(() => {
                handleClose();
            }, duration);
        }

        return () => {
            clearTimeout(timeoutId);
        };
    }, [isSnackbarOpen, handleClose]);

    const mobileRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(mobileRef, handleClose);

    if (isSmallScreen)
        return (
            <div
                className={styles.mainContainer}
                ref={mobileRef}
                style={{ display: isSnackbarOpen ? 'flex' : 'none' }}
            >
                <button className={styles.closeButton} onClick={handleClose}>
                    <IoMdClose size={25} />
                </button>
                <div className={styles.mainContent}>{content}</div>
            </div>
        );

    return (
        <motion.div>
            <Snackbar
                open={isSnackbarOpen}
                autoHideDuration={duration}
                onClose={handleClose}
                anchorOrigin={anchorOrigin}
                // z-index needs to be greater than globalPopup
                style={{ width: '900px', zIndex: 99999999999 }}
            >
                <motion.div
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <SnackbarAlert onClose={handleClose} severity={severity}>
                        {content}
                    </SnackbarAlert>
                </motion.div>
            </Snackbar>
        </motion.div>
    );
}

export default memo(SnackbarComponent);
