import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LS_KEY_HIDE_EMPTY_POSITIONS_ON_ACCOUNT } from '../ambient-utils/constants';
import { getLocalStorageItem } from '../ambient-utils/dataLayer';
import { useSimulatedIsPoolInitialized } from '../App/hooks/useSimulatedIsPoolInitialized';
import { linkGenMethodsIF, useLinkGen } from '../utils/hooks/useLinkGen';
import { CandleContext } from './CandleContext';
import { ChartContext } from './ChartContext';
import { DataLoadingContext } from './DataLoadingContext';
import { TradeDataContext } from './TradeDataContext';

// 54 is the height of the trade table header
export const TRADE_TABLE_HEADER_HEIGHT = 54;
export interface TradeTableContextIF {
    showOrderPulseAnimation: boolean;
    showRangePulseAnimation: boolean;
    showSwapPulseAnimation: boolean;
    currentPositionActive: string;
    setCurrentPositionActive: (val: string) => void;
    currentTxActiveInTransactions: string;
    setCurrentTxActiveInTransactions: (val: string) => void;
    currentLimitOrderActive: string;
    setCurrentLimitOrderActive: (val: string) => void;
    toggleTradeTable: () => void;
    toggleTradeTableCollapse: () => void;
    showAllData: boolean;
    setShowAllData: (val: boolean) => void;
    selectedOutsideTab: number;
    setSelectedOutsideTab: (val: number) => void;
    activeTradeTab: string;
    setActiveTradeTab: (val: string) => void;

    outsideControl: boolean;
    setOutsideControl: (val: boolean) => void;
    handlePulseAnimation: (type: 'swap' | 'limitOrder' | 'range') => void;

    activeMobileComponent: string;
    setActiveMobileComponent: (val: string) => void;

    hideEmptyPositionsOnAccount: boolean;
    setHideEmptyPositionsOnAccount: (val: boolean) => void;
}

export const TradeTableContext = createContext({} as TradeTableContextIF);

