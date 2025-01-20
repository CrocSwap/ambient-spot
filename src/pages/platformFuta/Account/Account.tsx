import BreadCrumb from '../../../components/Futa/Breadcrumb/Breadcrumb';
import styles from './Account.module.css';

import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import {
    AuctionDataIF,
    AuctionTxResponseIF,
    claimAndReturnAll,
} from '../../../ambient-utils/dataLayer';
import SearchableTicker from '../../../components/Futa/SearchableTicker/SearchableTicker';
import TooltipLabel from '../../../components/Futa/TooltipLabel/TooltipLabel';
import Typewriter from '../../../components/Futa/TypeWriter/TypeWriter';
import { AppStateContext } from '../../../contexts/AppStateContext';
import { AuctionsContext } from '../../../contexts/AuctionsContext';
import { CrocEnvContext } from '../../../contexts/CrocEnvContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import { useMediaQuery } from '../../../utils/hooks/useMediaQuery';
import {
    sortedAuctionsIF,
    useSortedAuctions,
} from '../Auctions/useSortedAuctions';
import FutaDivider2 from '../../../components/Futa/Divider/FutaDivider2';
import HexReveal from '../Home/Animations/HexReveal';

export type auctionDataSets = 'bids' | 'created';

export default function Account() {
    const { accountData } = useContext(AuctionsContext);
    const { isUserConnected, userAddress } = useContext(UserDataContext);
    const { updateUserAuctionsList } = useContext(AuctionsContext);
    const {
        walletModal: { open: openWalletModal },
        activeNetwork: { chainId },
    } = useContext(AppStateContext);

    const { crocEnv } = useContext(CrocEnvContext);

    const { address: addressFromParams } = useParams();

    const isAddressEns = addressFromParams?.endsWith('.eth');
    const isAddressHex =
        addressFromParams?.startsWith('0x') && addressFromParams?.length == 42;

    const { mainnetProvider } = useContext(CrocEnvContext);

    const [resolvedAddress, setResolvedAddress] = useState<string | undefined>(
        undefined,
    );

    const [tickerSet, setTickerSet] = useState<auctionDataSets>('bids');
    function toggleData(set?: auctionDataSets): void {
        if (set) {
            setTickerSet(set);
        } else if (tickerSet === 'bids') {
            setTickerSet('created');
        } else if (tickerSet === 'created') {
            setTickerSet('bids');
        }
    }

    if (addressFromParams && !isAddressEns && !isAddressHex) {
        return <Navigate to='/404' replace />;
    }

    const sumUnclaimedAndUnreturned = useMemo(() => {
        if (!accountData.auctions) return BigInt(0);
        let sum = BigInt(0);

        accountData.auctions.forEach((auction: AuctionDataIF) => {
            if (auction.qtyUnclaimedByUserInAuctionedTokenWei) {
                sum += BigInt(auction.qtyUnclaimedByUserInAuctionedTokenWei);
            }
            if (auction.qtyUnreturnedToUserInNativeTokenWei) {
                sum += BigInt(auction.qtyUnreturnedToUserInNativeTokenWei);
            }
        });

        return sum;
    }, [accountData.auctions]);

    const isUnclaimedAndUnreturnedZero =
        sumUnclaimedAndUnreturned === BigInt(0);

    useEffect(() => {
        (async () => {
            if (addressFromParams && isAddressEns && mainnetProvider) {
                try {
                    const newResolvedAddress =
                        await mainnetProvider.resolveName(addressFromParams);
                    setResolvedAddress(newResolvedAddress ?? '');
                } catch (error) {
                    console.error({ error });
                }
            } else if (addressFromParams && isAddressHex && !isAddressEns) {
                setResolvedAddress(addressFromParams);
            } else {
                setResolvedAddress('');
            }
        })();
    }, [addressFromParams, isAddressHex, isAddressEns, mainnetProvider]);

    const cacheFrequency = Math.floor(Date.now() / 30000);

    useEffect(() => {
        if (resolvedAddress) {
            updateUserAuctionsList(resolvedAddress);
        } else if (userAddress) {
            updateUserAuctionsList(userAddress);
        }
    }, [resolvedAddress, userAddress, chainId, cacheFrequency]);

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

    const [isTxPending, setIsTxPending] = useState(false);
    const [txCreationResponse, setTxCreationResponse] = useState<
        AuctionTxResponseIF | undefined
    >();

    const txFailed =
        txCreationResponse?.isSuccess !== undefined
            ? txCreationResponse.isSuccess === false
            : false;

    const txSucceeded =
        txCreationResponse?.isSuccess !== undefined
            ? txCreationResponse.isSuccess === true
            : false;

    const sendClaimAndReturnAllTransaction = async () => {
        if (isUnclaimedAndUnreturnedZero) return;

        setIsTxPending(true);

        setTxCreationResponse(await claimAndReturnAll(crocEnv));
    };

    useEffect(() => {
        setIsTxPending(false);
        setTxCreationResponse(undefined);
    }, [sumUnclaimedAndUnreturned]);

    const failMessage =
        txCreationResponse?.failureReason !== undefined
            ? txCreationResponse?.failureReason
            : 'Transaction Failed';

    const isButtonDisabled =
        isUnclaimedAndUnreturnedZero || isTxPending || txFailed || txSucceeded;

    const buttonText = txFailed
        ? failMessage
        : txSucceeded
          ? 'Claim All Succeeded!'
          : isTxPending
            ? 'Transaction Pending...'
            : 'Claim All';

    const claimAllContainer = (
        <div className={styles.claimAllContainer}>
            <h3>CLAIM ALL</h3>
            <p className={styles.claimAllText}>
                CLAIM ALL TOKENS FROM WINNING AUCTIONS AND UNUSED BIDS
            </p>
            <div className={styles.extraFeeContainer}>
                <div className={styles.justifyRow}>
                    <TooltipLabel
                        itemTitle='NETWORK FEE'
                        tooltipTitle='NETWORK FEE PAID IN ORDER TO TRANSACT'
                    />
                    <p style={{ color: 'var(--text2)', fontSize: '14px' }}>
                        ~0.01
                    </p>
                </div>
            </div>
            <button
                id='futa_account_claim_all_button'
                className={
                    isButtonDisabled
                        ? `${styles.claimButton} ${styles.disabledButton}`
                        : `${styles.claimButton}`
                }
                onClick={sendClaimAndReturnAllTransaction}
            >
                {buttonText.toUpperCase()}
            </button>
        </div>
    );

    const connectWalletContent = (
        <div className={styles.connectWalletContent}>
            <Typewriter text='Connect your wallet to view your auctions' />
            <button onClick={openWalletModal}>Connect wallet</button>
        </div>
    );

    const noAuctionsContent = (
        <div className={styles.connectWalletContent}>
            <Typewriter text='No auctions found' />
            <p>Consider viewing all auctions</p>
            <Link to='/auctions'>All auctions</Link>
        </div>
    );
    const sorted: sortedAuctionsIF = useSortedAuctions(
        accountData.auctions || [],
    );

    // !important:  the table will display "No tickers available" if `sorted` is
    // !important:  ... removed from the dependency array of this hook which I
    // !important:  ... sometimes do to simulate state, please re-insert if it is
    // !important:  ... ever inadvertently left out
    // logic to filter bids created by authenticated wallet when relevant
    const filtered = useMemo<sortedAuctionsIF>(() => {
        // copy sorted data to an output variable
        const output = { ...sorted };
        // apply filter if user sets state to created auctions only
        if (tickerSet === 'created') {
            output.data = sorted.data.filter(
                (tck: AuctionDataIF) =>
                    tck.createdBy &&
                    tck.createdBy.toLowerCase() === userAddress?.toLowerCase(),
            );
        }
        // return data after processing (processing is actually optional)
        return output;
    }, [tickerSet, sorted]);

    const desktopScreen = useMediaQuery('(min-width: 1080px)');

    if (!isUserConnected && !addressFromParams) {
        return connectWalletContent;
    }

    if (!sorted?.data?.length) {
        return noAuctionsContent;
    }

    const desktopVersionWithClaimAll = (
        <div className={styles.desktopContainer}>
            <div className={styles.content}>
                <SearchableTicker
                    auctions={filtered}
                    dataState={{
                        active: tickerSet,
                        toggle: toggleData,
                    }}
                    isAccount
                />
            </div>

            <div className={styles.rightLayout}>
                <HexReveal>
                    <p className={styles.label}>CLAIM</p>
                    <FutaDivider2 />
                </HexReveal>
                {claimAllContainer}
            </div>
        </div>
    );

    const desktopVersionWithoutClaimAll = (
        <div className={styles.container}>
            <div className={styles.content}>
                <SearchableTicker
                    auctions={filtered}
                    dataState={{
                        active: tickerSet,
                        toggle: toggleData,
                    }}
                    isAccount
                />
            </div>
        </div>
    );

    const mobileVersionWithClaimAll = (
        <div className={styles.container}>
            <div className={styles.content}>
                <BreadCrumb />
                <SearchableTicker
                    auctions={filtered}
                    dataState={{
                        active: tickerSet,
                        toggle: toggleData,
                    }}
                    isAccount
                />
            </div>
            {claimAllContainer}
        </div>
    );

    const mobileVersionWithoutClaimAll = (
        <div className={styles.container}>
            <div className={styles.content}>
                <BreadCrumb />
                <h2>Account</h2>
                <SearchableTicker
                    auctions={filtered}
                    dataState={{
                        active: tickerSet,
                        toggle: toggleData,
                    }}
                    isAccount
                />
            </div>
        </div>
    );

    return desktopScreen
        ? connectedAccountActive
            ? desktopVersionWithClaimAll
            : desktopVersionWithoutClaimAll
        : connectedAccountActive
          ? mobileVersionWithClaimAll
          : mobileVersionWithoutClaimAll;
}
