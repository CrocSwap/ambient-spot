import { toDisplayQty } from '@crocswap-libs/sdk';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { fetchUserRecentChanges } from '../../../ambient-utils/api';
import { CACHE_UPDATE_FREQ_IN_MS } from '../../../ambient-utils/constants';
import {
    filterLimitArray,
    getLimitOrderData,
    getPositionData,
    sumTotalValueUSD,
} from '../../../ambient-utils/dataLayer';
import {
    LimitOrderIF,
    LimitOrderServerIF,
    PositionIF,
    PositionServerIF,
    TokenIF,
    TransactionIF,
} from '../../../ambient-utils/types';
import medal from '../../../assets/images/icons/medal.svg';
import exchangeImage from '../../../assets/images/sidebarImages/exchange.svg';
import openOrdersImage from '../../../assets/images/sidebarImages/openOrders.svg';
import rangePositionsImage from '../../../assets/images/sidebarImages/rangePositions.svg';
import recentTransactionsImage from '../../../assets/images/sidebarImages/recentTransactions.svg';
import walletImage from '../../../assets/images/sidebarImages/wallet.svg';
import { TokenBalanceContext } from '../../../contexts';
import { AppStateContext } from '../../../contexts/AppStateContext';
import { CachedDataContext } from '../../../contexts/CachedDataContext';
import { ChainDataContext } from '../../../contexts/ChainDataContext';
import { CrocEnvContext } from '../../../contexts/CrocEnvContext';
import { DataLoadingContext } from '../../../contexts/DataLoadingContext';
import { GraphDataContext } from '../../../contexts/GraphDataContext';
import { TokenContext } from '../../../contexts/TokenContext';
import {
    UserDataContext,
    UserXpDataIF,
} from '../../../contexts/UserDataContext';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import Exchange from '../../Global/Account/AccountTabs/Exchange/Exchange';
import Points from '../../Global/Account/AccountTabs/Points/Points';
import Wallet from '../../Global/Account/AccountTabs/Wallet/Wallet';
import TabComponent from '../../Global/TabComponent/TabComponent';
import Orders from '../../Trade/TradeTabs/Orders/Orders';
import Ranges from '../../Trade/TradeTabs/Ranges/Ranges';
import Transactions from '../../Trade/TradeTabs/Transactions/Transactions';
import styles from './PortfolioTabs.module.css';

// interface for React functional component props
interface propsIF {
    resolvedAddressTokens: (TokenIF | undefined)[];
    resolvedAddress: string | undefined;
    connectedAccountActive: boolean;
    fullLayoutActive: boolean;
    resolvedUserXp: UserXpDataIF;
}

