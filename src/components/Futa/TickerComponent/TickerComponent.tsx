import { CrocEnv, toDisplayQty } from '@crocswap-libs/sdk';
import { useContext, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    DEFAULT_MAINNET_GAS_PRICE_IN_GWEI,
    DEFAULT_SCROLL_GAS_PRICE_IN_GWEI,
    DEPOSIT_BUFFER_MULTIPLIER_L2,
    DEPOSIT_BUFFER_MULTIPLIER_MAINNET,
    GAS_DROPS_ESTIMATE_DEPOSIT_NATIVE,
    GAS_DROPS_ESTIMATE_RANGE_HARVEST,
    NUM_GWEI_IN_ETH,
    NUM_GWEI_IN_WEI,
    NUM_WEI_IN_GWEI,
    supportedNetworks,
    ZERO_ADDRESS,
} from '../../../ambient-utils/constants';
import {
    AuctionDataIF,
    AuctionTxResponseIF,
    calcBidImpact,
    claimAllocation,
    createBid,
    getFormattedNumber,
    returnBid,
} from '../../../ambient-utils/dataLayer';
import { TokenIF } from '../../../ambient-utils/types';
import useDebounce from '../../../App/hooks/useDebounce';
import { AppStateContext } from '../../../contexts/AppStateContext';
import { AuctionsContext } from '../../../contexts/AuctionsContext';
import { ChainDataContext } from '../../../contexts/ChainDataContext';
import { TokenBalanceContext } from '../../../contexts/TokenBalanceContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import styles from './TickerComponent.module.css';

import moment from 'moment';
import { CrocEnvContext } from '../../../contexts/CrocEnvContext';
import {
    getFreshAuctionDetailsForAccount,
    MARKET_CAP_MULTIPLIER_BIG_INT,
} from '../../../pages/platformFuta/mockAuctionData';
import { linkGenMethodsIF, useLinkGen } from '../../../utils/hooks/useLinkGen';
import { useMediaQuery } from '../../../utils/hooks/useMediaQuery';
import BreadCrumb from '../Breadcrumb/Breadcrumb';
import Comments from '../Comments/Comments';
import FutaDivider2 from '../Divider/FutaDivider2';
import { tickerDisplayElements } from './tickerDisplayElements';
interface PropsIF {
    isAuctionPage?: boolean;
    placeholderTicker?: boolean;
}

// Contexts
const useAuctionContexts = () => {
    const {
        showComments,
        setShowComments,
        globalAuctionList,
        accountData,
        getFreshAuctionData,
        freshAuctionStatusData,
        setSelectedTicker,
    } = useContext(AuctionsContext);
    const { crocEnv } = useContext(CrocEnvContext);

    const { isUserConnected } = useContext(UserDataContext);
    const {
        activeNetwork: { chainId },
        walletModal: { open: openWalletModal },
    } = useContext(AppStateContext);
    const { tokenBalances } = useContext(TokenBalanceContext);
    const { userAddress } = useContext(UserDataContext);
    const {
        gasPriceInGwei,
        isActiveNetworkL2,
        nativeTokenUsdPrice,
        lastBlockNumber,
    } = useContext(ChainDataContext);

    return {
        crocEnv,
        getFreshAuctionData,
        freshAuctionStatusData,
        accountData,
        globalAuctionList,
        chainId,
        showComments,
        setShowComments,
        isUserConnected,
        openWalletModal,
        tokenBalances,
        userAddress,
        gasPriceInGwei,
        isActiveNetworkL2,
        nativeTokenUsdPrice,
        lastBlockNumber,
        setSelectedTicker,
    };
};

