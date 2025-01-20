import { CrocEnv } from '@crocswap-libs/sdk';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    CURRENT_AUCTION_VERSION,
    GAS_DROPS_ESTIMATE_AUCTION_CREATE,
    NUM_GWEI_IN_WEI,
} from '../../../ambient-utils/constants';
import {
    AuctionTxResponseIF,
    checkTickerPattern,
    checkTickerValidity,
    createAuction,
    getFormattedNumber,
} from '../../../ambient-utils/dataLayer';
import useDebounce from '../../../App/hooks/useDebounce';
import { getActionTrigger } from '../../../components/Chat/ChatRenderUtils';
import BreadCrumb from '../../../components/Futa/Breadcrumb/Breadcrumb';
import TooltipLabel from '../../../components/Futa/TooltipLabel/TooltipLabel';
import { AppStateContext } from '../../../contexts/AppStateContext';
import { AuctionsContext } from '../../../contexts/AuctionsContext';
import { ChainDataContext } from '../../../contexts/ChainDataContext';
import { CrocEnvContext } from '../../../contexts/CrocEnvContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import { useMediaQuery } from '../../../utils/hooks/useMediaQuery';
import styles from './Create.module.css';
import CreateInput from './CreateInput';

export default function Create() {
    const desktopScreen = useMediaQuery('(min-width: 1080px)');
    const navigate = useNavigate();

    const { isUserConnected } = useContext(UserDataContext);
    const { crocEnv, ethMainnetUsdPrice } = useContext(CrocEnvContext);
    const { gasPriceInGwei, lastBlockNumber } = useContext(ChainDataContext);
    const {
        walletModal: { open: openWalletModal },
    } = useContext(AppStateContext);

    const { tickerInput, setTickerInput } = useContext(AuctionsContext);

    const [isValidationInProgress, setIsValidationInProgress] =
        useState<boolean>(false);

    const [isValidated, setIsValidated] = useState<boolean>(false);
    const [tickerCreationResponse, setTickerCreationResponse] = useState<
        AuctionTxResponseIF | undefined
    >();
    const [isTxPending, setIsTxPending] = useState<boolean>(false);
    const [invalidReason, setInvalidReason] = useState<string | undefined>();

    function handleChange(text: string) {
        const sanitized = text.trim();
        if (checkTickerPattern(sanitized)) {
            setIsValidationInProgress(true);
            setTickerInput(sanitized.toUpperCase());
        }
    }

    const debouncedTickerInput = useDebounce(tickerInput, 500);

    useEffect(() => {
        if (!lastBlockNumber || !crocEnv || !debouncedTickerInput) return;
        checkTickerValidity(
            crocEnv,
            debouncedTickerInput,
            lastBlockNumber,
        ).then((response) => {
            setIsValidationInProgress(false);
            setIsValidated(response.isValid);
            setInvalidReason(response.invalidReason);
        });
    }, [debouncedTickerInput, crocEnv === undefined, lastBlockNumber]);

    useEffect(() => {
        setTickerCreationResponse(undefined);
        setIsTxPending(false);
    }, [tickerInput]);

    const liquidity = '0.25 ETH';

    const [auctionCreateGasPriceinDollars, setAuctionCreateGasPriceinDollars] =
        useState<string | undefined>();

    // calculate price of gas for exchange balance deposit
    useEffect(() => {
        if (gasPriceInGwei && ethMainnetUsdPrice) {
            const gasPriceInDollarsNum =
                gasPriceInGwei *
                NUM_GWEI_IN_WEI *
                ethMainnetUsdPrice *
                GAS_DROPS_ESTIMATE_AUCTION_CREATE;

            setAuctionCreateGasPriceinDollars(
                getFormattedNumber({
                    value: gasPriceInDollarsNum,
                    isUSD: true,
                }),
            );
        }
    }, [gasPriceInGwei, ethMainnetUsdPrice]);

    const extraInfoData = [
        {
            id: 'auctions_create_liquidity',
            title: 'LIQUIDITY',
            tooltipTitle: 'liquidity',
            data: liquidity,
        },
        {
            id: 'auctions_create_network_fee',
            title: 'NETWORK FEE',
            tooltipTitle: 'NETWORK FEE PAID IN ORDER TO TRANSACT',
            data: auctionCreateGasPriceinDollars
                ? auctionCreateGasPriceinDollars
                : '...',
        },
    ];

    const createHeader = (
        <div className={styles.create_token_top}>
            {!desktopScreen && <BreadCrumb />}
            <h3>CREATE</h3>
            <p className={styles.description}>
                Some text here describing how launching a token works and what
                things will happen.
            </p>
        </div>
    );

    const extraInfoDisplay = (
        <div className={styles.extraInfoContainer}>
            {extraInfoData.map((item, idx) => (
                <div id={item.id} className={styles.justifyRow} key={idx}>
                    <TooltipLabel
                        itemTitle={item.title}
                        tooltipTitle={item.tooltipTitle}
                    />
                    <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
                        {item.data}
                    </p>
                </div>
            ))}
        </div>
    );

    const sendCreationTransaction = async (
        crocEnv: CrocEnv | undefined,
        tickerInput: string,
    ) => {
        setIsTxPending(true);

        setTickerCreationResponse(await createAuction(crocEnv, tickerInput));
    };

    const tickerCreationFailed =
        tickerCreationResponse?.isSuccess !== undefined
            ? tickerCreationResponse.isSuccess === false
            : false;

    const tickerCreationSucceeded =
        tickerCreationResponse?.isSuccess !== undefined
            ? tickerCreationResponse.isSuccess === true
            : false;

    const displayPendingTxMessage =
        isTxPending && tickerCreationResponse === undefined;

    const isButtonDisabled =
        displayPendingTxMessage ||
        tickerCreationResponse?.isSuccess === false ||
        (isUserConnected && (isValidationInProgress || !isValidated));

    const footerDisplay = (
        <footer className={styles.footerContainer}>
            {extraInfoDisplay}
            <button
                id={
                    !isUserConnected
                        ? 'auctions_create_connect_button'
                        : 'auctions_create_button'
                }
                className={
                    !isButtonDisabled
                        ? styles.create_button
                        : styles.create_button_disabled
                }
                onClick={() =>
                    !isUserConnected
                        ? openWalletModal()
                        : tickerCreationSucceeded
                          ? navigate(
                                `/auctions/v${CURRENT_AUCTION_VERSION}/${tickerInput}`,
                            )
                          : sendCreationTransaction(crocEnv, tickerInput)
                }
                disabled={isButtonDisabled}
            >
                {!isUserConnected
                    ? 'Connect Wallet'
                    : displayPendingTxMessage
                      ? 'Creation Pending...'
                      : tickerCreationFailed
                        ? 'Creation Failed'
                        : tickerCreationSucceeded
                          ? 'Go To Auction'
                          : tickerInput === ''
                            ? 'Enter a Token Ticker'
                            : isValidationInProgress
                              ? 'Validating Ticker...'
                              : isValidated
                                ? 'Create Auction'
                                : `${invalidReason}: ${tickerInput}`}
            </button>
        </footer>
    );

    return (
        <section className={styles.mainContainer}>
            <div className={styles.create_token}>
                {createHeader}

                <CreateInput
                    tickerInput={tickerInput}
                    handleChange={handleChange}
                />
                {footerDisplay}
            </div>

            {getActionTrigger('create_auction_input_trigger', () => {
                setTickerInput('MY TOKEN');
            })}
            {getActionTrigger('create_auction_reset', () => {
                setTickerInput('');
            })}
        </section>
    );
}
