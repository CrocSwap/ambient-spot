import { AnimateSharedLayout, motion } from 'framer-motion';
import {
    cloneElement,
    Dispatch,
    ReactElement,
    ReactNode,
    SetStateAction,
    useContext,
    useEffect,
    useState,
} from 'react';

import { useNavigate } from 'react-router-dom';
import '../../../App/App.css';
import { ChartContext } from '../../../contexts/ChartContext';
import { TradeTableContext } from '../../../contexts/TradeTableContext';
import { useMediaQuery } from '../../../utils/hooks/useMediaQuery';
import { DefaultTooltip } from '../StyledTooltip/StyledTooltip';
import styles from './TabComponent.module.css';

type tabData = {
    label: string;
    content: ReactNode;
    icon?: string;
    showRightSideOption?: boolean;
    onClick?: () => void;
};

interface TabPropsIF {
    data: tabData[];
    rightTabOptions?: ReactNode;
    setShowPositionsOnlyToggle?: Dispatch<SetStateAction<boolean>>;
    isModalView?: boolean;
    shouldSyncWithTradeModules?: boolean;
    transparent?: boolean; // this prop is for components that do not need outside control such as exchange balance
    isPortfolio?: boolean;
}

export default function TabComponent(props: TabPropsIF) {
    const {
        data,
        rightTabOptions,
        isModalView = false,
        shouldSyncWithTradeModules = true,
        transparent = false,
        isPortfolio = false,
    } = props;
    const {
        outsideControl,
        setOutsideControl,
        selectedOutsideTab,
        toggleTradeTable,
        // setCurrentTxActiveInTransactions,
        // setCurrentLimitOrderActive,
        // setCurrentPositionActive,
        // activeTradeTab,
        setActiveTradeTab,
    } = useContext(TradeTableContext);

    const navigate = useNavigate();

    const isMobile = useMediaQuery('(max-width: 600px)');
    const isTabletScreen = useMediaQuery(
        '(min-width: 768px) and (max-width: 1200px)',
    );

    const { tradeTableState } = useContext(ChartContext);

    const [selectedTab, setSelectedTab] = useState(data[0]);

    // const resetActiveRow = () => {
    //     setCurrentTxActiveInTransactions('');
    //     setCurrentLimitOrderActive('');
    //     setCurrentPositionActive('');
    // };

    // useEffect(() => {
    //     resetActiveRow();
    // }, [selectedTab.label]);

    function removeTxTypesFromEnd(inputString: string) {
        // Regular expression to match "transactions", "limits", or "liquidity" at the end of the string
        const typeRegex =
            /(transactions|limits|liquidity|points|exchange-balances|wallet-balances)$/;
        const trailingSlashRegex = /\/$/;

        // Replace the matched keyword with an empty string
        return inputString
            .replace(trailingSlashRegex, '')
            .replace(typeRegex, '');
    }

    function ensureEndsWithSlash(inputString: string) {
        // Check if the string already ends with a forward slash
        if (!inputString.endsWith('/')) {
            // If not, add a forward slash to the end
            inputString += '/';
        }
        return inputString;
    }

    function handleSelectedTab(item: tabData) {
        setOutsideControl(false);
        setSelectedTab(item);
        const path = location.pathname;

        const pathNoType = ensureEndsWithSlash(removeTxTypesFromEnd(path));
        if (
            [
                'transactions',
                'limits',
                'liquidity',
                'exchange balances',
                'dex balances',
                'wallet balances',
                'points',
            ].includes(item.label.toLowerCase())
        ) {
            setActiveTradeTab(item.label.toLowerCase());
            if (isPortfolio) {
                item.label.toLowerCase() === 'transactions'
                    ? navigate(`${pathNoType}transactions`)
                    : item.label.toLowerCase() === 'limits'
                      ? navigate(`${pathNoType}limits`)
                      : item.label.toLowerCase() === 'liquidity'
                        ? navigate(`${pathNoType}liquidity`)
                        : item.label.toLowerCase() === 'points'
                          ? navigate(`${pathNoType}points`)
                          : item.label.toLowerCase() === 'exchange balances' ||
                              item.label.toLowerCase() === 'dex balances'
                            ? navigate(`${pathNoType}exchange-balances`)
                            : item.label.toLowerCase() === 'wallet balances'
                              ? navigate(`${pathNoType}wallet-balances`)
                              : null;
            }
        }
        if (tradeTableState === 'Collapsed') toggleTradeTable();
    }

    useEffect(() => {
        const currentTabData = data.find(
            (item) => item.label === selectedTab.label,
        );
        if (currentTabData) {
            setSelectedTab(currentTabData);
            if (
                [
                    'transactions',
                    'limits',
                    'liquidity',
                    'wallet balances',
                    'exchange balances',
                    'dex balances',
                ].includes(currentTabData.label.toLowerCase())
            ) {
                setActiveTradeTab(currentTabData.label.toLowerCase());
            }
        }
    }, [data, selectedTab.label]);

    function handleOutside2() {
        if (!outsideControl) {
            return;
        } else {
            if (outsideControl) {
                if (data[selectedOutsideTab]) {
                    setSelectedTab(data[selectedOutsideTab]);

                    if (
                        ['transactions', 'limits', 'liquidity'].includes(
                            data[selectedOutsideTab].label.toLowerCase(),
                        )
                    ) {
                        setActiveTradeTab(
                            data[selectedOutsideTab].label.toLowerCase(),
                        );
                    }
                } else {
                    setSelectedTab(data[0]);
                }
            }
        }
    }

    useEffect(() => {
        if (shouldSyncWithTradeModules) handleOutside2();
    }, [
        selectedTab,
        selectedOutsideTab,
        outsideControl,
        shouldSyncWithTradeModules,
    ]);

    function handleMobileMenuIcon(icon: string, label: string): JSX.Element {
        return (
            <div className={styles.tab_icon_container}>
                <DefaultTooltip
                    title={label}
                    arrow
                    enterDelay={400}
                    leaveDelay={200}
                >
                    <img
                        className={styles.tab_icon}
                        src={icon}
                        alt={label}
                        width='15px'
                    />
                </DefaultTooltip>
            </div>
        );
    }

    const rightOptionWithProps =
        // eslint-disable-next-line
        cloneElement(rightTabOptions as ReactElement<any>, {
            currentTab: selectedTab.label,
        });

    const tabsWithRightOption = (
        <div className={styles.navbar_header_container}>
            <div className={styles.tabs_header_container}>
                {data.map((item) => (
                    <div
                        key={item.label}
                        id={`${item.label
                            .replaceAll(' ', '_')
                            .toLowerCase()}_tab_clickable`}
                        className={styles.single_tab}
                        onClick={() => {
                            handleSelectedTab(item);
                        }}
                        aria-describedby={
                            item.label === selectedTab.label
                                ? 'current-tab'
                                : ''
                        }
                        tabIndex={0}
                    >
                        {item.icon
                            ? handleMobileMenuIcon(item.icon, item.label)
                            : null}

                        <div
                            role='tab'
                            aria-selected={item.label === selectedTab.label}
                            tabIndex={0}
                            className={
                                item.label === selectedTab.label
                                    ? styles.active_label_container
                                    : styles.nonactive_label_container
                            }
                        >
                            {item.label}
                        </div>

                        {item.label === selectedTab.label && (
                            <div className={styles.underline} />
                        )}

                        {item.label === selectedTab.label ? (
                            <motion.div
                                className={styles.underline}
                                layoutId='underline'
                            />
                        ) : null}
                    </div>
                ))}
            </div>

            <div className={styles.tap_option_right}>
                {rightTabOptions ? rightOptionWithProps : null}
            </div>
        </div>
    );

    // TAB MENU WITHOUT ANY ITEMS ON THE RIGHT
    const fullTabs = (
        <ul
            className={`${styles.tab_ul} ${styles.desktop_tabs}`}
            aria-label='Navigation Tabs'
        >
            {data.map((item) => (
                <li
                    key={item.label}
                    id={`${item.label
                        .replaceAll(' ', '_')
                        .toLowerCase()}_tab_clickable`}
                    className={
                        item.label === selectedTab.label
                            ? styles.selected
                            : styles.non_selected
                    }
                    onClick={() => {
                        handleSelectedTab(item);
                        item.onClick?.();
                    }}
                    role='tablist'
                    aria-describedby={
                        item.label === selectedTab.label ? 'current-tab' : ''
                    }
                >
                    {item.icon
                        ? handleMobileMenuIcon(item.icon, item.label)
                        : null}
                    {/* {desktopView && ( */}
                    <button
                        className={`${styles.item_label} ${
                            item.label === selectedTab.label
                                ? styles.selected
                                : ''
                        }`}
                        role='tab'
                        aria-selected={item.label === selectedTab.label}
                    >
                        {' '}
                        {item.label}
                    </button>
                    {/* // )} */}

                    {item.label === selectedTab.label && (
                        <motion.div
                            className={styles.underline}
                            layoutId='underline'
                            role='presentation'
                        />
                    )}
                </li>
            ))}
        </ul>
    );

    const tabAlignStyle = isModalView
        ? styles.justify_content_center
        : styles.justify_content_flex_start;

    const backgroundStyle = transparent ? 'transparent' : 'var(--dark1)';

    return (
        <div
            className={styles.tab_window}
            style={{ background: backgroundStyle }}
            role='tablist'
            aria-orientation='horizontal'
            aria-label=''
        >
            <nav className={`${styles.tab_nav} ${tabAlignStyle}`}>
                {/* <AnimateSharedLayout> */}
                {rightTabOptions ? tabsWithRightOption : fullTabs}
                {/* </AnimateSharedLayout> */}
            </nav>

            <div className={styles.main_tab_content}>
                {isMobile || isTabletScreen ? (
                    <div
                        key={selectedTab ? selectedTab.label : 'empty'}
                        role='tabpanel'
                        tabIndex={0}
                        style={{ height: '100%' }}
                        hidden={!selectedTab}
                    >
                        {selectedTab ? selectedTab.content : null}
                    </div>
                ) : (
                    <AnimateSharedLayout>
                        <motion.div
                            key={selectedTab ? selectedTab.label : 'empty'}
                            initial={{ y: 10, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -10, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            role='tabpanel'
                            tabIndex={0}
                            style={{ height: '100%' }}
                            hidden={!selectedTab}
                        >
                            {selectedTab ? selectedTab.content : null}
                        </motion.div>
                    </AnimateSharedLayout>
                )}
            </div>
        </div>
    );
}
