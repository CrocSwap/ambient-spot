import {
    Dispatch,
    SetStateAction,
    useCallback,
    useContext,
    useMemo,
} from 'react';
import { LuSettings } from 'react-icons/lu';
import { Outlet } from 'react-router-dom';
import { useSimulatedIsPoolInitialized } from '../../../App/hooks/useSimulatedIsPoolInitialized';
import { CandleDataIF } from '../../../ambient-utils/types';
import ContentContainer from '../../../components/Global/ContentContainer/ContentContainer';
import TokenIcon from '../../../components/Global/TokenIcon/TokenIcon';
import TableInfo from '../../../components/Trade/TableInfo/TableInfo';
import TradeTabs2 from '../../../components/Trade/TradeTabs/TradeTabs2';
import {
    AppStateContext,
    ChartContext,
    CrocEnvContext,
    PoolContext,
    TokenContext,
    TradeDataContext,
} from '../../../contexts';
import { useBottomSheet } from '../../../contexts/BottomSheetContext';
import { FlexContainer } from '../../../styled/Common';
import { useUrlParams } from '../../../utils/hooks/useUrlParams';
import ChartToolbar from '../Chart/Draw/Toolbar/Toolbar';
import TradeCharts from './TradeCharts/TradeCharts';
import TimeFrame from './TradeCharts/TradeChartsComponents/TimeFrame';
import styles from './TradeMobile.module.css';

interface propsIF {
    poolPrice: string;
    poolPriceChangeString: string;

    // tradecharts
    changeState: (
        isOpen: boolean | undefined,
        candleData: CandleDataIF | undefined,
    ) => void;
    selectedDate: number | undefined;
    setSelectedDate: Dispatch<SetStateAction<number | undefined>>;
    isMobileSettingsModalOpen: boolean;
    openMobileSettingsModal: () => void;
    closeMobileSettingsModal: () => void;

    // tradetabs
    filter: CandleDataIF | undefined;
    transactionFilter: CandleDataIF | undefined;
    setTransactionFilter: Dispatch<SetStateAction<CandleDataIF | undefined>>;

