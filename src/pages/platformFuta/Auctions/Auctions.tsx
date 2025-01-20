import { useContext, useEffect } from 'react';
import FutaDivider2 from '../../../components/Futa/Divider/FutaDivider2';
import SearchableTicker from '../../../components/Futa/SearchableTicker/SearchableTicker';
import TickerComponent from '../../../components/Futa/TickerComponent/TickerComponent';
import { AppStateContext } from '../../../contexts';
import { AuctionsContext } from '../../../contexts/AuctionsContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import { useMediaQuery } from '../../../utils/hooks/useMediaQuery';
import HexReveal from '../Home/Animations/HexReveal';
import styles from './Auctions.module.css';
import { sortedAuctionsIF, useSortedAuctions } from './useSortedAuctions';

interface propsIF {
    hideTicker?: boolean;
    placeholderTicker?: boolean;
}

export default function Auctions(props: propsIF) {
    const { hideTicker, placeholderTicker } = props;
    // placeholder data until the platform has live data

    const {
        globalAuctionList,
        updateGlobalAuctionsList,
        updateUserAuctionsList,
    } = useContext(AuctionsContext);
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);
    const { userAddress } = useContext(UserDataContext);

    const sorted: sortedAuctionsIF = useSortedAuctions(
        globalAuctionList.data || [],
    );

    const desktopScreen: boolean = useMediaQuery('(min-width: 968px)');

    const cacheFrequency = Math.floor(Date.now() / 30000);

    useEffect(() => {
        updateGlobalAuctionsList();
        if (userAddress) {
            updateUserAuctionsList(userAddress);
        } else {
            updateUserAuctionsList('');
        }
    }, [userAddress, chainId, cacheFrequency]);

    if (desktopScreen)
        return (
            <div className={styles.desktopContainer}>
                <div
                    className={styles.auctionsTickerContainer}
                    style={{
                        gridTemplateColumns: hideTicker ? '1fr' : '1fr 390px',
                    }}
                >
                    <div id='auctions_search_wrapper'>
                        <SearchableTicker
                            auctions={sorted}
                            placeholderTicker={placeholderTicker}
                        />
                    </div>
                    <div className={styles.flexColumn}>
                        <HexReveal>
                            <p className={styles.label}>TICKER</p>
                        </HexReveal>
                        <FutaDivider2 />
                        {!hideTicker && (
                            <TickerComponent
                                isAuctionPage
                                placeholderTicker={placeholderTicker}
                            />
                        )}
                    </div>
                </div>
            </div>
        );

    return (
        <div className={styles.mobileContainer}>
            <h3>AUCTIONS</h3>

            <span id='auctions_search_wrapper'>
                <SearchableTicker
                    auctions={sorted}
                    placeholderTicker={placeholderTicker}
                />
            </span>
        </div>
    );
}
