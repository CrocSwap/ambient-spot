import { useContext, useEffect, useRef, useState } from 'react';

import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import {
    CACHE_UPDATE_FREQ_IN_MS,
    IS_LOCAL_ENV,
} from '../../../../../ambient-utils/constants';
import {
    getFormattedNumber,
    getLimitOrderData,
    printDomToImage,
} from '../../../../../ambient-utils/dataLayer';
import {
    LimitOrderIF,
    LimitOrderServerIF,
} from '../../../../../ambient-utils/types';
import modalBackground from '../../../../../assets/images/backgrounds/background.png';
import { AppStateContext } from '../../../../../contexts/AppStateContext';
import { CachedDataContext } from '../../../../../contexts/CachedDataContext';
import { CrocEnvContext } from '../../../../../contexts/CrocEnvContext';
import { TokenContext } from '../../../../../contexts/TokenContext';
import { UserDataContext } from '../../../../../contexts/UserDataContext';
import useCopyToClipboard from '../../../../../utils/hooks/useCopyToClipboard';
import { useMediaQuery } from '../../../../../utils/hooks/useMediaQuery';
import { useProcessOrder } from '../../../../../utils/hooks/useProcessOrder';
import Modal from '../../../../Global/Modal/Modal';
import ModalHeader from '../../../ModalHeader/ModalHeader';
import DetailsHeader from '../../DetailsHeader/DetailsHeader';
import MobileDetailTabs from '../../MobileDetailTabs/MobileDetailTabs';
import TransactionDetailsGraph from '../../TransactionDetailsGraph/TransactionDetailsGraph';
import styles from '../../TransactionDetailsModal.module.css';
import OrderDetailsSimplify from '../OrderDetailsSimplify/OrderDetailsSimplify';
import PriceInfo from '../PriceInfo/PriceInfo';

interface propsIF {
    limitOrder: LimitOrderIF;
    isBaseTokenMoneynessGreaterOrEqual: boolean;
    isAccountView: boolean;
    onClose: () => void;
}