// States
const useAuctionStates = () => {
    const { isActiveNetworkL2, freshAuctionStatusData } = useAuctionContexts();
    const [isMaxDropdownOpen, setIsMaxDropdownOpen] = useState(false);
    const [bidQtyNonDisplay, setBidQtyNonDisplay] = useState<
        string | undefined
    >('');
    const [auctionDetails, setAuctionDetails] = useState<
        AuctionDataIF | undefined
    >();
    const [auctionDetailsForConnectedUser, setAuctionDetailsForConnectedUser] =
        useState<AuctionDataIF | undefined>();
    const [bidGasPriceinDollars, setBidGasPriceinDollars] = useState<
        string | undefined
    >();
    const [inputValue, setInputValue] = useState('');
    const [isValidationInProgress, setIsValidationInProgress] =
        useState<boolean>(false);
    const [isPriceImpactQueryInProgress, setIsPriceImpactQueryInProgress] =
        useState<boolean>(false);
    const [bidValidityStatus, setBidValidityStatus] = useState<{
        isValid: boolean;
        reason?: string;
    }>({ isValid: false });
    const [priceImpact, setPriceImpact] = useState<number | undefined>();
    const [
        selectedMaxMarketCapInWeiBigInt,
        setSelectedMaxMarketCapInWeiBigInt,
    ] = useState<bigint | undefined>();
    const [l1GasFeeLimitInGwei] = useState<number>(
        isActiveNetworkL2 ? 0.0002 * 1e9 : 0,
    );
    const [txCreationResponse, setTxCreationResponse] = useState<
        AuctionTxResponseIF | undefined
    >();
    const [isTxPending, setIsTxPending] = useState<boolean>(false);

    const openBidClearingPriceInWeiBigInt =
        freshAuctionStatusData.openBidClearingPriceInNativeTokenWei
            ? BigInt(
                  freshAuctionStatusData.openBidClearingPriceInNativeTokenWei,
              )
            : undefined;

    const openBidMarketCapInWeiBigInt = openBidClearingPriceInWeiBigInt
        ? openBidClearingPriceInWeiBigInt * MARKET_CAP_MULTIPLIER_BIG_INT
        : undefined;

    useEffect(() => {
        setSelectedMaxMarketCapInWeiBigInt(openBidMarketCapInWeiBigInt);
    }, [openBidMarketCapInWeiBigInt]);

    useEffect(() => {
        setTxCreationResponse(undefined);
        setIsTxPending(false);
    }, [inputValue, auctionDetails?.ticker, selectedMaxMarketCapInWeiBigInt]);

    return {
        isMaxDropdownOpen,
        setIsMaxDropdownOpen,
        bidQtyNonDisplay,
        setBidQtyNonDisplay,
        auctionDetails,
        setAuctionDetails,
        auctionDetailsForConnectedUser,
        setAuctionDetailsForConnectedUser,
        bidGasPriceinDollars,
        setBidGasPriceinDollars,
        inputValue,
        setInputValue,
        isValidationInProgress,
        setIsValidationInProgress,
        isPriceImpactQueryInProgress,
        setIsPriceImpactQueryInProgress,
        bidValidityStatus,
        setBidValidityStatus,
        priceImpact,
        setPriceImpact,
        selectedMaxMarketCapInWeiBigInt,
        setSelectedMaxMarketCapInWeiBigInt,
        l1GasFeeLimitInGwei,
        openBidClearingPriceInWeiBigInt,
        txCreationResponse,
        setTxCreationResponse,
        isTxPending,
        setIsTxPending,
    };
};

