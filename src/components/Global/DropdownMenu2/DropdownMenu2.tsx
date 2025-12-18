import { motion } from 'framer-motion';
import {
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { FaAngleDown } from 'react-icons/fa';
import useKeyPress from '../../../App/hooks/useKeyPress';
import { brand } from '../../../ambient-utils/constants';
import { AppStateContext } from '../../../contexts/AppStateContext';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import UseOnClickOutside from '../../../utils/hooks/useOnClickOutside';
import { dropdownAnimation } from '../../../utils/others/FramerMotionAnimations';
import Modal from '../Modal/Modal';
import styles from './DropdownMenu2.module.css';

interface propsIF {
    title: string;
    children: ReactNode;
    marginTop?: string;
    marginRight?: string;
    marginLeft?: string;
    titleWidth?: string;
    logo?: string;
    left?: string;
    right?: string;
    expandable: boolean;
    disabled?: boolean;
    loading?: boolean;
}

export default function DropdownMenu2(props: propsIF) {
    const {
        title,
        children,
        marginTop,
        titleWidth,
        logo,
        left,
        right,
        expandable,
        marginRight,
        marginLeft,
        disabled,
        loading,
    } = props;

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const { appHeaderDropdown } = useContext(AppStateContext);
    const dropdownRefItem = useRef<HTMLDivElement>(null);
    const desktopScreen = useMediaQuery('(min-width: 1020px)');
    const showMobileVersion = useMediaQuery('(max-width: 768px)');
    const isEscapePressed = useKeyPress('Escape');

    useEffect(() => {
        if (isEscapePressed) {
            setIsMenuOpen(false);
            appHeaderDropdown.setIsActive(false);
        }
    }, [isEscapePressed]);

    function toggleMenu(): void {
        setIsMenuOpen(!isMenuOpen);
    }

    const clickOutsideHandler = () => {
        if (showMobileVersion) return null;
        setIsMenuOpen(false);
    };

    UseOnClickOutside(dropdownRefItem, clickOutsideHandler);

    const dropdownMenuContent = (
        <motion.div
            className={styles.menuContainer}
            onClick={() => {
                setIsMenuOpen(false);
                appHeaderDropdown.setIsActive(false);
            }}
            variants={dropdownAnimation}
            initial='hidden'
            animate='show'
            exit='hidden'
            style={{
                top: marginTop ? marginTop : '30px',
                left: marginLeft ?? left,
                right: marginRight ?? right,
                cursor: expandable ? 'pointer' : 'default',
            }}
        >
            {children}
        </motion.div>
    );

    const showFullMenu = desktopScreen && brand !== 'futa';

    const modalVersion = (
        <Modal usingCustomHeader onClose={() => setIsMenuOpen(false)}>
            {dropdownMenuContent}
        </Modal>
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!expandable) return;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu();
            } else if (e.key === 'ArrowDown' && !isMenuOpen) {
                e.preventDefault();
                setIsMenuOpen(true);
            }
        },
        [expandable, isMenuOpen],
    );

    return (
        <div
            ref={dropdownRefItem}
            style={{ pointerEvents: disabled ? 'none' : 'auto' }}
        >
            <div
                className={styles.menu}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => expandable && toggleMenu()}
                onKeyDown={handleKeyDown}
                role='button'
                tabIndex={expandable && !disabled ? 0 : -1}
                aria-haspopup='menu'
                aria-expanded={isMenuOpen}
                aria-disabled={disabled}
                style={{
                    minWidth: !showFullMenu
                        ? ''
                        : titleWidth
                          ? titleWidth
                          : '100px',
                }}
            >
                <div className={styles.menuItem}>
                    {showFullMenu && (
                        <div
                            className={styles.iconContainer}
                            style={{
                                cursor: expandable ? 'pointer' : 'default',
                            }}
                        >
                            {loading ? (
                                <span className={styles.loading} />
                            ) : (
                                <img
                                    src={logo}
                                    alt={title}
                                    width={
                                        title.includes('Scroll') ||
                                        title.includes('Blast')
                                            ? '20px'
                                            : '20px'
                                    }
                                    height='20px'
                                    style={{
                                        borderRadius: '50%',
                                        marginLeft: '2px',
                                    }}
                                />
                            )}
                            {title}
                        </div>
                    )}
                    {!showFullMenu && (
                        <img
                            src={logo}
                            alt={title}
                            width='18px'
                            height='18px'
                            style={{
                                cursor: expandable ? 'pointer' : 'default',
                                borderRadius: '50%',
                                marginLeft: '2px',
                            }}
                        />
                    )}
                </div>
                {expandable && !showMobileVersion && (
                    <FaAngleDown
                        style={{
                            marginLeft: '4px',
                            marginTop: '2px',
                            color: isHovered ? 'var(--accent1)' : '', // Change color on hover
                            transition: 'color 0.3s ease', // Smooth color transition
                        }}
                    />
                )}
            </div>
            {isMenuOpen &&
                (showMobileVersion ? modalVersion : dropdownMenuContent)}
        </div>
    );
}