export default function OrderDetailsModal(props: propsIF) {
    const showMobileVersion = useMediaQuery('(max-width: 768px)');

    const {
        limitOrder,
        isBaseTokenMoneynessGreaterOrEqual,
        isAccountView,
        onClose,
    } = props;

    const [showShareComponent, setShowShareComponent] = useState(true);
    const {
        activeNetwork,
        snackbar: { open: openSnackbar },
    } = useContext(AppStateContext);
    const {
        cachedQuerySpotPrice,
        cachedFetchTokenPrice,
        cachedTokenDetails,
        cachedEnsResolve,
    } = useContext(CachedDataContext);
    const { crocEnv, provider } = useContext(CrocEnvContext);
    const { tokens } = useContext(TokenContext);

    const { userAddress } = useContext(UserDataContext);

    const {
        baseTokenSymbol,
        quoteTokenSymbol,
        baseTokenName,
        quoteTokenName,
        baseDisplay,
        quoteDisplay,
        isDenomBase,
        baseTokenLogo,
        quoteTokenLogo,
        isOrderFilled,
        isLimitOrderPartiallyFilled,
        truncatedDisplayPrice,
        truncatedDisplayPriceDenomByMoneyness,
        posHash,
        fillPercentage,
        originalPositionLiqBase,
        originalPositionLiqQuote,
        expectedPositionLiqBase,
        expectedPositionLiqQuote,
        middlePriceDisplay,
        middlePriceDisplayDenomByMoneyness,
    } = useProcessOrder(limitOrder, crocEnv, userAddress);

    const [isClaimable, setIsClaimable] = useState<boolean>(isOrderFilled);

    const [_, copy] = useCopyToClipboard();

    function handleCopyPositionId() {
        copy(posHash);
        openSnackbar(`${posHash} copied`, 'info');
    }

    const [usdValue, setUsdValue] = useState<string>('...');
    const [baseCollateralDisplay, setBaseCollateralDisplay] =
        useState<string>(baseDisplay);

    const [quoteCollateralDisplay, setQuoteCollateralDisplay] =
        useState<string>(quoteDisplay);

    const chainId = limitOrder.chainId;
    const user = limitOrder.user;
    const bidTick = limitOrder.bidTick;
    const askTick = limitOrder.askTick;
    const pivotTime = limitOrder.pivotTime;
    const baseTokenAddress = limitOrder.base;
    const quoteTokenAddress = limitOrder.quote;
    const positionType = 'knockout';

    const isBid = limitOrder.isBid;

    const isFillStarted = isLimitOrderPartiallyFilled || isOrderFilled;

    useEffect(() => {
        const positionStatsCacheEndpoint =
            activeNetwork.GCGO_URL + '/limit_stats?';

        const poolIndex = lookupChain(chainId).poolIndex;
        if (positionType && crocEnv && provider) {
            fetch(
                positionStatsCacheEndpoint +
                    new URLSearchParams({
                        user: user,
                        bidTick: bidTick.toString(),
                        askTick: askTick.toString(),
                        isBid: isBid ? 'true' : 'false',
                        base: baseTokenAddress,
                        quote: quoteTokenAddress,
                        poolIdx: poolIndex.toString(),
                        chainId: chainId,
                        pivotTime: pivotTime.toString(),
                        positionType: positionType,
                    }),
            )
                .then((response) => response?.json())
                .then((json) => {
                    const positionPayload = json?.data as LimitOrderServerIF;
                    return getLimitOrderData(
                        positionPayload,
                        tokens.tokenUniv,
                        crocEnv,
                        provider,
                        chainId,
                        cachedFetchTokenPrice,
                        cachedQuerySpotPrice,
                        cachedTokenDetails,
                        cachedEnsResolve,
                    );
                })
                .then((positionStats: LimitOrderIF) => {
                    IS_LOCAL_ENV && console.debug({ positionStats });
                    const liqBaseNum =
                        positionStats.positionLiqBaseDecimalCorrected;
                    const liqQuoteNum =
                        positionStats.positionLiqQuoteDecimalCorrected;
                    const claimableBaseNum =
                        positionStats.claimableLiqBaseDecimalCorrected;
                    const claimableQuoteNum =
                        positionStats.claimableLiqQuoteDecimalCorrected;

                    const isOrderClaimable = positionStats.claimableLiq !== 0;
                    setIsClaimable(isOrderClaimable);

                    const liqBaseDisplay = getFormattedNumber({
                        value: liqBaseNum,
                        removeExtraTrailingZeros: true,
                    });

                    const claimableBaseDisplay = getFormattedNumber({
                        value: claimableBaseNum,
                        removeExtraTrailingZeros: true,
                    });

                    isOrderFilled
                        ? setBaseCollateralDisplay(
                              claimableBaseDisplay ?? '0.00',
                          )
                        : setBaseCollateralDisplay(liqBaseDisplay ?? '0.00');

                    const liqQuoteDisplay = getFormattedNumber({
                        value: liqQuoteNum,
                        removeExtraTrailingZeros: true,
                    });

                    const claimableQuoteDisplay = getFormattedNumber({
                        value: claimableQuoteNum,
                        removeExtraTrailingZeros: true,
                    });

                    isOrderFilled
                        ? setQuoteCollateralDisplay(
                              claimableQuoteDisplay ?? '0.00',
                          )
                        : setQuoteCollateralDisplay(liqQuoteDisplay ?? '0.00');

                    setUsdValue(
                        getFormattedNumber({
                            value: positionStats.totalValueUSD,
                            prefix: '$',
                        }),
                    );
                })
                .catch(console.error);
        }
    }, [
        Math.floor(Date.now() / CACHE_UPDATE_FREQ_IN_MS),
        !!crocEnv,
        !!provider,
    ]);

    const detailsRef = useRef(null);

    const copyOrderDetailsToClipboard = async () => {
        if (detailsRef.current) {
            const blob = await printDomToImage(detailsRef.current, '#0d1117', {
                background: `url(${modalBackground}) no-repeat`,
                backgroundSize: 'cover',
            });
            if (blob) {
                copy(blob);
                openSnackbar('Shareable image copied to clipboard', 'info');
            }
        }
    };

    const controlItems = [
        { slug: 'ticks', name: 'Show ticks', checked: true },
        { slug: 'liquidity', name: 'Show Liquidity', checked: true },
        { slug: 'value', name: 'Show value', checked: true },
    ];

    const [timeFirstMintMemo, setTimeFirstMintMemo] = useState<number>(
        limitOrder.timeFirstMint,
    );

    useEffect(() => {
        if (limitOrder.timeFirstMint) {
            setTimeFirstMintMemo(limitOrder.timeFirstMint);
        }
    }, [limitOrder.timeFirstMint]);

    const DetailsProps = {
        limitOrder: limitOrder,
        timeFirstMintMemo: timeFirstMintMemo,
        usdValue: usdValue,
        isBid: isBid,
        isDenomBase: isDenomBase,
        baseCollateralDisplay: baseCollateralDisplay,
        quoteCollateralDisplay: quoteCollateralDisplay,
        isOrderFilled: isClaimable,
        baseDisplay: baseDisplay,
        quoteDisplay: quoteDisplay,
        quoteTokenLogo: quoteTokenLogo,
        baseTokenLogo: baseTokenLogo,
        baseTokenSymbol: baseTokenSymbol,
        quoteTokenSymbol: quoteTokenSymbol,
        baseTokenName: baseTokenName,
        quoteTokenName: quoteTokenName,
        isFillStarted: isFillStarted,
        truncatedDisplayPrice: truncatedDisplayPrice,
        isAccountView: isAccountView,
        originalPositionLiqBase: originalPositionLiqBase,
        originalPositionLiqQuote: originalPositionLiqQuote,
        expectedPositionLiqBase: expectedPositionLiqBase,
        expectedPositionLiqQuote: expectedPositionLiqQuote,
    };

    const PriceInfoProps = {
        limitOrder: limitOrder,
        controlItems: controlItems,
        usdValue: usdValue,
        isBid: isBid,
        isDenomBase: isDenomBase,
        baseCollateralDisplay: baseCollateralDisplay,
        quoteCollateralDisplay: quoteCollateralDisplay,
        isOrderFilled: isClaimable,
        baseDisplay: baseDisplay,
        quoteDisplay: quoteDisplay,
        quoteTokenLogo: quoteTokenLogo,
        baseTokenLogo: baseTokenLogo,
        baseTokenSymbol: baseTokenSymbol,
        quoteTokenSymbol: quoteTokenSymbol,
        baseTokenName: baseTokenName,
        quoteTokenName: quoteTokenName,
        isFillStarted: isFillStarted,
        truncatedDisplayPrice: truncatedDisplayPrice,
        truncatedDisplayPriceDenomByMoneyness:
            truncatedDisplayPriceDenomByMoneyness,
        baseTokenAddress: baseTokenAddress,
        quoteTokenAddress: quoteTokenAddress,
        fillPercentage: fillPercentage,
        isAccountView: isAccountView,
        isBaseTokenMoneynessGreaterOrEqual: isBaseTokenMoneynessGreaterOrEqual,
        originalPositionLiqBase: originalPositionLiqBase,
        originalPositionLiqQuote: originalPositionLiqQuote,
        expectedPositionLiqBase: expectedPositionLiqBase,
        expectedPositionLiqQuote: expectedPositionLiqQuote,
    };

    const GraphProps = {
        tx: limitOrder,
        timeFirstMintMemo: timeFirstMintMemo,
        transactionType: 'limitOrder',
        isBaseTokenMoneynessGreaterOrEqual: isBaseTokenMoneynessGreaterOrEqual,
        isAccountView: isAccountView,
        middlePriceDisplay: middlePriceDisplay,
        middlePriceDisplayDenomByMoneyness: middlePriceDisplayDenomByMoneyness,
    };

    const shareComponent = (
        <div ref={detailsRef} className={styles.main_outer_container}>
            <div className={styles.main_content}>
                <div className={styles.left_container}>
                    <PriceInfo {...PriceInfoProps} />
                </div>
                <div className={styles.right_container}>
                    <TransactionDetailsGraph {...GraphProps} />
                </div>
            </div>
        </div>
    );

    const shareComponentMobile = (
        <Modal usingCustomHeader onClose={onClose}>
            <div className={styles.transaction_details_mobile}>
                <ModalHeader title={'Order Details'} onClose={onClose} />
                <MobileDetailTabs
                    showShareComponent={showShareComponent}
                    setShowShareComponent={setShowShareComponent}
                />
                {!showShareComponent ? (
                    <OrderDetailsSimplify {...DetailsProps} />
                ) : (
                    <div className={styles.mobile_price_graph_container}>
                        <PriceInfo {...PriceInfoProps} />
                        <div className={styles.graph_section_mobile}>
                            <TransactionDetailsGraph {...GraphProps} />
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
    if (showMobileVersion) return shareComponentMobile;

    return (
        <Modal usingCustomHeader onClose={onClose}>
            <div className={styles.outer_container}>
                <DetailsHeader
                    onClose={onClose}
                    handleCopyAction={handleCopyPositionId}
                    copyToClipboard={copyOrderDetailsToClipboard}
                    showShareComponent={showShareComponent}
                    setShowShareComponent={setShowShareComponent}
                    tooltipCopyAction='Copy position slot ID to clipboard'
                    tooltipCopyImage='Copy shareable image'
                />

                {showShareComponent ? (
                    shareComponent
                ) : (
                    <OrderDetailsSimplify {...DetailsProps} />
                )}
            </div>
        </Modal>
    );
}
