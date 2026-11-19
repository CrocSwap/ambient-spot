import moment from 'moment';
import { memo, useContext } from 'react';
import { FiCopy } from 'react-icons/fi';
import { RiExternalLinkLine } from 'react-icons/ri';
import { ZERO_ADDRESS } from '../../../../../ambient-utils/constants';
import { PositionIF } from '../../../../../ambient-utils/types';
import { AppStateContext } from '../../../../../contexts/AppStateContext';
import { UserDataContext } from '../../../../../contexts/UserDataContext';
import useCopyToClipboard from '../../../../../utils/hooks/useCopyToClipboard';
import useMediaQuery from '../../../../../utils/hooks/useMediaQuery';
import { useProcessRange } from '../../../../../utils/hooks/useProcessRange';
import InfoRow from '../../../InfoRow';
import styles from './RangeDetailsSimplify.module.css';

interface propsIF {
    position: PositionIF;
    timeFirstMintMemo: number;
    baseFeesDisplay: string | undefined;
    quoteFeesDisplay: string | undefined;
    isAccountView: boolean;
    updatedPositionApy: number | undefined;
}

function RangeDetailsSimplify(props: propsIF) {
    const showMobileVersion = useMediaQuery('(max-width: 768px)');

    const {
        position,
        baseFeesDisplay,
        quoteFeesDisplay,
        isAccountView,
        updatedPositionApy,
        timeFirstMintMemo,
    } = props;
    const {
        activeNetwork: {
            chainSpec: { addrs },
        },
    } = useContext(AppStateContext);
    const { userAddress } = useContext(UserDataContext);

    const {
        ensName,
        isDenomBase,
        isBaseTokenMoneynessGreaterOrEqual,
        minRangeDenomByMoneyness,
        maxRangeDenomByMoneyness,
        userNameToDisplay,
        posHashTruncated,
        posHash,
        isOwnerActiveAccount,
        ownerId,
        usdValue,
        baseTokenSymbol,
        quoteTokenSymbol,
        baseTokenName,
        quoteTokenName,
        baseTokenAddressTruncated,
        quoteTokenAddressTruncated,
        isPositionInRange,
        isAmbient,
        ambientOrMax,
        ambientOrMin,
        width,
        blockExplorer,
        tokenAAddressLowerCase,
        tokenBAddressLowerCase,
        baseDisplay,
        quoteDisplay,
        elapsedTimeString,
        elapsedTimeSinceFirstMintString,
    } = useProcessRange(position, userAddress, isAccountView);

    const showFullAddresses = useMediaQuery('(min-width: 768px)');

    const {
        snackbar: { open: openSnackbar },
    } = useContext(AppStateContext);

    const [_, copy] = useCopyToClipboard();

    function handleOpenWallet(): void {
        const walletUrl = isOwnerActiveAccount ? '/account' : `/${ownerId}`;
        window.open(walletUrl);
    }

    const aprAmountString = updatedPositionApy
        ? updatedPositionApy >= 1000
            ? updatedPositionApy.toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
              }) + '%+'
            : updatedPositionApy.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              }) + '%'
        : undefined;

    function handleCopyPositionHash() {
        copy(posHash.toString());
        openSnackbar(`${posHash.toString()} copied`, 'info');
    }

    function handleOpenBaseAddress() {
        if (tokenAAddressLowerCase && blockExplorer) {
            const blockExplorerUrl =
                tokenAAddressLowerCase === ZERO_ADDRESS
                    ? `${blockExplorer}address/${addrs.dex}`
                    : `${blockExplorer}token/${tokenAAddressLowerCase}`;
            window.open(blockExplorerUrl);
        }
    }
    function handleOpenQuoteAddress() {
        if (tokenBAddressLowerCase && blockExplorer) {
            const blockExplorerUrl = `${blockExplorer}token/${tokenBAddressLowerCase}`;
            window.open(blockExplorerUrl);
        }
    }

    const posHashContent = (
        <div className={styles.link_row} onClick={handleCopyPositionHash}>
            <p>{posHashTruncated}</p>
            <FiCopy style={{ cursor: 'pointer' }} />
        </div>
    );

    const walletContent = (
        <div
            className={styles.link_row}
            onClick={handleOpenWallet}
            style={{ cursor: 'pointer' }}
        >
            <p style={!ensName ? { fontFamily: 'monospace' } : undefined}>
                {showFullAddresses
                    ? ensName
                        ? ensName
                        : userNameToDisplay
                    : userNameToDisplay}
            </p>
            <RiExternalLinkLine />
        </div>
    );

    const baseAddressContent = (
        <div
            onClick={handleOpenBaseAddress}
            className={styles.link_row}
            style={{ cursor: 'pointer' }}
        >
            <p>{baseTokenAddressTruncated}</p>
            <RiExternalLinkLine />
        </div>
    );
    const quoteAddressContent = (
        <div
            onClick={handleOpenQuoteAddress}
            className={styles.link_row}
            style={{ cursor: 'pointer' }}
        >
            <p>{quoteTokenAddressTruncated}</p>
            <RiExternalLinkLine />
        </div>
    );

    const status = isAmbient
        ? 'Ambient'
        : isPositionInRange
          ? 'In Range'
          : 'Out of Range';

    const firstMintTime =
        moment(timeFirstMintMemo * 1000).format('MM/DD/YYYY HH:mm') +
        ' ' +
        '(' +
        elapsedTimeSinceFirstMintString +
        ' ago)';

    const updateTime =
        moment(position.latestUpdateTime * 1000).format('MM/DD/YYYY HH:mm') +
        ' ' +
        '(' +
        elapsedTimeString +
        ' ago)';

    const infoContent = [
        {
            title: 'Position Type ',
            content: isAmbient ? 'Ambient' : 'Range',
            explanation: 'e.g. Range, Ambient ',
        },

        {
            title: 'Wallet ',
            content: walletContent,
            explanation: 'The account of the position owner',
        },
        {
            title: 'Status ',
            content: status,
            explanation: 'e.g. Ambient / In Range / Out of Range',
        },
        {
            title: 'Value ',
            content: usdValue,
            explanation: 'The approximate US dollar value of the limit order',
        },
        {
            title: 'Token 1 ',
            content: baseTokenSymbol + ' - ' + baseTokenName,
            explanation: 'Token #1 in the token pair',
        },

        {
            title: 'Token 1 Address ',
            content: baseAddressContent,
            explanation: 'Address of token #1 in the token pair',
        },

        {
            title: 'Token 1 Qty ',
            content: baseDisplay + ' ' + baseTokenSymbol,
            explanation: 'The quantity of token #1 in the token pair',
        },

        {
            title: 'Token 2 ',
            content: quoteTokenSymbol + ' - ' + quoteTokenName,
            explanation: 'Token #2 in the token pair',
        },

        {
            title: 'Token 2 Address ',
            content: quoteAddressContent,
            explanation: 'Address of token #2 in the token pair',
        },

        {
            title: 'Token 2 Qty ',
            content: quoteDisplay + ' ' + quoteTokenSymbol,
            explanation: 'The quantity of token #2 in the token pair',
        },
        {
            title: 'Time First Minted ',
            content: firstMintTime,
            explanation:
                'The time the owner first added liquidity at these prices',
        },
        {
            title: 'Range Min ',
            content: isAmbient
                ? ambientOrMin
                : isAccountView
                  ? isBaseTokenMoneynessGreaterOrEqual
                      ? `1 ${quoteTokenSymbol} = ${minRangeDenomByMoneyness} ${baseTokenSymbol}`
                      : `1 ${baseTokenSymbol} = ${minRangeDenomByMoneyness} ${quoteTokenSymbol}`
                  : isDenomBase
                    ? `1 ${baseTokenSymbol} = ${ambientOrMin} ${quoteTokenSymbol}`
                    : `1 ${quoteTokenSymbol} = ${ambientOrMin} ${baseTokenSymbol}`,
            explanation: 'The low price boundary of the range',
        },
        {
            title: 'Range Max ',
            content: isAmbient
                ? ambientOrMax
                : isAccountView
                  ? isBaseTokenMoneynessGreaterOrEqual
                      ? `1 ${quoteTokenSymbol} = ${maxRangeDenomByMoneyness} ${baseTokenSymbol}`
                      : `1 ${baseTokenSymbol} = ${maxRangeDenomByMoneyness} ${quoteTokenSymbol}`
                  : isDenomBase
                    ? `1 ${baseTokenSymbol} = ${ambientOrMax} ${quoteTokenSymbol}`
                    : `1 ${quoteTokenSymbol} = ${ambientOrMax} ${baseTokenSymbol}`,
            explanation: 'The upper price boundary of the range',
        },

        {
            title: 'Width ',
            content: isAmbient ? 'Infinite' : width + '%',
            explanation: 'The geometric range width',
        },
        {
            title: 'APR',
            content: aprAmountString || '',
            explanation:
                'The estimated APR of the position based on rewards earned',
        },
        {
            title: 'Position Slot ID ',
            content: posHashContent,
            // eslint-disable-next-line quotes
            explanation: "A unique identifier for this user's position",
        },

        ...(!isAmbient
            ? [
                  {
                      title: 'Low Tick ',
                      content: position.bidTick.toString(),
                      explanation:
                          'The low price boundary represented in a geometric scale',
                  },
                  {
                      title: 'High Tick ',
                      content: position.askTick.toString(),
                      explanation:
                          'The upper price boundary represented in a geometric scale',
                  },
              ]
            : []),
    ];

    if (!isAmbient) {
        infoContent.splice(
            10,
            0,
            {
                title: 'Token 1 Unclaimed Rewards ',
                content: baseFeesDisplay + ' ' + baseTokenSymbol,
                explanation: 'Token #1 unclaimed rewards',
            },
            {
                title: 'Token 2 Unclaimed Rewards ',
                content: quoteFeesDisplay + ' ' + quoteTokenSymbol,
                explanation: 'Token #2 unclaimed rewards',
            },
        );
    }

    if (firstMintTime !== updateTime) {
        infoContent.splice(isAmbient ? 11 : 13, 0, {
            title: 'Time Last Updated ',
            content: updateTime,
            explanation:
                'Time the owner last updated the position at these prices',
        });
    }
    if (showMobileVersion)
        return (
            <div className={styles.tx_details_container}>
                <div className={styles.main_container}>
                    <section>
                        {infoContent.map((info, idx) => (
                            <InfoRow
                                key={info.title + idx}
                                title={info.title}
                                content={info.content}
                                explanation={info.explanation}
                            />
                        ))}
                    </section>
                </div>
            </div>
        );
    return (
        <div className={styles.tx_details_container}>
            <div className={styles.main_container}>
                <section>
                    {infoContent
                        .slice(0, isAmbient ? 10 : 12)
                        .map((info, idx) => (
                            <InfoRow
                                key={info.title + idx}
                                title={info.title}
                                content={info.content}
                                explanation={info.explanation}
                            />
                        ))}
                </section>

                <section>
                    {infoContent
                        .slice(isAmbient ? 10 : 12, infoContent.length)
                        .map((info, idx) => (
                            <InfoRow
                                key={info.title + idx}
                                title={info.title}
                                content={info.content}
                                explanation={info.explanation}
                            />
                        ))}
                </section>
            </div>
        </div>
    );
}

export default memo(RangeDetailsSimplify);