// React functional component
export default function PortfolioTabs(props: propsIF) {
    const {
        resolvedAddressTokens,
        resolvedAddress,
        connectedAccountActive,
        fullLayoutActive,
        resolvedUserXp,
    } = props;

    const { cachedQuerySpotPrice, cachedFetchTokenPrice, cachedTokenDetails } =
        useContext(CachedDataContext);

    const { activePoolList } = useContext(ChainDataContext);

    const {
        setTotalLiquidityValue,
        setTotalWalletBalanceValue,
        setTotalExchangeBalanceValue,
        userAddress,
        setTotalVaultsValue,
        userVaultData,
    } = useContext(UserDataContext);

    const {
        server: { isEnabled: isServerEnabled },
        isUserIdle,
        activeNetwork: { gcgo, chainId },
    } = useContext(AppStateContext);

    const { setDataLoadingStatus } = useContext(DataLoadingContext);
    const isSmallScreen = useMediaQuery('(max-width: 768px)');
    const isLessThanDesktopSizeScreen = useMediaQuery('(max-width: 1500px)');
    const { crocEnv, provider } = useContext(CrocEnvContext);
    const { tokens } = useContext(TokenContext);
    const { positionsByUser, limitOrdersByUser, transactionsByUser } =
        useContext(GraphDataContext);

    const activePortfolioAddress = useMemo(() => {
        return connectedAccountActive
            ? userAddress || ''
            : resolvedAddress || '';
    }, [connectedAccountActive, userAddress, resolvedAddress]);

    // TODO: can pull into GraphDataContext
    const filterFn = <T extends { chainId: string }>(x: T) =>
        x.chainId === chainId;

    const _positionsByUser = positionsByUser.positions.filter(filterFn);
    const _txsByUser = transactionsByUser.changes.filter(filterFn);
    const _limitsByUser = limitOrdersByUser.limitOrders.filter(filterFn);

    const [lookupAccountPositionData, setLookupAccountPositionData] = useState<
        PositionIF[] | undefined
    >();
    const [lookupAccountLimitOrderData, setLookupAccountLimitOrderData] =
        useState<LimitOrderIF[] | undefined>();
    const [lookupAccountTransactionData, setLookupAccountTransactionData] =
        useState<TransactionIF[] | undefined>();

    useEffect(() => {
        let totalValue = 0;
        if (userVaultData) {
            totalValue = userVaultData.reduce((total: number, vault: any) => {
                // Parse balanceUsd as a float, default to 0 if empty or invalid
                const usd = parseFloat(vault.balanceUsd);
                return total + (isNaN(usd) ? 0 : usd);
            }, 0);
        }
        setTotalVaultsValue({
            value: totalValue,
            chainId: userVaultData?.[0]?.chainId || chainId,
            address: userVaultData?.[0]?.walletAddress || userAddress || '',
        });
    }, [JSON.stringify(userVaultData), chainId, userAddress]);

    const getLookupUserPositions = async (accountToSearch: string) => {
        gcgo.userPositions({
            user: accountToSearch,
            chainId: chainId,
            count: 200,
        }).then((userPositions: PositionServerIF[]) => {
            // temporarily skip ENS fetch
            if (userPositions && crocEnv && provider) {
                Promise.all(
                    userPositions.map((position: PositionServerIF) => {
                        return getPositionData(
                            position,
                            tokens.tokenUniv,
                            crocEnv,
                            provider,
                            chainId,
                            activePoolList,
                            cachedFetchTokenPrice,
                            cachedQuerySpotPrice,
                            cachedTokenDetails,
                        );
                    }),
                )
                    .then((updatedPositions) => {
                        setLookupAccountPositionData(
                            updatedPositions.filter((p) => p.positionLiq > 0),
                        );
                    })
                    .finally(() => {
                        setDataLoadingStatus({
                            datasetName: 'isLookupUserRangeDataLoading',
                            loadingStatus: false,
                        });
                    });
            }
        });
    };

    const getLookupUserLimitOrders = async (accountToSearch: string) => {
        gcgo.userLimitOrders({
            user: accountToSearch,
            chainId: chainId,
            count: 200,
        }).then((userLimitOrderStates: LimitOrderServerIF[]) => {
            if (userLimitOrderStates && crocEnv && provider) {
                Promise.all(
                    userLimitOrderStates.map(
                        (limitOrder: LimitOrderServerIF) => {
                            return getLimitOrderData(
                                limitOrder,
                                tokens.tokenUniv,
                                crocEnv,
                                provider,
                                chainId,
                                activePoolList,
                                cachedFetchTokenPrice,
                                cachedQuerySpotPrice,
                                cachedTokenDetails,
                            );
                        },
                    ),
                )
                    .then((updatedLimitOrderStates) => {
                        const filteredData = filterLimitArray(
                            updatedLimitOrderStates,
                        );
                        setLookupAccountLimitOrderData(filteredData);
                    })
                    .finally(() => {
                        setDataLoadingStatus({
                            datasetName: 'isLookupUserOrderDataLoading',
                            loadingStatus: false,
                        });
                    });
            }
        });
    };

    const getLookupUserTransactions = async (accountToSearch: string) => {
        if (crocEnv && provider) {
            fetchUserRecentChanges({
                tokenList: tokens.tokenUniv,
                user: accountToSearch,
                chainId: chainId,
                n: 100, // fetch last 100 changes,
                crocEnv: crocEnv,
                gcgo: gcgo,
                provider,
                activePoolList,
                cachedFetchTokenPrice: cachedFetchTokenPrice,
                cachedQuerySpotPrice: cachedQuerySpotPrice,
                cachedTokenDetails: cachedTokenDetails,
            })
                .then((updatedTransactions) => {
                    if (updatedTransactions) {
                        const userTransactionsWithoutFills =
                            updatedTransactions.filter(
                                (tx) => tx.changeType !== 'cross',
                            );
                        setLookupAccountTransactionData(
                            userTransactionsWithoutFills,
                        );
                    }
                })
                .finally(() => {
                    setDataLoadingStatus({
                        datasetName: 'isLookupUserTxDataLoading',
                        loadingStatus: false,
                    });
                });
        }
    };

    useEffect(() => {
        (async () => {
            if (
                !connectedAccountActive &&
                resolvedAddress &&
                isServerEnabled &&
                crocEnv &&
                (await crocEnv.context).chain.chainId === chainId &&
                !!tokens.tokenUniv
            ) {
                setDataLoadingStatus({
                    datasetName: 'isLookupUserRangeDataLoading',
                    loadingStatus: true,
                });
                setDataLoadingStatus({
                    datasetName: 'isLookupUserOrderDataLoading',
                    loadingStatus: true,
                });
                setDataLoadingStatus({
                    datasetName: 'isLookupUserTxDataLoading',
                    loadingStatus: true,
                });
                await Promise.all([
                    getLookupUserTransactions(resolvedAddress),
                    getLookupUserLimitOrders(resolvedAddress),
                    getLookupUserPositions(resolvedAddress),
                ]);
            }
        })();
    }, [
        resolvedAddress,
        connectedAccountActive,
        !!tokens.tokenUniv,
        crocEnv,
        chainId,
        provider,
        isServerEnabled,
    ]);

    // update without loading indicator on an interval
    useEffect(() => {
        (async () => {
            if (
                !connectedAccountActive &&
                resolvedAddress &&
                isServerEnabled &&
                crocEnv &&
                (await crocEnv.context).chain.chainId === chainId &&
                !!tokens.tokenUniv
            ) {
                await Promise.all([
                    getLookupUserTransactions(resolvedAddress),
                    getLookupUserLimitOrders(resolvedAddress),
                    getLookupUserPositions(resolvedAddress),
                ]);
            }
        })();
    }, [
        isUserIdle
            ? Math.floor(Date.now() / (2 * CACHE_UPDATE_FREQ_IN_MS))
            : Math.floor(Date.now() / CACHE_UPDATE_FREQ_IN_MS),
    ]);

    const activeAccountPositionData = useMemo(
        () =>
            connectedAccountActive
                ? _positionsByUser
                : lookupAccountPositionData,
        [connectedAccountActive, _positionsByUser, lookupAccountPositionData],
    );

    const activeAccountLimitOrderData = useMemo(
        () =>
            connectedAccountActive
                ? _limitsByUser
                : lookupAccountLimitOrderData,
        [connectedAccountActive, _limitsByUser, lookupAccountLimitOrderData],
    );

    useEffect(() => {
        setTotalLiquidityValue(undefined);
        setTotalExchangeBalanceValue(undefined);
        setTotalWalletBalanceValue(undefined);
    }, [chainId, userAddress]);

    useEffect(() => {
        setTotalLiquidityValue({
            value:
                activeAccountPositionData && activeAccountLimitOrderData
                    ? sumTotalValueUSD(activeAccountPositionData) +
                      sumTotalValueUSD(activeAccountLimitOrderData)
                    : activeAccountPositionData
                      ? sumTotalValueUSD(activeAccountPositionData)
                      : activeAccountLimitOrderData
                        ? sumTotalValueUSD(activeAccountLimitOrderData)
                        : 0,
            chainId: chainId,
            address: connectedAccountActive
                ? userAddress || ''
                : resolvedAddress || '',
        });
    }, [
        JSON.stringify(activeAccountPositionData),
        JSON.stringify(activeAccountLimitOrderData),
        chainId,
        connectedAccountActive ? userAddress : resolvedAddress,
    ]);

    const activeAccountTransactionData = useMemo(
        () =>
            connectedAccountActive
                ? _txsByUser?.filter((tx) => {
                      if (
                          tx.changeType !== 'fill' &&
                          tx.changeType !== 'cross'
                      ) {
                          return true;
                      } else {
                          return false;
                      }
                  })
                : lookupAccountTransactionData?.filter((tx) => {
                      if (
                          tx.changeType !== 'fill' &&
                          tx.changeType !== 'cross'
                      ) {
                          return true;
                      } else {
                          return false;
                      }
                  }),
        [connectedAccountActive, _txsByUser, lookupAccountTransactionData],
    );

    const { tokenBalances } = useContext(TokenBalanceContext);

    const tokensToRender = useMemo(() => {
        return connectedAccountActive ? tokenBalances : resolvedAddressTokens;
    }, [connectedAccountActive, tokenBalances, resolvedAddressTokens]);

    useEffect(() => {
        async function calculateBalances() {
            if (
                !tokensToRender ||
                tokensToRender.length === 0 ||
                Number(chainId) !== Number(tokensToRender[0]?.chainId)
            ) {
                setTotalExchangeBalanceValue(undefined);
                setTotalWalletBalanceValue(undefined);
                return;
            }
            const results = await Promise.all(
                tokensToRender.map(async (token) => {
                    if (!token) {
                        return { exchange: 0, wallet: 0 };
                    }
                    let price = 0;
                    try {
                        const priceObj = await cachedFetchTokenPrice(
                            token.address,
                            chainId,
                        );
                        price = priceObj?.usdPrice ?? 0;
                    } catch {}
                    const dexBalanceDisplay = token.dexBalance
                        ? toDisplayQty(token.dexBalance, token.decimals)
                        : undefined;
                    const dexBalanceDisplayNum = dexBalanceDisplay
                        ? parseFloat(dexBalanceDisplay)
                        : 0;
                    const walletBalanceDisplay = token.walletBalance
                        ? toDisplayQty(token.walletBalance, token.decimals)
                        : undefined;
                    const walletBalanceDisplayNum = walletBalanceDisplay
                        ? parseFloat(walletBalanceDisplay)
                        : 0;
                    return {
                        exchange: price * dexBalanceDisplayNum,
                        wallet: price * walletBalanceDisplayNum,
                    };
                }),
            );
            setTotalExchangeBalanceValue({
                value: results.reduce((sum, v) => sum + v.exchange, 0),
                chainId: chainId,
                address: activePortfolioAddress,
            });
            setTotalWalletBalanceValue({
                value: results.reduce((sum, v) => sum + v.wallet, 0),
                chainId: chainId,
                address: activePortfolioAddress,
            });
        }
        calculateBalances();
    }, [JSON.stringify(tokensToRender), activePortfolioAddress]);

    // props for <Wallet/> React Element
    const walletProps = {
        chainId: chainId,
        resolvedAddressTokens: resolvedAddressTokens,
        connectedAccountActive: connectedAccountActive,
        resolvedAddress: resolvedAddress ?? '',
        cachedFetchTokenPrice: cachedFetchTokenPrice,
    };

    // props for <Exchange/> React Element
    const exchangeProps = {
        chainId: chainId,
        resolvedAddressTokens: resolvedAddressTokens,
        connectedAccountActive: connectedAccountActive,
        resolvedAddress: resolvedAddress ?? '',
        cachedFetchTokenPrice: cachedFetchTokenPrice,
    };

    // props for <Range/> React Element
    const rangeProps = {
        activeAccountPositionData: activeAccountPositionData,
        connectedAccountActive: connectedAccountActive,
        isAccountView: true,
    };

    // props for <Points/> React Element
    const pointsProps = {
        resolvedUserXp: resolvedUserXp,
        connectedAccountActive: connectedAccountActive,
    };

    // props for <Transactions/> React Element
    const transactionsProps = {
        activeAccountTransactionData: activeAccountTransactionData,
        connectedAccountActive: connectedAccountActive,
        changesInSelectedCandle: undefined,
        isAccountView: true,
        fullLayoutActive: fullLayoutActive,
        accountAddress: resolvedAddress,
    };

    // Props for <Orders/> React Element
    const ordersProps = {
        activeAccountLimitOrderData: activeAccountLimitOrderData,
        connectedAccountActive: connectedAccountActive,
        isAccountView: true,
    };

    const accountTabDataWithTokens = [
        {
            label: 'Transactions',
            content: <Transactions {...transactionsProps} />,
            icon: recentTransactionsImage,
        },
        {
            label: 'Limits',
            content: <Orders {...ordersProps} />,
            icon: openOrdersImage,
        },
        {
            label: 'Liquidity',
            content: <Ranges {...rangeProps} />,
            icon: rangePositionsImage,
        },
        {
            label: 'Points',
            content: <Points {...pointsProps} />,
            icon: medal,
        },
        {
            label: isLessThanDesktopSizeScreen
                ? 'DEX Balances'
                : 'Exchange Balances',
            content: <Exchange {...exchangeProps} />,
            icon: exchangeImage,
        },
        {
            label: 'Wallet Balances',
            content: <Wallet {...walletProps} />,
            icon: walletImage,
        },
    ];

    const accountTabDataWithoutTokens = [
        {
            label: 'Transactions',
            content: <Transactions {...transactionsProps} />,
            icon: recentTransactionsImage,
        },
        {
            label: 'Limits',
            content: <Orders {...ordersProps} />,
            icon: openOrdersImage,
        },
        {
            label: 'Liquidity',
            content: <Ranges {...rangeProps} />,
            icon: rangePositionsImage,
        },
        {
            label: 'Points',
            content: <Points {...pointsProps} />,
            icon: medal,
        },
        {
            label: 'Exchange Balances',
            content: <Exchange {...exchangeProps} />,
            icon: exchangeImage,
        },
        {
            label: 'Wallet Balances',
            content: <Wallet {...walletProps} />,
            icon: walletImage,
        },
    ];

    const dataToUse = connectedAccountActive
        ? accountTabDataWithTokens
        : accountTabDataWithoutTokens;

    const location = useLocation();

    // active tab rendered in DOM
    const DEFAULT_TAB = 'Transactions';
    const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB);

    // allow the user to reach the Points tab through URL navigation
    useEffect(() => {
        if (location.pathname.includes('points')) {
            setActiveTab('Points');
        }
    }, [location.pathname]);

    // TODO:    this file is changing state without changing URL, we should
    // TODO:    ... refactor to trigger a nav action and update state responsively

    const renderTabContent = (): React.ReactNode | null => {
        const selectedTabData = dataToUse.find(
            (tab) => tab.label === activeTab,
        );
        return selectedTabData ? selectedTabData.content : null;
    };

    const mobileTabs: React.ReactNode = (
        <div className={styles.mobile_tabs_container}>
            <div className={styles.mobile_tabs_button_container}>
                {dataToUse
                    .filter((t) => t.label !== 'Points')
                    .map((tab) => (
                        <button
                            key={tab.label}
                            onClick={() => setActiveTab(tab.label)}
                            style={{
                                color:
                                    tab.label === activeTab
                                        ? 'var(--accent1)'
                                        : 'var(--text2)',
                                borderBottom:
                                    tab.label === activeTab
                                        ? '1px solid var(--accent1)'
                                        : '1px solid transparent',
                            }}
                        >
                            <span className={styles.tabLabel}>{tab.label}</span>
                        </button>
                    ))}
            </div>
            <div className={styles.tabContent} style={{ height: '100%' }}>
                {renderTabContent()}
            </div>
        </div>
    );

    if (isSmallScreen) return mobileTabs;
    return (
        <div className={styles.portfolio_tabs_container}>
            <TabComponent
                data={dataToUse}
                rightTabOptions={false}
                isPortfolio={true}
            />
        </div>
    );
}
