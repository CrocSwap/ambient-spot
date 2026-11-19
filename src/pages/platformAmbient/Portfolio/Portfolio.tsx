import { memo, useContext, useEffect, useMemo, useState } from 'react';

import Button from '../../../components/Form/Button';
import ExchangeBalance from '../../../components/Portfolio/ExchangeBalance/ExchangeBalance';
import PortfolioBanner from '../../../components/Portfolio/PortfolioBanner/PortfolioBanner';
import PortfolioTabs from '../../../components/Portfolio/PortfolioTabs/PortfolioTabs';
import ProfileSettings from '../../../components/Portfolio/ProfileSettings/ProfileSettings';

import { Navigate, useParams } from 'react-router-dom';
import {
    expandTokenBalances,
    fetchEnsAddress,
    fetchUserXpData,
    IDexTokenBalances,
} from '../../../ambient-utils/api';
import { trimString } from '../../../ambient-utils/dataLayer';
import { TokenIF } from '../../../ambient-utils/types';
import { useSimulatedIsUserConnected } from '../../../App/hooks/useSimulatedIsUserConnected';
import Modal from '../../../components/Global/Modal/Modal';
import ModalHeader from '../../../components/Global/ModalHeader/ModalHeader';
import NFTBannerAccount from '../../../components/Portfolio/PortfolioBanner/PortfolioBannerAccount/NFTBannerAccount';
import { TokenBalanceContext } from '../../../contexts';
import { AppStateContext } from '../../../contexts/AppStateContext';
import { CachedDataContext } from '../../../contexts/CachedDataContext';
import { CrocEnvContext } from '../../../contexts/CrocEnvContext';
import { TokenContext } from '../../../contexts/TokenContext';
import { TradeTableContext } from '../../../contexts/TradeTableContext';
import {
    UserDataContext,
    UserXpDataIF,
} from '../../../contexts/UserDataContext';
import { FlexContainer, Text } from '../../../styled/Common';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import Level from '../Level/Level';
import styles from './Portfolio.module.css';

interface propsIF {
    isLevelsPage?: boolean;
    isRanksPage?: boolean;
    isViewMoreActive?: boolean;
    specificTab?: string;
}