export const TradeTableContextProvider = (props: {
    children: React.ReactNode;
}) => {
    const { isCandleSelected } = useContext(CandleContext);
    const { setChartHeight, chartHeights, isCandleDataNull } =
        useContext(ChartContext);
    const { baseToken, quoteToken } = useContext(TradeDataContext);

    const isPoolInitialized = useSimulatedIsPoolInitialized();

    const { pathname: currentLocation } = useLocation();

    const [showAllData, setShowAllData] = useState(true);
    const [currentTxActiveInTransactions, setCurrentTxActiveInTransactions] =
        useState('');
    const [currentPositionActive, setCurrentPositionActive] = useState('');
    const [currentLimitOrderActive, setCurrentLimitOrderActive] = useState('');

    const [isTradeTableMinimized, setIsTradeTableMinimized] = useState(false);

    const [showSwapPulseAnimation, setShowSwapPulseAnimation] = useState(false);
    const [showOrderPulseAnimation, setShowOrderPulseAnimation] =
        useState(false);
    const [showRangePulseAnimation, setShowRangePulseAnimation] =
        useState(false);
    const [selectedOutsideTab, setSelectedOutsideTab] = useState(0);
    const [outsideControl, setOutsideControl] = useState(false);
    const [activeMobileComponent, setActiveMobileComponent] = useState('trade');

    const [activeTradeTab, setActiveTradeTab] = useState('');

    const { resetPoolDataLoadingStatus, resetConnectedUserDataLoadingStatus } =
        useContext(DataLoadingContext);

    const [hideEmptyPositionsOnAccount, setHideEmptyPositionsOnAccount] =
        useState<boolean>(
            getLocalStorageItem(LS_KEY_HIDE_EMPTY_POSITIONS_ON_ACCOUNT) !== null
                ? getLocalStorageItem(
                      LS_KEY_HIDE_EMPTY_POSITIONS_ON_ACCOUNT,
                  ) === 'true'
                : true,
        );

    useEffect(() => {
        resetPoolDataLoadingStatus();
        resetConnectedUserDataLoadingStatus();
        // setShowAllData(true);
    }, [baseToken.address + quoteToken.address]);

    const tradeTableContext = {
        showAllData,
        setShowAllData,
        currentTxActiveInTransactions,
        setCurrentTxActiveInTransactions,
        currentPositionActive,
        setCurrentPositionActive,
        currentLimitOrderActive,
        setCurrentLimitOrderActive,
        // chartHeight is a minimum of 4 when closed since the resizable selector is 4px in height
        toggleTradeTable: () => {
            if (
                chartHeights.current > chartHeights.min &&
                chartHeights.current < chartHeights.max
            ) {
                setChartHeight(chartHeights.min);
            } else {
                setChartHeight(chartHeights.saved);
            }
        },
        toggleTradeTableCollapse: () => {
            if (
                chartHeights.current > chartHeights.min &&
                chartHeights.current < chartHeights.max
            ) {
                setChartHeight(chartHeights.max);
            } else {
                setChartHeight(chartHeights.saved);
            }
        },
        isTradeTableMinimized,
        setIsTradeTableMinimized,
        showSwapPulseAnimation,
        showOrderPulseAnimation,
        showRangePulseAnimation,
        handlePulseAnimation,
        selectedOutsideTab,
        setSelectedOutsideTab,
        outsideControl,
        setOutsideControl,
        activeMobileComponent,
        setActiveMobileComponent,
        activeTradeTab,
        setActiveTradeTab,
        hideEmptyPositionsOnAccount,
        setHideEmptyPositionsOnAccount,
    };

    function handlePulseAnimation(type: 'swap' | 'limitOrder' | 'range') {
        switch (type) {
            case 'swap':
                setShowSwapPulseAnimation(true);
                setTimeout(() => {
                    setShowSwapPulseAnimation(false);
                }, 3000);
                break;
            case 'limitOrder':
                setShowOrderPulseAnimation(true);
                setTimeout(() => {
                    setShowOrderPulseAnimation(false);
                }, 3000);
                break;
            case 'range':
                setShowRangePulseAnimation(true);

                setTimeout(() => {
                    setShowRangePulseAnimation(false);
                }, 3000);
                break;
            default:
                break;
        }
    }

    function toggleTradeTabBasedOnRoute() {
        if (!isCandleSelected) {
            setOutsideControl(true);
            if (currentLocation.includes('/market')) {
                setSelectedOutsideTab(0);
            } else if (currentLocation.includes('/limit')) {
                setSelectedOutsideTab(1);
            } else if (
                currentLocation.includes('/pool') ||
                currentLocation.includes('reposition') ||
                currentLocation.includes('add')
            ) {
                setSelectedOutsideTab(2);
            }
        }
    }

    const linkGenCurrent: linkGenMethodsIF = useLinkGen();

    useEffect(() => {
        if (location.pathname.includes('/trade')) toggleTradeTabBasedOnRoute();
        switch (linkGenCurrent.currentPage) {
            case 'market':
                setCurrentPositionActive('');
                setCurrentLimitOrderActive('');
                break;
            case 'limit':
                setCurrentTxActiveInTransactions('');
                setCurrentPositionActive('');
                break;
            case 'pool':
                setCurrentTxActiveInTransactions('');
                setCurrentLimitOrderActive('');
                break;
            default:
                break;
        }
    }, [linkGenCurrent.currentPage]);

    const resetTable = () => {
        if (
            chartHeights.saved > chartHeights.min &&
            chartHeights.saved < chartHeights.max
        ) {
            setChartHeight(chartHeights.saved);
        }
    };
    useEffect(() => {
        if (isCandleDataNull && isPoolInitialized) {
            setChartHeight(chartHeights.min);
        } else {
            resetTable();
        }
    }, [isCandleDataNull, isPoolInitialized]);
    return (
        <TradeTableContext value={tradeTableContext}>
            {props.children}
        </TradeTableContext>
    );
};