// Component
export default function TickerComponent(props: PropsIF) {
    const { isAuctionPage, placeholderTicker } = props;
    const desktopScreen = useMediaQuery('(min-width: 1280px)');
    const {
        freshAuctionStatusData,
        getFreshAuctionData,
        chainId,
        crocEnv,
        showComments,
        isUserConnected,
        openWalletModal,
        tokenBalances,
        userAddress,
        gasPriceInGwei,
        isActiveNetworkL2,
        nativeTokenUsdPrice,
        lastBlockNumber,
        accountData,
        globalAuctionList,
        setSelectedTicker,
    } = useAuctionContexts();

    const {
        isMaxDropdownOpen,
        setIsMaxDropdownOpen,
        bidQtyNonDisplay,
        setBidQtyNonDisplay,
        auctionDetails,
        setAuctionDetails,
        auctionDetailsForConnectedUser,
        setAuctionDetailsForConnectedUser,
        bidGasPriceinDollars,
        setBidGasPriceinDollars,
        inputValue,
        setInputValue,
        isValidationInProgress,
        setIsValidationInProgress,
        isPriceImpactQueryInProgress,
        setIsPriceImpactQueryInProgress,
        bidValidityStatus,
        setBidValidityStatus,
        priceImpact,
        setPriceImpact,
        selectedMaxMarketCapInWeiBigInt,
        setSelectedMaxMarketCapInWeiBigInt,
        l1GasFeeLimitInGwei,
        openBidClearingPriceInWeiBigInt,
        txCreationResponse,
        setTxCreationResponse,
        isTxPending,
        setIsTxPending,
    } = useAuctionStates();

    // Utility functions
    const getAuctionDetails = async (ticker: string) => {
        return globalAuctionList.data
            ? globalAuctionList.data.find(
                  (data) => data.ticker.toLowerCase() === ticker.toLowerCase(),
              )
            : undefined;
    };

    const { ticker: tickerFromParams } = useParams();

    useEffect(() => {
        if (!tickerFromParams) return;
        Promise.resolve(getFreshAuctionData(tickerFromParams)).then(() => {
            // console.log('fetched data for ' + tickerFromParams);
        });
        setSelectedTicker(tickerFromParams);
    }, [tickerFromParams, lastBlockNumber]);

    const auctionedTokenQtyUnclaimedByUserInWei =
        auctionDetailsForConnectedUser?.qtyUnclaimedByUserInAuctionedTokenWei;

    const auctionedTokenQtyUnclaimedByUser =
        auctionedTokenQtyUnclaimedByUserInWei
            ? toDisplayQty(auctionedTokenQtyUnclaimedByUserInWei, 18)
            : undefined;

    const unclaimedTokenNum = auctionedTokenQtyUnclaimedByUser
        ? parseFloat(auctionedTokenQtyUnclaimedByUser)
        : 0;

    const formattedUnclaimedTokenAllocationForConnectedUser =
        unclaimedTokenNum.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }) +
        ' ' +
        auctionDetailsForConnectedUser?.ticker;

    const qtyUnreturnedToUser =
        auctionDetailsForConnectedUser?.qtyUnreturnedToUserInNativeTokenWei
            ? toDisplayQty(
                  auctionDetailsForConnectedUser?.qtyUnreturnedToUserInNativeTokenWei,
                  18,
              )
            : undefined;

    const unreturnedTokenNum = qtyUnreturnedToUser
        ? parseFloat(qtyUnreturnedToUser)
        : 0;

    const formattedQtyUnreturnedToUser =
        unreturnedTokenNum.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 3,
        }) +
        ' ' +
        'ETH';

    const filledClearingPriceInWeiBigInt =
        freshAuctionStatusData.filledClearingPriceInNativeTokenWei
            ? BigInt(freshAuctionStatusData.filledClearingPriceInNativeTokenWei)
            : undefined;

    const filledMarketCapInWeiBigInt = filledClearingPriceInWeiBigInt
        ? filledClearingPriceInWeiBigInt * MARKET_CAP_MULTIPLIER_BIG_INT
        : undefined;

    const filledMarketCapInEth = filledMarketCapInWeiBigInt
        ? toDisplayQty(filledMarketCapInWeiBigInt, 18)
        : undefined;

    const [timeRemainingInSeconds, setTimeRemainingInSeconds] = useState<
        number | undefined
    >();

    const refreshTimeRemaining = () => {
        if (auctionDetails) {
            const timeRemainingInSeconds = moment(
                auctionDetails.createdAt * 1000,
            ).diff(Date.now() - auctionDetails.auctionLength * 1000, 'seconds');

            setTimeRemainingInSeconds(timeRemainingInSeconds);
        }
    };

    useEffect(() => {
        // refresh time remaining every 1 second
        refreshTimeRemaining();
        const interval = setInterval(() => {
            refreshTimeRemaining();
        }, 1000);
        return () => clearInterval(interval);
    }, [tickerFromParams, auctionDetails]);

    const isAuctionCompleted =
        timeRemainingInSeconds !== undefined
            ? timeRemainingInSeconds <= 0
            : undefined;

    useEffect(() => {
        if (!tickerFromParams) return;
        Promise.resolve(getAuctionDetails(tickerFromParams)).then((details) => {
            setAuctionDetails(details);
        });
    }, [tickerFromParams, globalAuctionList.data]);

    useEffect(() => {
        if (!tickerFromParams) return;
        if (userAddress) {
            Promise.resolve(
                getFreshAuctionDetailsForAccount(tickerFromParams, accountData),
            ).then((details) => {
                setAuctionDetailsForConnectedUser(
                    details ? details : undefined,
                );
            });
        } else {
            setAuctionDetailsForConnectedUser(undefined);
        }
    }, [tickerFromParams, userAddress, accountData]);

    const averageGasUnitsForBidTxInGasDrops = GAS_DROPS_ESTIMATE_RANGE_HARVEST;

    useEffect(() => {
        if (gasPriceInGwei && nativeTokenUsdPrice) {
            const gasPriceInDollarsNum =
                gasPriceInGwei *
                averageGasUnitsForBidTxInGasDrops *
                NUM_GWEI_IN_WEI *
                nativeTokenUsdPrice;

            setBidGasPriceinDollars(
                getFormattedNumber({
                    value: gasPriceInDollarsNum,
                    isUSD: true,
                }),
            );
        }
    }, [gasPriceInGwei, nativeTokenUsdPrice]);

    const nativeToken = supportedNetworks[chainId]?.defaultPair[0];

    const nativeData: TokenIF | undefined =
        tokenBalances &&
        tokenBalances.find(
            (tkn: TokenIF) => tkn.address === nativeToken.address,
        );

    const nativeTokenWalletBalance = nativeData?.walletBalance;

    const bidDisplayNum = bidQtyNonDisplay
        ? parseFloat(toDisplayQty(bidQtyNonDisplay, nativeToken.decimals))
        : undefined;

    const bidUsdValue =
        nativeTokenUsdPrice !== undefined && bidDisplayNum !== undefined
            ? nativeTokenUsdPrice * bidDisplayNum
            : undefined;

    const nativeTokenDecimals = nativeToken.decimals;

    const checkBidValidity = async (
        bidQtyNonDisplay: string,
    ): Promise<{ isValid: boolean; reason?: string }> => {
        const isNonZero =
            !!bidQtyNonDisplay && parseFloat(bidQtyNonDisplay) > 0;

        if (!isNonZero)
            return {
                isValid: false,
                reason: 'Bid size must be greater than 0',
            };

        const inputValueGreaterThanSelectedClearingPrice =
            BigInt(bidQtyNonDisplay) >
            (selectedMaxMarketCapInWeiBigInt ?? 0n) /
                MARKET_CAP_MULTIPLIER_BIG_INT;

        if (inputValueGreaterThanSelectedClearingPrice)
            return {
                isValid: false,
                reason: 'Increase max market cap',
            };

        if (!isUserConnected) {
            return { isValid: true };
        } else {
            if (!nativeTokenWalletBalanceAdjustedNonDisplayString)
                return { isValid: false, reason: 'No balance' };

            const bidSizeLessThanAdjustedBalance =
                BigInt(nativeTokenWalletBalanceAdjustedNonDisplayString) >
                BigInt(bidQtyNonDisplay);

            return {
                isValid: bidSizeLessThanAdjustedBalance,
                reason: 'Insufficient balance',
            };
        }
    };

    const getPriceImpact = async (
        crocEnv: CrocEnv | undefined,
        bidQtyNonDisplay: string,
    ) => {
        if (!crocEnv || !tickerFromParams || !selectedMaxMarketCapInWeiBigInt)
            return undefined;
        const isNonZero =
            !!bidQtyNonDisplay && parseFloat(bidQtyNonDisplay) > 0;

        if (!isNonZero || !openBidClearingPriceInWeiBigInt) return undefined;

        const priceImpact = calcBidImpact(
            crocEnv,
            tickerFromParams,
            selectedMaxMarketCapInWeiBigInt.toString(),
            bidQtyNonDisplay,
        );

        return priceImpact;
    };

    const debouncedBidInput: string | undefined = useDebounce(
        bidQtyNonDisplay,
        500,
    );

    const nativeTokenWalletBalanceDisplay = nativeTokenWalletBalance
        ? toDisplayQty(nativeTokenWalletBalance, nativeTokenDecimals)
        : undefined;

    const nativeTokenWalletBalanceDisplayNum = nativeTokenWalletBalanceDisplay
        ? parseFloat(nativeTokenWalletBalanceDisplay)
        : undefined;

    const nativeTokenWalletBalanceTruncated = getFormattedNumber({
        value: nativeTokenWalletBalanceDisplayNum,
    });

    const amountToReduceNativeTokenQtyMainnet =
        BigInt(Math.ceil(gasPriceInGwei || DEFAULT_MAINNET_GAS_PRICE_IN_GWEI)) *
        BigInt(NUM_WEI_IN_GWEI) *
        BigInt(GAS_DROPS_ESTIMATE_DEPOSIT_NATIVE) *
        BigInt(DEPOSIT_BUFFER_MULTIPLIER_MAINNET);

    const amountToReduceNativeTokenQtyL2 =
        BigInt(Math.ceil(gasPriceInGwei || DEFAULT_SCROLL_GAS_PRICE_IN_GWEI)) *
        BigInt(NUM_WEI_IN_GWEI) *
        BigInt(GAS_DROPS_ESTIMATE_DEPOSIT_NATIVE) *
        BigInt(DEPOSIT_BUFFER_MULTIPLIER_L2);

    const amountToReduceNativeTokenQty = isActiveNetworkL2
        ? amountToReduceNativeTokenQtyL2
        : amountToReduceNativeTokenQtyMainnet;

    const nativeTokenWalletBalanceAdjustedNonDisplayString =
        nativeTokenWalletBalance
            ? (
                  BigInt(nativeTokenWalletBalance) -
                  amountToReduceNativeTokenQty -
                  BigInt(l1GasFeeLimitInGwei * NUM_GWEI_IN_ETH)
              ).toString()
            : nativeTokenWalletBalance;

    useEffect(() => {
        if (!debouncedBidInput) return;
        checkBidValidity(debouncedBidInput).then((result) => {
            setIsValidationInProgress(false);
            setBidValidityStatus(result);
        });
        getPriceImpact(crocEnv, debouncedBidInput).then((impact) => {
            setIsPriceImpactQueryInProgress(false);
            setPriceImpact(impact?.priceImpactPercentage);
        });
    }, [
        debouncedBidInput,
        nativeTokenWalletBalanceAdjustedNonDisplayString,
        lastBlockNumber,
        selectedMaxMarketCapInWeiBigInt,
    ]);

    useEffect(() => {
        setIsValidationInProgress(true);
    }, [bidQtyNonDisplay]);

    const formattedPriceImpact =
        !priceImpact || isPriceImpactQueryInProgress
            ? '-'
            : getFormattedNumber({
                  value: priceImpact * 100,
                  isPercentage: true,
              }) + '%';

    const filledMarketCapUsdValue =
        nativeTokenUsdPrice !== undefined && filledMarketCapInEth !== undefined
            ? nativeTokenUsdPrice * parseFloat(filledMarketCapInEth)
            : undefined;

    const isAllocationAvailableToClaim =
        auctionedTokenQtyUnclaimedByUser &&
        parseFloat(auctionedTokenQtyUnclaimedByUser) > 0;

    const isNativeTokenAvailableToReturn =
        qtyUnreturnedToUser && parseFloat(qtyUnreturnedToUser) > 0;

    const showTradeButton =
        (isAuctionCompleted && !isUserConnected) ||
        (isUserConnected &&
            isAuctionCompleted &&
            !isAllocationAvailableToClaim &&
            !isNativeTokenAvailableToReturn);

    const txFailed =
        txCreationResponse?.isSuccess !== undefined
            ? txCreationResponse.isSuccess === false
            : false;

    const txSucceeded =
        txCreationResponse?.isSuccess !== undefined
            ? txCreationResponse.isSuccess === true
            : false;

    const displayPendingTxMessage =
        isTxPending && txCreationResponse === undefined;

    const isButtonDisabled =
        isUserConnected &&
        (displayPendingTxMessage ||
            txCreationResponse !== undefined ||
            (!isAuctionCompleted &&
                (isValidationInProgress || !bidValidityStatus.isValid)));

    const failMessage =
        txCreationResponse?.failureReason !== undefined
            ? txCreationResponse?.failureReason
            : 'Transaction Failed';

    const buttonLabel =
        !tickerFromParams && isUserConnected
            ? 'Select an Auction'
            : displayPendingTxMessage
              ? 'Transaction Pending...'
              : txFailed
                ? failMessage
                : txSucceeded
                  ? `${txCreationResponse?.txType} Succeeded!`
                  : isAllocationAvailableToClaim
                    ? 'Claim'
                    : isNativeTokenAvailableToReturn
                      ? 'Return'
                      : showTradeButton
                        ? 'Trade'
                        : !isUserConnected
                          ? 'Connect Wallet'
                          : !bidQtyNonDisplay ||
                              parseFloat(bidQtyNonDisplay) === 0
                            ? 'Enter a Bid Size'
                            : isValidationInProgress
                              ? 'Validating Bid...'
                              : bidValidityStatus.isValid
                                ? 'Bid'
                                : bidValidityStatus.reason || 'Invalid Bid';

    const sendBidTransaction = async () => {
        if (
            !bidQtyNonDisplay ||
            !tickerFromParams ||
            !selectedMaxMarketCapInWeiBigInt
        )
            return;

        setIsTxPending(true);

        setTxCreationResponse(
            await createBid(
                crocEnv,
                tickerFromParams,
                bidQtyNonDisplay,
                selectedMaxMarketCapInWeiBigInt?.toString(),
            ),
        );
    };

    const sendClaimTransaction = async () => {
        if (!auctionedTokenQtyUnclaimedByUserInWei || !tickerFromParams) return;

        console.log(
            `clicked claim for amount: ${formattedUnclaimedTokenAllocationForConnectedUser}`,
        );

        setIsTxPending(true);

        setTxCreationResponse(
            await claimAllocation(
                crocEnv,
                tickerFromParams,
                // auctionedTokenQtyUnclaimedByUserInWei,
            ),
        );
    };

    const sendReturnTransaction = async () => {
        if (!qtyUnreturnedToUser || !tickerFromParams) return;

        console.log(
            `clicked return for amount: ${formattedQtyUnreturnedToUser}`,
        );

        setIsTxPending(true);

        setTxCreationResponse(
            await returnBid(
                crocEnv,
                tickerFromParams,
                // qtyUnreturnedToUser
            ),
        );
    };

    // hook to generate navigation actions with pre-loaded path
    // ... with logic to get data for programmatic generation
    const linkGenSwap: linkGenMethodsIF = useLinkGen('swap');
    function goToSwap(): void {
        linkGenSwap.navigate({
            tokenA: ZERO_ADDRESS,
            tokenB: freshAuctionStatusData.tokenAddress ?? '',
            chain: '0xaa36a7',
        });
    }

    const bidButton = (
        <button
            className={`${styles.bidButton} ${
                isButtonDisabled ? styles.bidButtonDisabled : ''
            } ${desktopScreen ? styles.bidButtonDesktop : ''}`}
            onClick={() =>
                isAllocationAvailableToClaim
                    ? sendClaimTransaction()
                    : isNativeTokenAvailableToReturn
                      ? sendReturnTransaction()
                      : showTradeButton
                        ? goToSwap()
                        : !isUserConnected
                          ? openWalletModal()
                          : sendBidTransaction()
            }
            disabled={isButtonDisabled}
        >
            {buttonLabel}
        </button>
    );

    const tickerDisplayElementsProps = {
        freshAuctionStatusData,
        auctionDetailsForConnectedUser,
        filledMarketCapInEth,
        filledMarketCapUsdValue,
        timeRemainingInSeconds,
        isAuctionCompleted,
        placeholderTicker,
        auctionDetails,
        bidGasPriceinDollars,
        formattedPriceImpact,
        isAuctionPage,
        isMaxDropdownOpen,
        setIsMaxDropdownOpen,
        selectedMaxMarketCapInWeiBigInt,
        setSelectedMaxMarketCapInWeiBigInt,
        bidUsdValue,
        nativeTokenWalletBalanceTruncated,
        bidQtyNonDisplay,
        setBidQtyNonDisplay,
        inputValue,
        setInputValue,
    };

    const {
        maxFdvDisplay,
        bidSizeDisplay,
        extraInfoDisplay,
        tickerDisplay,
        openedBidDisplay,
        yourBidDisplay,
    } = tickerDisplayElements(tickerDisplayElementsProps);

    const allocationOrReturnDisplay = (
        <div className={styles.allocationContainer}>
            <h3>{unclaimedTokenNum ? 'ALLOCATION' : 'RETURN'} </h3>
            <div className={styles.allocationDisplay}>
                {unclaimedTokenNum
                    ? formattedUnclaimedTokenAllocationForConnectedUser
                    : formattedQtyUnreturnedToUser}
            </div>
            {extraInfoDisplay}
        </div>
    );

    const QTY_INPUT_ID = 'exchangeBalance_qty';
    const bidQtyInputField = document.getElementById(
        QTY_INPUT_ID,
    ) as HTMLInputElement;

    const elementIsVisibleInViewport = (
        el: HTMLInputElement,
        partiallyVisible = false,
    ) => {
        const { top, left, bottom, right } = el.getBoundingClientRect();
        const { innerHeight, innerWidth } = window;
        const futaBottomScrollableArea = bottom + 100;
        return partiallyVisible
            ? ((top > 0 && top < innerHeight) ||
                  (futaBottomScrollableArea > 0 &&
                      futaBottomScrollableArea < innerHeight)) &&
                  ((left > 0 && left < innerWidth) ||
                      (right > 0 && right < innerWidth))
            : top >= 0 &&
                  left >= 0 &&
                  futaBottomScrollableArea <= innerHeight &&
                  right <= innerWidth;
    };

    useEffect(() => {
        // e.g. 100x100 viewport and a 10x10px element at position
        // {top: -1, left: 0, bottom: 9, right: 10}
        if (bidQtyInputField) {
            const elementFullyVisible =
                elementIsVisibleInViewport(bidQtyInputField); // false - (not fully visible)
            // const elementPartiallyVisible = elementIsVisibleInViewport(
            //     bidQtyInputField,
            //     true,
            // ); // true - (partially visible)
            /* auto-focus the bid qty input field on first load
                                   and when the max market cap value changes,
                                   but only when the input field is empty */
            // could be improved by first checking if the field is visible, rather than auto scrolling
            if (elementFullyVisible && !inputValue) bidQtyInputField.focus();
        }
    }, [bidQtyInputField, selectedMaxMarketCapInWeiBigInt, inputValue]);

    const completedDisplay = (
        <div className={styles.justifyBetween}>
            <div className={styles.flexColumn}>
                {!isAuctionPage && <BreadCrumb />}
                {tickerDisplay}
                {!showComments && yourBidDisplay}
                {showComments && <Comments />}
            </div>
            {isUserConnected && !showTradeButton && allocationOrReturnDisplay}
        </div>
    );
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = containerRef.current;
        let isScrolling: NodeJS.Timeout;

        const handleScroll = () => {
            if (container) {
                container.classList.add(styles.scrolling);

                // Clear the timeout throughout the scroll
                window.clearTimeout(isScrolling);

                // Set a timeout to run after scrolling ends
                isScrolling = setTimeout(() => {
                    container.classList.remove(styles.scrolling);
                }, 1000);
            }
        };

        if (container) {
            container.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, []);

    const unCompletedDisplay = (
        <>
            <div className={styles.content} ref={containerRef}>
                {!isAuctionPage && <BreadCrumb />}
                {tickerDisplay}
                <div className={styles.flexColumn}>
                    {showComments && <Comments />}
                </div>

                {!showComments && (
                    <>
                        <FutaDivider2 />
                        {openedBidDisplay}
                        <FutaDivider2 />
                        {yourBidDisplay}
                        <FutaDivider2 />
                        <div className={styles.flexColumn}>
                            {maxFdvDisplay}
                            {bidSizeDisplay}
                            {extraInfoDisplay}
                        </div>
                    </>
                )}
            </div>
        </>
    );

    return (
        <div className={styles.container}>
            {isAuctionCompleted ? completedDisplay : unCompletedDisplay}
            {!showComments && bidButton}
        </div>
    );
}