function Portfolio(props: propsIF) {
    const { isLevelsPage, isRanksPage, isViewMoreActive, specificTab } = props;

    const {
        walletModal: { open: openModalWallet },
        activeNetwork: { chainId, gcgo },
    } = useContext(AppStateContext);
    const {
        userAddress,
        isfetchNftTriggered,
        setIsfetchNftTriggered,
        setNftTestWalletAddress,
        setResolvedAddressInContext,
        ensName,
        setSecondaryEnsInContext,
    } = useContext(UserDataContext);
    const { NFTData, NFTFetchSettings, setNFTFetchSettings } =
        useContext(TokenBalanceContext);
    const {
        cachedFetchAmbientListWalletBalances,
        cachedFetchDexBalances,
        cachedTokenDetails,
    } = useContext(CachedDataContext);
    const { crocEnv, mainnetProvider } = useContext(CrocEnvContext);
    const { tokens } = useContext(TokenContext);
    const { setOutsideControl, setSelectedOutsideTab } =
        useContext(TradeTableContext);

    const { address: addressFromParams } = useParams();

    const isUserConnected = useSimulatedIsUserConnected();

    const isAddressEns = addressFromParams?.endsWith('.eth');
    const isAddressHex =
        addressFromParams?.startsWith('0x') && addressFromParams?.length == 42;

    if (addressFromParams && !isAddressEns && !isAddressHex)
        return <Navigate to='/404' replace />;

    const [resolvedAddress, setResolvedAddress] = useState<string | undefined>(
        undefined,
    );

    const connectedAccountActive: boolean = useMemo(
        () =>
            userAddress
                ? addressFromParams
                    ? resolvedAddress
                        ? resolvedAddress?.toLowerCase() ===
                          userAddress.toLowerCase()
                            ? true
                            : false
                        : true
                    : true
                : false,
        [addressFromParams, resolvedAddress, userAddress],
    );

    useEffect(() => {
        (async () => {
            if (addressFromParams && isAddressEns && mainnetProvider) {
                try {
                    const newResolvedAddress =
                        await mainnetProvider.resolveName(addressFromParams);
                    setResolvedAddress(newResolvedAddress ?? '');
                    setResolvedAddressInContext(newResolvedAddress ?? '');
                } catch (error) {
                    console.error({ error });
                }
            } else if (addressFromParams && isAddressHex && !isAddressEns) {
                setResolvedAddress(addressFromParams);
                setResolvedAddressInContext(addressFromParams);
            } else {
                setResolvedAddress('');
                setResolvedAddressInContext('');
            }
        })();
    }, [addressFromParams, isAddressHex, isAddressEns, mainnetProvider]);

    const [secondaryEnsName, setSecondaryEnsName] = useState('');

    // check for ENS name account changes
    useEffect(() => {
        (async () => {
            if (addressFromParams && !isAddressEns) {
                try {
                    const ensName = await fetchEnsAddress(addressFromParams);

                    if (ensName) {
                        setSecondaryEnsName(ensName);
                        setSecondaryEnsInContext(ensName);
                    } else {
                        setSecondaryEnsName('');
                        setSecondaryEnsInContext('');
                    }
                } catch (error) {
                    setSecondaryEnsName('');
                    setSecondaryEnsInContext('');
                    console.error({ error });
                }
            } else if (addressFromParams && isAddressEns) {
                setSecondaryEnsName(addressFromParams);
                setSecondaryEnsInContext(addressFromParams);
            }
        })();
    }, [addressFromParams, isAddressEns]);

    const [resolvedUserXp, setResolvedUserXp] = useState<UserXpDataIF>({
        dataReceived: false,
        data: undefined,
    });

    // fetch xp data for resolved address if not connected user account
    useEffect(() => {
        if (!connectedAccountActive && resolvedAddress) {
            fetchUserXpData({ user: resolvedAddress, chainId: chainId })
                .then((resolvedUserXp) => {
                    setResolvedUserXp({
                        dataReceived: true,
                        data: resolvedUserXp,
                    });
                })
                .catch((error) => {
                    console.error({ error });
                    setResolvedUserXp({
                        dataReceived: false,
                        data: undefined,
                    });
                });
        }
    }, [connectedAccountActive, resolvedAddress]);

    const [fullLayoutActive, setFullLayoutActive] = useState<boolean>(false);
    const [isAutoLayout, setIsAutoLayout] = useState<boolean>(true); // Tracks if the layout is being set automatically

    const showMobileVersion = useMediaQuery('(max-width: 768px)');
    const matchesMinWidth = useMediaQuery('(min-width: 768px)');
    const matchesMaxWidth = useMediaQuery('(max-width: 1280px)');

    useEffect(() => {
        // Only change `fullLayoutActive` if it's set automatically
        if (isAutoLayout && matchesMinWidth && matchesMaxWidth) {
            setFullLayoutActive(true);
        } else if (isAutoLayout && (!matchesMinWidth || !matchesMaxWidth)) {
            setFullLayoutActive(false);
        }
    }, [isAutoLayout, matchesMinWidth, matchesMaxWidth]);

    const [showTabsAndNotExchange, setShowTabsAndNotExchange] = useState(false);

    const exchangeBalanceModal = (
        <Modal
            usingCustomHeader
            onClose={() => setShowTabsAndNotExchange(false)}
        >
            <ModalHeader
                title={'Exchange Balance'}
                onClose={() => setShowTabsAndNotExchange(false)}
            />
            <div className={styles.container}>
                <ExchangeBalance
                    fullLayoutActive={fullLayoutActive}
                    setFullLayoutActive={setFullLayoutActive}
                    isModalView
                />
            </div>
        </Modal>
    );

    const exchangeBalanceComponent =
        showMobileVersion && showTabsAndNotExchange ? (
            exchangeBalanceModal
        ) : (
            <ExchangeBalance
                fullLayoutActive={fullLayoutActive}
                setFullLayoutActive={setFullLayoutActive}
                setIsAutoLayout={setIsAutoLayout}
            />
        );

    useEffect(() => {
        !connectedAccountActive
            ? setFullLayoutActive(true)
            : setFullLayoutActive(false);
    }, [connectedAccountActive]);

    const [resolvedAddressTokens, setResolvedAddressTokens] = useState<
        TokenIF[]
    >([]);

    const [
        intermediateResolvedAddressTokens,
        setIntermediateResolvedAddressTokens,
    ] = useState<TokenIF[] | undefined>(undefined);

    useEffect(() => {
        setResolvedAddressTokens([]);
        setIntermediateResolvedAddressTokens(undefined);
    }, [resolvedAddress, chainId]);

    useEffect(() => {
        if (
            intermediateResolvedAddressTokens &&
            intermediateResolvedAddressTokens[0]?.chainId === Number(chainId)
        ) {
            setResolvedAddressTokens(intermediateResolvedAddressTokens);
        }
    }, [intermediateResolvedAddressTokens, chainId]);

    // used to trigger token balance refreshes every 5 minutes
    const everyFiveMinutes = Math.floor(Date.now() / 300000);

    useEffect(() => {
        (async () => {
            if (
                crocEnv &&
                resolvedAddress &&
                chainId &&
                !connectedAccountActive
            ) {
                if (
                    !crocEnv ||
                    (await crocEnv.context).chain.chainId !== chainId
                )
                    return;
                try {
                    const combinedBalances: TokenIF[] = [];

                    // fetch wallet balances for tokens in ambient token list
                    const AmbientListWalletBalances: TokenIF[] | undefined =
                        await cachedFetchAmbientListWalletBalances({
                            address: resolvedAddress,
                            chain: chainId,
                            crocEnv: crocEnv,
                            ackTokens: tokens.ackTokens,
                            _refreshTime: everyFiveMinutes,
                        });

                    combinedBalances.push(...AmbientListWalletBalances);

                    // fetch exchange balances and wallet balances for tokens in user's exchange balances
                    const dexBalancesFromCache = await cachedFetchDexBalances({
                        address: resolvedAddress,
                        chain: chainId,
                        crocEnv: crocEnv,
                        gcgo: gcgo,
                        _refreshTime: everyFiveMinutes,
                    });

                    if (dexBalancesFromCache !== undefined) {
                        await Promise.all(
                            dexBalancesFromCache.map(
                                async (tokenBalances: IDexTokenBalances) => {
                                    const indexOfExistingToken = (
                                        combinedBalances ?? []
                                    ).findIndex(
                                        (existingToken) =>
                                            existingToken.address.toLowerCase() ===
                                            tokenBalances.tokenAddress.toLowerCase(),
                                    );
                                    const newToken = await expandTokenBalances(
                                        tokenBalances,
                                        tokens.tokenUniv,
                                        cachedTokenDetails,
                                        crocEnv,
                                        chainId,
                                    );

                                    if (indexOfExistingToken === -1) {
                                        const updatedToken = {
                                            ...newToken,
                                        };
                                        combinedBalances.push(updatedToken);
                                    } else {
                                        const existingToken =
                                            combinedBalances[
                                                indexOfExistingToken
                                            ];

                                        const updatedToken = {
                                            ...existingToken,
                                        };

                                        updatedToken.dexBalance =
                                            newToken.dexBalance;

                                        combinedBalances[indexOfExistingToken] =
                                            updatedToken;
                                    }
                                },
                            ),
                        );
                    }

                    const tokensWithLogos = combinedBalances.map((token) => {
                        const oldToken: TokenIF | undefined =
                            tokens.getTokenByAddress(token.address);
                        const newToken = { ...token };
                        newToken.name = oldToken ? oldToken.name : '';
                        newToken.logoURI = oldToken ? oldToken.logoURI : '';
                        newToken.symbol =
                            oldToken?.symbol || newToken.symbol || '';
                        return newToken;
                    });

                    setIntermediateResolvedAddressTokens(tokensWithLogos);
                } catch (error) {
                    console.error({ error });
                }
            }
        })();
    }, [
        crocEnv,
        resolvedAddress,
        chainId,
        everyFiveMinutes,
        connectedAccountActive,
    ]);

    const [showProfileSettings, setShowProfileSettings] = useState(false);

    const showActiveMobileComponent = useMediaQuery('(max-width: 1500px)');

    const notConnectedContent = (
        <FlexContainer
            fullWidth
            fullHeight
            flexDirection='column'
            justifyContent='center'
            alignItems='center'
            gap={8}
        >
            <Text>Please connect your wallet.</Text>
            <Button
                idForDOM='connect_wallet_in_account_page'
                flat
                title='Connect Wallet'
                action={() => openModalWallet()}
            />
        </FlexContainer>
    );

    const portfolioTabsProps = {
        resolvedAddressTokens: resolvedAddressTokens,
        resolvedAddress: resolvedAddress,
        connectedAccountActive: connectedAccountActive,
        fullLayoutActive: fullLayoutActive,
        resolvedUserXp: resolvedUserXp,
    };

    const [nftTestWalletInput, setNftTestWalletInput] = useState<string>('');
    const [showNFTPage, setShowNFTPage] = useState(false);

    function handleTestWalletChange(nftTestWalletInput: string) {
        setNftTestWalletAddress(() => nftTestWalletInput);
        setIsfetchNftTriggered(() => true);
    }

    const portfolioBannerProps = {
        ensName: connectedAccountActive
            ? (ensName ?? '')
            : secondaryEnsName
              ? secondaryEnsName
              : '',
        resolvedAddress: resolvedAddress ?? '',
        setShowProfileSettings: setShowProfileSettings,
        connectedAccountActive: connectedAccountActive,
        resolvedUserXp: resolvedUserXp,
        showTabsAndNotExchange: showTabsAndNotExchange,
        setShowTabsAndNotExchange: setShowTabsAndNotExchange,

        nftTestWalletInput,
        setNftTestWalletInput,
        showNFTPage,
        setShowNFTPage,
        handleTestWalletChange,
        NFTData,
        NFTFetchSettings,
        setNFTFetchSettings,
        userAddress,
    };

    const truncatedAccountAddressOrEnsName = connectedAccountActive
        ? ensName
            ? ensName
            : trimString(userAddress ?? '', 6, 6, '…')
        : secondaryEnsName
          ? secondaryEnsName
          : trimString(resolvedAddress ?? '', 6, 6, '…');

    const levelsProps = {
        resolvedAddress: resolvedAddress ?? '',
        truncatedAccountAddressOrEnsName: truncatedAccountAddressOrEnsName,
        connectedAccountActive: connectedAccountActive,
        isDisplayRank: isRanksPage,
        resolvedUserXp,
        isViewMoreActive,
    };

    const profileSettingsProps = {
        showProfileSettings: showProfileSettings,
        setShowProfileSettings: setShowProfileSettings,
        ensName: secondaryEnsName ? secondaryEnsName : (ensName ?? ''),
    };

    const contentToRenderOnMobile = (() => {
        if (isUserConnected || addressFromParams !== undefined) {
            return (
                <>
                    <PortfolioTabs {...portfolioTabsProps} />
                    {showTabsAndNotExchange && exchangeBalanceComponent}
                </>
            );
        }
        return notConnectedContent;
    })();

    const [availableHeight, setAvailableHeight] = useState(window.innerHeight);

    useEffect(() => {
        const calculateHeight = () => {
            const totalHeight = window.innerHeight;
            const heightToSubtract = 56 + 56; // Subtract 56px from top and 56px from bottom
            setAvailableHeight(totalHeight - heightToSubtract);
        };

        calculateHeight(); // Calculate initial height
        window.addEventListener('resize', calculateHeight);

        return () => window.removeEventListener('resize', calculateHeight);
    }, []);

    const bannerHeight = 115;
    const contentHeight = availableHeight - bannerHeight;

    const mobileBannerSettings = !showNFTPage ? null : (
        <Modal usingCustomHeader onClose={() => setShowNFTPage(false)}>
            {NFTData && (
                <NFTBannerAccount
                    setShowNFTPage={setShowNFTPage}
                    showNFTPage={showNFTPage}
                    NFTData={NFTData}
                    isfetchNftTriggered={isfetchNftTriggered}
                    setIsfetchNftTriggered={setIsfetchNftTriggered}
                    NFTFetchSettings={NFTFetchSettings}
                    setNFTFetchSettings={setNFTFetchSettings}
                    setNftTestWalletInput={setNftTestWalletInput}
                    nftTestWalletInput={nftTestWalletInput}
                    handleTestWalletChange={handleTestWalletChange}
                />
            )}
        </Modal>
    );

    const mobilePortfolio = (
        <div
            className={styles.mobile_layout}
            style={{ height: `${availableHeight}px` }}
        >
            <PortfolioBanner {...portfolioBannerProps} />
            <div style={{ height: `${contentHeight}px`, overflowY: 'hidden' }}>
                {contentToRenderOnMobile}
            </div>
            {mobileBannerSettings}
        </div>
    );

    // tab control on account from pageheader
    const onTradeRoute = location.pathname.includes('trade');
    const onAccountRoute = location.pathname.includes('account');

    const tabToSwitchToBasedOnRoute = onTradeRoute
        ? 0
        : onAccountRoute || addressFromParams
          ? specificTab === 'points'
              ? 3
              : specificTab === 'liquidity'
                ? 2
                : specificTab === 'limits'
                  ? 1
                  : specificTab === 'transactions'
                    ? 0
                    : specificTab === 'exchange-balances'
                      ? 4
                      : specificTab === 'wallet-balances'
                        ? 5
                        : 0
          : 0;

    useEffect(() => {
        if (specificTab) {
            setOutsideControl(true);
            setSelectedOutsideTab(tabToSwitchToBasedOnRoute);
        }
    }, [specificTab]);

    if (showActiveMobileComponent && !isLevelsPage) return mobilePortfolio;
    if (isLevelsPage) return <Level {...levelsProps} />;

    return (
        <div data-testid={'portfolio'} className={styles.portfolio_container}>
            {connectedAccountActive && showProfileSettings && (
                <ProfileSettings {...profileSettingsProps} />
            )}

            <div
                className={`${styles.portfolio_tabs_container}
                 ${connectedAccountActive ? styles.active : ''} ${
                     !connectedAccountActive || fullLayoutActive
                         ? styles.fullLayoutContainer
                         : ''
                 }`}
            >
                {isUserConnected || addressFromParams ? (
                    <PortfolioTabs {...portfolioTabsProps} />
                ) : undefined}

                {connectedAccountActive
                    ? exchangeBalanceComponent
                    : !isUserConnected && !addressFromParams
                      ? notConnectedContent
                      : undefined}
            </div>
            <PortfolioBanner {...portfolioBannerProps} />

            {showNFTPage && NFTData && (
                <NFTBannerAccount
                    setShowNFTPage={setShowNFTPage}
                    showNFTPage={showNFTPage}
                    NFTData={NFTData}
                    isfetchNftTriggered={isfetchNftTriggered}
                    setIsfetchNftTriggered={setIsfetchNftTriggered}
                    NFTFetchSettings={NFTFetchSettings}
                    setNFTFetchSettings={setNFTFetchSettings}
                    setNftTestWalletInput={setNftTestWalletInput}
                    nftTestWalletInput={nftTestWalletInput}
                    handleTestWalletChange={handleTestWalletChange}
                />
            )}
        </div>
    );
}

export default memo(Portfolio);
