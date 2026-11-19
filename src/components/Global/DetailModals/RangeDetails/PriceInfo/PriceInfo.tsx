import styles from './PriceInfo.module.css';

import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { PositionIF, TokenIF } from '../../../../../ambient-utils/types';
import { TokenContext } from '../../../../../contexts/TokenContext';
import useMediaQuery from '../../../../../utils/hooks/useMediaQuery';
import Apy from '../../../Tabs/Apy/Apy';
import TokenIcon from '../../../TokenIcon/TokenIcon';

interface propsIF {
    position: PositionIF;
    usdValue: string;
    lowRangeDisplay: string;
    highRangeDisplay: string;
    baseCollateralDisplay: string | undefined;
    quoteCollateralDisplay: string | undefined;
    baseFeesDisplay: string | undefined;
    quoteFeesDisplay: string | undefined;
    baseTokenLogoURI: string;
    quoteTokenLogoURI: string;
    baseTokenSymbol: string;
    quoteTokenSymbol: string;
    isAmbient: boolean;
    isDenomBase: boolean;
    positionApy: number | undefined;
    minRangeDenomByMoneyness: string;
    maxRangeDenomByMoneyness: string;
    baseTokenAddress: string;
    quoteTokenAddress: string;
    isBaseTokenMoneynessGreaterOrEqual: boolean;
    isAccountView: boolean;
    baseTokenCharacter: string;
    quoteTokenCharacter: string;
}

export default function PriceInfo(props: propsIF) {
    const showMobileVersion = useMediaQuery('(max-width: 768px)');

    const {
        usdValue,
        lowRangeDisplay,
        highRangeDisplay,
        baseCollateralDisplay,
        quoteCollateralDisplay,
        baseFeesDisplay,
        quoteFeesDisplay,
        baseTokenLogoURI,
        quoteTokenLogoURI,
        baseTokenSymbol,
        quoteTokenSymbol,
        isAmbient,
        isDenomBase,
        positionApy,
        minRangeDenomByMoneyness,
        maxRangeDenomByMoneyness,
        baseTokenAddress,
        quoteTokenAddress,
        isBaseTokenMoneynessGreaterOrEqual,
        isAccountView,
        baseTokenCharacter,
        quoteTokenCharacter,
    } = props;

    const { pathname } = useLocation();

    const isOnTradeRoute = pathname.includes('trade');
    const { tokens } = useContext(TokenContext);

    const isDenomBaseLocal = isAccountView
        ? !isBaseTokenMoneynessGreaterOrEqual
        : isDenomBase;

    const baseToken: TokenIF | undefined =
        tokens.getTokenByAddress(baseTokenAddress);
    const quoteToken: TokenIF | undefined =
        tokens.getTokenByAddress(quoteTokenAddress);
    const baseTokenLogoDisplay = (
        <TokenIcon
            token={baseToken}
            src={baseTokenLogoURI}
            alt={baseTokenSymbol}
            size='s'
        />
    );
    const quoteTokenLogoDisplay = (
        <TokenIcon
            token={quoteToken}
            src={quoteTokenLogoURI}
            alt={quoteTokenSymbol}
            size='s'
        />
    );
    // const unknownTokenLogoDisplay = (
    //     <TokenIcon
    //         token={undefined}
    //         src={undefined}
    //         alt={undefined}
    //         size='xs'
    //     />
    // );

    const totalValue = (
        <div className={styles.value_content}>
            <p>Total Value:</p>
            <p>{usdValue}</p>
        </div>
    );

    const earnedContent = isAmbient ? (
        <div className={styles.ambi_info_text}>
            Ambient position rewards are compounded back into the original
            position and are included in the amounts above.
        </div>
    ) : (
        <section>
            <div>
                <p>{`Earned ${baseTokenSymbol}`}</p>
                <div className={styles.token_value_row}>
                    {baseFeesDisplay === undefined ? '…' : baseFeesDisplay}
                    {baseTokenLogoDisplay}
                </div>
            </div>

            <div>
                <p>{`Earned ${quoteTokenSymbol}`}</p>
                <div className={styles.token_value_row}>
                    {quoteFeesDisplay === undefined ? '…' : quoteFeesDisplay}
                    {quoteTokenLogoDisplay}
                </div>
            </div>
        </section>
    );

    const priceStatusContent = (
        <div className={styles.price_status_content}>
            <section>
                <p>Range Min:</p>
                <h2 className={styles.low_range}>
                    {isAmbient
                        ? '0'
                        : isOnTradeRoute
                          ? (isDenomBaseLocal
                                ? quoteTokenCharacter
                                : baseTokenCharacter) + lowRangeDisplay
                          : (isDenomBaseLocal
                                ? quoteTokenCharacter
                                : baseTokenCharacter) +
                            minRangeDenomByMoneyness}
                </h2>
            </section>

            <section>
                <p>Range Max:</p>
                <h2 className={styles.high_range}>
                    {isAmbient
                        ? '∞'
                        : isOnTradeRoute
                          ? (isDenomBaseLocal
                                ? quoteTokenCharacter
                                : baseTokenCharacter) + highRangeDisplay
                          : (isDenomBaseLocal
                                ? quoteTokenCharacter
                                : baseTokenCharacter) +
                            maxRangeDenomByMoneyness}
                </h2>
            </section>
        </div>
    );

    const baseTokenLargeDisplay = (
        <TokenIcon
            token={baseToken}
            src={baseTokenLogoURI}
            alt={baseTokenSymbol}
            size='2xl'
        />
    );

    const quoteTokenLargeDisplay = (
        <TokenIcon
            token={quoteToken}
            src={quoteTokenLogoURI}
            alt={quoteTokenSymbol}
            size='2xl'
        />
    );

    const tokenPairDetails = (
        <div className={styles.token_pair_details}>
            <div className={styles.token_pair_images}>
                {isDenomBaseLocal
                    ? baseTokenLargeDisplay
                    : quoteTokenLargeDisplay}
                {isDenomBaseLocal
                    ? quoteTokenLargeDisplay
                    : baseTokenLargeDisplay}
            </div>
            <p>
                {isDenomBaseLocal ? baseTokenSymbol : quoteTokenSymbol} /{' '}
                {isDenomBaseLocal ? quoteTokenSymbol : baseTokenSymbol}
            </p>
        </div>
    );

    return (
        <div className={styles.main_container}>
            <div className={styles.price_info_container}>
                {tokenPairDetails}
                {totalValue}
                <div className={styles.earned_container}>
                    <section>
                        <div>
                            <p>{`Pooled ${baseTokenSymbol}`}</p>
                            <div className={styles.token_value_row}>
                                {baseCollateralDisplay === undefined
                                    ? '…'
                                    : baseCollateralDisplay}
                                {baseTokenLogoDisplay}
                            </div>
                        </div>

                        <div>
                            <p>{`Pooled ${quoteTokenSymbol}`}</p>
                            <div className={styles.token_value_row}>
                                {quoteCollateralDisplay === undefined
                                    ? '…'
                                    : quoteCollateralDisplay}
                                {quoteTokenLogoDisplay}
                            </div>
                        </div>
                    </section>
                    <span className={styles.divider} />

                    {earnedContent}
                </div>

                {priceStatusContent}
                {positionApy !== 0 ? (
                    <Apy
                        amount={positionApy}
                        fs={
                            showMobileVersion
                                ? '22px'
                                : positionApy && positionApy >= 1000
                                  ? '36px'
                                  : '42px'
                        }
                        lh={showMobileVersion ? '' : '60px'}
                        center
                        showTitle
                    />
                ) : undefined}
            </div>
        </div>
    );
}
