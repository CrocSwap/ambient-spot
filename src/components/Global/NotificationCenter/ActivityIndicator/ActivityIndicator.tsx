import React, {
    Dispatch,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
    CSSProperties,
} from 'react';
import styles from './ActivityIndicator.module.css';

import { AppStateContext } from '../../../../contexts/AppStateContext';

interface ActivityIndicatorProps {
    value: number;
    pending: boolean;
    showNotificationTable: boolean;
    setShowNotificationTable: Dispatch<SetStateAction<boolean>>;
    showRedDot: boolean;
    setShowRedDot: Dispatch<SetStateAction<boolean>>;
}

// Animation state type
type AnimationState = 'hidden' | 'visible' | 'pop' | 'hover' | 'pressed';

const ActivityIndicator = (props: ActivityIndicatorProps) => {
    const { appHeaderDropdown } = useContext(AppStateContext);
    const { showRedDot, setShowRedDot } = props;
    const { value, pending, showNotificationTable, setShowNotificationTable } =
        props;

    const [animationState, setAnimationState] =
        useState<AnimationState>('hidden');
    const [isHovered, setIsHovered] = useState(false);
    const isFirstRun = useRef(true);

    useEffect(() => {
        if (value > 0) {
            if (!isFirstRun.current) {
                // Pop animation when value changes
                setAnimationState('pop');
                const timer = setTimeout(
                    () => setAnimationState('visible'),
                    200,
                );
                return () => clearTimeout(timer);
            } else {
                setAnimationState('visible');
                isFirstRun.current = false;
            }
        }
    }, [value]);

    const toggleNotificationCenter: React.MouseEventHandler<
        HTMLButtonElement
    > = () => {
        setShowNotificationTable(!showNotificationTable);
        if (!showNotificationTable) {
            appHeaderDropdown.setIsActive(true);
        } else appHeaderDropdown.setIsActive(false);

        setShowRedDot(false);
    };

    // Calculate styles based on animation state
    const getButtonStyle = (): CSSProperties => {
        switch (animationState) {
            case 'hidden':
                return { transform: 'scale(0)', opacity: 0 };
            case 'pop':
                return { transform: 'scale(1.3)', opacity: 1 };
            case 'hover':
                return { transform: 'scale(1.1)', opacity: 1 };
            case 'pressed':
                return { transform: 'scale(0.95)', opacity: 1 };
            case 'visible':
            default:
                return { transform: 'scale(1)', opacity: 1 };
        }
    };

    const buttonStyle: CSSProperties = {
        ...getButtonStyle(),
        cursor: 'pointer',
        transition: isHovered
            ? 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            : 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out',
        borderRadius: '50%',
    };

    if (pending) {
        return (
            <button
                className={styles.circleContainer}
                onClick={toggleNotificationCenter}
                aria-label='Loading notifications'
            >
                <span className={styles.ring} />
            </button>
        );
    }

    return (
        <>
            {value > 0 && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <button
                        className={styles.circleButton}
                        onClick={toggleNotificationCenter}
                        onMouseEnter={() => {
                            setIsHovered(true);
                            setAnimationState('hover');
                        }}
                        onMouseLeave={() => {
                            setIsHovered(false);
                            setAnimationState('visible');
                        }}
                        onMouseDown={() => setAnimationState('pressed')}
                        onMouseUp={() =>
                            setAnimationState(isHovered ? 'hover' : 'visible')
                        }
                        tabIndex={0}
                        aria-label='Notification center'
                        type='button'
                        style={buttonStyle}
                    >
                        <div
                            className={`${styles.activityIndicatorDiv} ${styles.circleButton}`}
                        >
                            <span
                                aria-live='polite'
                                aria-atomic='true'
                                aria-relevant='text'
                            >
                                {value}
                            </span>
                        </div>
                    </button>
                    {showRedDot && <span className={styles.redDot} />}
                </div>
            )}
        </>
    );
};

export default ActivityIndicator;
