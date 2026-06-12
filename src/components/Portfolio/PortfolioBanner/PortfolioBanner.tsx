import JazziconImport, {
    jsNumberForAddress as jsNumberForAddressImport,
} from 'react-jazzicon';
import { unwrapCjsDefault } from '../../../utils/cjsDefaultInterop';

import PortfolioBannerAccount from './PortfolioBannerAccount/PortfolioBannerAccount';

// CJS default-export interop (see utils/cjsDefaultInterop.ts).
const Jazzicon = unwrapCjsDefault<typeof JazziconImport>(JazziconImport);
const jsNumberForAddress: (address: string) => number =
    typeof jsNumberForAddressImport === 'function'
        ? jsNumberForAddressImport
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (JazziconImport as any)?.jsNumberForAddress;

import { trimString } from '../../../ambient-utils/dataLayer';

import { Dispatch, SetStateAction, useContext, useMemo, useState } from 'react';
import { AiOutlineDollarCircle } from 'react-icons/ai';
import { ChainDataContext } from '../../../contexts/ChainDataContext';
import { PoolContext } from '../../../contexts/PoolContext';
import {
    NftFetchSettingsIF,
    NftListByChain,
} from '../../../contexts/TokenBalanceContext';
import { UserXpDataIF } from '../../../contexts/UserDataContext';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import UserLevelDisplay from '../../Global/LevelsCard/UserLevelDisplay';
import { DefaultTooltip } from '../../Global/StyledTooltip/StyledTooltip';
import AddressPrint from './AddressPrint';
import styles from './PortfolioBanner.module.css';

interface propsIF {
    ensName: string;
    resolvedAddress: string;
    connectedAccountActive: boolean;
    resolvedUserXp: UserXpDataIF;
    showTabsAndNotExchange: boolean;
    setShowTabsAndNotExchange: Dispatch<SetStateAction<boolean>>;

    nftTestWalletInput: string;
    setNftTestWalletInput: Dispatch<SetStateAction<string>>;

    showNFTPage: boolean;
    setShowNFTPage: Dispatch<SetStateAction<boolean>>;
    // eslint-disable-next-line
    handleTestWalletChange: any;

    NFTData: NftListByChain[] | undefined;
    NFTFetchSettings: NftFetchSettingsIF;
    setNFTFetchSettings: Dispatch<SetStateAction<NftFetchSettingsIF>>;
    userAddress: string | undefined;
}

export default function PortfolioBanner(props: propsIF) {
    const {
        ensName,
        resolvedAddress,
        connectedAccountActive,
        resolvedUserXp,
        showTabsAndNotExchange,
        setShowTabsAndNotExchange,

        showNFTPage,
        setShowNFTPage,
        handleTestWalletChange,
        userAddress,
    } = props;
    const { connectedUserXp } = useContext(ChainDataContext);

    const desktopScreen = useMediaQuery('(min-width: 768px)');

    const { isTradeDollarizationEnabled, setIsTradeDollarizationEnabled } =
        useContext(PoolContext);

    const xpData =
        connectedAccountActive || location.pathname === '/account/xp'
            ? connectedUserXp
            : resolvedUserXp;

    const ensNameAvailable = ensName !== '';

    const addressOfAccountDisplayed = resolvedAddress
        ? resolvedAddress.toLowerCase()
        : (userAddress?.toLowerCase() ?? '');

    const myJazzicon = (
        <Jazzicon
            diameter={50}
            seed={jsNumberForAddress(addressOfAccountDisplayed)}
        />
    );

    const truncatedAccountAddress = connectedAccountActive
        ? trimString(userAddress ?? '', 6, 6, '…')
        : trimString(resolvedAddress, 6, 6, '…');

    const jazziconsToDisplay =
        (resolvedAddress || connectedAccountActive) && myJazzicon
            ? myJazzicon
            : null;

    const userLink = ensName ?? userAddress;

    // determine size of banner to properly make width of background
    // DOM id for parent element (needed to know SVG dimensions)
    const BANNER_ID = 'portfolio_banner_elem';
    // JSX DOM element to show noisy lines as an SVG, runs when the DOM
    // ... gets a new address for programmatic generation
    const noisyLines = useMemo<React.ReactNode | null>(() => {
        // early return if address is not available (first render)
        if (!addressOfAccountDisplayed) return null;
        // locate rendered parent element in DOM by element ID
        // const parentElem: HTMLElement | null =
        //     document.getElementById(BANNER_ID);
        // dimensions of parent element with backups
        // const width: number = parentElem ? parentElem.offsetWidth : 1825;
        // const height: number = parentElem ? parentElem.offsetHeight : 200;
        // render SVG image for DOM using derived dimensions
        return <AddressPrint address={addressOfAccountDisplayed} />;
    }, [addressOfAccountDisplayed, document.getElementById(BANNER_ID)]);

    const [nftTestWalletInput, setNftTestWalletInput] = useState<string>('');

    // early return is needed if the user is logged out
    if (!addressOfAccountDisplayed) return null;

    return (
        <div
            className={styles.portfolio_banner_rectangle_container}
            id={BANNER_ID}
        >
            {noisyLines}
            <div className={styles.portfolio_banner_rectangle_content}>
                <PortfolioBannerAccount
                    ensName={ensName}
                    ensNameAvailable={ensNameAvailable}
                    resolvedAddress={resolvedAddress}
                    truncatedAccountAddress={truncatedAccountAddress}
                    jazziconsToDisplay={jazziconsToDisplay}
                    connectedAccountActive={connectedAccountActive}
                    showTabsAndNotExchange={showTabsAndNotExchange}
                    setShowTabsAndNotExchange={setShowTabsAndNotExchange}
                    nftTestWalletInput={nftTestWalletInput}
                    setNftTestWalletInput={setNftTestWalletInput}
                    showNFTPage={showNFTPage}
                    setShowNFTPage={setShowNFTPage}
                    handleTestWalletChange={handleTestWalletChange}
                />
                {desktopScreen && (
                    <DefaultTooltip
                        title={'Toggle USD Price Estimates'}
                        enterDelay={500}
                    >
                        <button
                            className={styles.header_button}
                            onClick={() =>
                                setIsTradeDollarizationEnabled((prev) => !prev)
                            }
                            style={{ zIndex: '2' }}
                        >
                            <AiOutlineDollarCircle
                                size={20}
                                id='trade_dollarized_prices_button'
                                aria-label='Toggle dollarized prices button'
                                style={{
                                    color: isTradeDollarizationEnabled
                                        ? 'var(--accent1)'
                                        : undefined,
                                }}
                            />
                        </button>
                    </DefaultTooltip>
                )}
            </div>

            <div className={styles.portfolio_banner_level_container}>
                <UserLevelDisplay
                    currentLevel={xpData?.data?.currentLevel}
                    globalPoints={xpData?.data?.globalPoints}
                    user={userLink}
                />
            </div>
        </div>
    );
}