    hasInitialized: boolean;
    setHasInitialized: Dispatch<SetStateAction<boolean>>;
    unselectCandle: () => void;
}
// const slideVariants = {
//     enter: (direction: number) => ({
//         x: direction > 0 ? 100 : -100,
//         opacity: 0,
//         position: 'absolute' as const,
//         zIndex: 1,
//         height: '100%',
//     }),
//     center: {
//         x: 0,
//         opacity: 1,
//         position: 'relative' as const,
//         zIndex: 0,
//         height: '100%',
//     },
//     exit: (direction: number) => ({
//         x: direction < 0 ? 100 : -100,
//         opacity: 0,
//         position: 'absolute' as const,
//         zIndex: 1,
//         height: '100%',
//     }),
// };
export default function TradeMobile(props: propsIF) {
    const {
        poolPrice,
        poolPriceChangeString,
        changeState,
        selectedDate,
        setSelectedDate,
        isMobileSettingsModalOpen,
        openMobileSettingsModal,
        closeMobileSettingsModal,
        setTransactionFilter,
        hasInitialized,
        setHasInitialized,
        unselectCandle,
        transactionFilter,
    } = props;

    const { provider } = useContext(CrocEnvContext);
    const { tokens } = useContext(TokenContext);
    const {
        baseToken,
        quoteToken,
        isDenomBase,
        limitTick,
        toggleDidUserFlipDenom,
        activeTab,
        setActiveTab,
    } = useContext(TradeDataContext);
    const isPoolInitialized = useSimulatedIsPoolInitialized();
    const {
        layout,
        activeNetwork: { chainId },
    } = useContext(AppStateContext);

    const { isPoolPriceChangePositive } = useContext(PoolContext);
    const { chartSettings, isChartHeightMinimum, isCandleDataNull } =
        useContext(ChartContext);

    const { urlParamMap, updateURL } = useUrlParams(tokens, chainId, provider);
    const { isBottomSheetOpen } = useBottomSheet();

    // const [direction, setDirection] = useState<number>(0);
    // const touchStartX = useRef<number | null>(null);
    // const touchEndX = useRef<number | null>(null);

    // Memoized props
    const tradeChartsProps = useMemo(
        () => ({
            changeState,
            selectedDate,
            setSelectedDate,
            updateURL,
            isMobileSettingsModalOpen,
            openMobileSettingsModal,
            closeMobileSettingsModal,
        }),
        [
            changeState,
            selectedDate,
            setSelectedDate,
            updateURL,
            isMobileSettingsModalOpen,
            openMobileSettingsModal,
            closeMobileSettingsModal,
        ],
    );

    const tradeTabsProps = useMemo(
        () => ({
            filter: transactionFilter,
            setTransactionFilter,
            changeState,
            selectedDate,
            setSelectedDate,
            hasInitialized,
            setHasInitialized,
            unselectCandle,
            candleTime: chartSettings.candleTime.global,
            tokens,
        }),
        [
            transactionFilter,
            setTransactionFilter,
            changeState,
            selectedDate,
            setSelectedDate,
            hasInitialized,
            setHasInitialized,
            unselectCandle,
            chartSettings.candleTime.global,
            tokens,
        ],
    );

    // Touch handlers
    // const handleTouchStart = useCallback((e: React.TouchEvent) => {
    //     touchStartX.current = e.touches[0].clientX;
    // }, []);

    // const handleTouchMove = useCallback((e: React.TouchEvent) => {
    //     touchEndX.current = e.touches[0].clientX;
    // }, []);

    // Memoize tabs
    const tabs = useMemo(
        () => [
            {
                id: 'Order',
                label: 'Order',
                data: (
                    <ContentContainer
                        isOnTradeRoute
                        style={{ padding: '0 1rem' }}
                    >
                        <Outlet
                            context={{ urlParamMap, limitTick, updateURL }}
                        />
                    </ContentContainer>
                ),
            },
            {
                id: 'Chart',
                label: 'Chart',
                data: (
                    <>
                        {!isChartHeightMinimum && <ChartToolbar />}
                        {isPoolInitialized && !isCandleDataNull && (
                            <TradeCharts {...tradeChartsProps} />
                        )}
                    </>
                ),
            },
            {
                id: 'Txns',
                label: 'Txns',
                data: <TradeTabs2 {...tradeTabsProps} />,
            },
            {
                id: 'Info',
                label: 'Info',
                data: <TableInfo />,
            },
        ],
        [
            urlParamMap,
            limitTick,
            updateURL,
            isChartHeightMinimum,
            isPoolInitialized,
            isCandleDataNull,
            tradeChartsProps,
            tradeTabsProps,
        ],
    );

    // Tab change handlers
    const handleTabChange = useCallback(
        (newTab: string): void => {
            // const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
            // const newIndex = tabs.findIndex(tab => tab.id === newTab);
            // setDirection(newIndex > currentIndex ? 1 : -1);
            setActiveTab(newTab);
            localStorage.setItem('activeTradeTabOnMobile', newTab);
        },
        [activeTab, tabs],
    );

    // const handleTouchEnd = useCallback(() => {
    //     if (!touchStartX.current || !touchEndX.current) return;

    //     const distance = touchStartX.current - touchEndX.current;
    //     const isLeftSwipe = distance > 50;
    //     const isRightSwipe = distance < -50;

    //     const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

    //     if (isLeftSwipe && currentIndex < tabs.length - 1) {
    //         handleTabChange(tabs[currentIndex + 1].id);
    //     } else if (isRightSwipe && currentIndex > 0) {
    //         handleTabChange(tabs[currentIndex - 1].id);
    //     }

    //     touchStartX.current = null;
    //     touchEndX.current = null;
    // }, [activeTab, tabs, handleTabChange]);

    // Memoize mobile tabs
    const mobileTabs = useMemo(
        () => (
            <div
                className={styles.mobile_tabs_container}
                style={{ zIndex: isBottomSheetOpen ? 0 : 2 }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        className={`${styles.tabButton} ${activeTab === tab.id ? styles.activeTab : ''}`}
                        onClick={() => handleTabChange(tab.id)}
                        style={{
                            color:
                                activeTab === tab.id
                                    ? 'var(--accent1)'
                                    : 'var(--text2)',
                            border:
                                activeTab === tab.id
                                    ? '1px solid var(--accent1)'
                                    : '1px solid transparent',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
        ),
        [activeTab, handleTabChange, tabs, isBottomSheetOpen],
    );

    // Memoize header content
    const headerContent = useMemo(
        () => (
            <div
                className={styles.mobile_header}
                style={{
                    zIndex: isBottomSheetOpen ? 0 : '2',
                }}
            >
                <div
                    className={styles.mobile_token_icons}
                    onClick={toggleDidUserFlipDenom}
                >
                    <TokenIcon
                        token={isDenomBase ? baseToken : quoteToken}
                        src={
                            isDenomBase ? baseToken.logoURI : quoteToken.logoURI
                        }
                        alt={isDenomBase ? baseToken.symbol : quoteToken.symbol}
                        size={'s'}
                    />
                    <TokenIcon
                        token={isDenomBase ? quoteToken : baseToken}
                        src={
                            isDenomBase ? quoteToken.logoURI : baseToken.logoURI
                        }
                        alt={isDenomBase ? quoteToken.symbol : baseToken.symbol}
                        size={'s'}
                    />
                    <div>
                        {isDenomBase ? baseToken.symbol : quoteToken.symbol}
                        {'/'}
                        {isDenomBase ? quoteToken.symbol : baseToken.symbol}
                    </div>
                </div>
                <div
                    className={styles.conv_rate}
                    onClick={toggleDidUserFlipDenom}
                >
                    {poolPrice}
                    <p
                        style={{
                            color: isPoolPriceChangePositive
                                ? 'var(--positive)'
                                : 'var(--negative)',
                            fontSize: 'var(--body-size)',
                        }}
                    >
                        {poolPriceChangeString}
                    </p>
                </div>
            </div>
        ),
        [
            isBottomSheetOpen,
            isDenomBase,
            baseToken,
            quoteToken,
            toggleDidUserFlipDenom,
            poolPrice,
            isPoolPriceChangePositive,
            poolPriceChangeString,
        ],
    );

    return (
        <div
            className={styles.mobile_container}
            style={{
                height: layout.contentHeight,
                maxWidth: activeTab === 'Order' ? '600px' : '',
            }}
            // onTouchStart={handleTouchStart}
            // onTouchMove={handleTouchMove}
            // onTouchEnd={handleTouchEnd}
        >
            {mobileTabs}
            {headerContent}

            {activeTab === 'Chart' && (
                <FlexContainer
                    style={{
                        justifyContent: 'space-between',
                        padding: '0px 1rem 1rem 0.5rem',
                    }}
                >
                    <div className={styles.mobile_settings_row}>
                        <TimeFrame
                            candleTime={chartSettings.candleTime.global}
                        />
                    </div>
                    <LuSettings
                        size={20}
                        onClick={openMobileSettingsModal}
                        color='var(--text2)'
                    />
                </FlexContainer>
            )}

            {/* <AnimatePresence initial={false} custom={direction}> */}
            <div
                // key={activeTab}
                // custom={direction}
                // variants={slideVariants}
                // initial='enter'
                // animate='center'
                // exit='exit'
                // transition={{
                //     x: { type: 'spring', stiffness: 300, damping: 30 },
                //     opacity: { duration: 0.2 },
                // }}
                style={{
                    height: '100%',
                    overflowY: 'scroll',
                    width: '100%',
                }}
            >
                {tabs.find((tab) => tab.id === activeTab)?.data}
            </div>
            {/* </AnimatePresence> */}
        </div>
    );
}
