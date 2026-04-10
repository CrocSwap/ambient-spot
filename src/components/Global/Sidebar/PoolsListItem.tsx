import { useContext, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    getFormattedNumber,
    getMoneynessRank,
    uriToHttp,
} from '../../../ambient-utils/dataLayer';
import { PoolIF } from '../../../ambient-utils/types';
import { AppStateContext } from '../../../contexts';
import { SidebarContext } from '../../../contexts/SidebarContext';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { UserPreferenceContext } from '../../../contexts/UserPreferenceContext';
import { FlexContainer, Text } from '../../../styled/Common';
import {
    ItemContainer,
    MainItemContainer,
} from '../../../styled/Components/Sidebar';
import {
    linkGenMethodsIF,
    pageNames,
    useLinkGen,
} from '../../../utils/hooks/useLinkGen';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import TokenIcon from '../TokenIcon/TokenIcon';
import FavButton from './FavButton';

interface propsIF {
    pool: PoolIF;
}

export default function PoolsListItem(props: propsIF) {
    const { pool } = props;
    const { isPoolDropdownOpen, setIsPoolDropdownOpen } =
        useContext(SidebarContext);

    const {
        activeNetwork: { chainId, poolIndex },
    } = useContext(AppStateContext);
    const { favePools } = useContext(UserPreferenceContext);

    const isBaseTokenMoneynessGreaterOrEqual =
        pool.baseToken.symbol && pool.quoteToken.symbol
            ? getMoneynessRank(pool.baseToken.symbol) -
                  getMoneynessRank(pool.quoteToken.symbol) >=
              0
            : false;

    const baseToken = isBaseTokenMoneynessGreaterOrEqual
        ? pool.quoteToken
        : pool.baseToken;
    const quoteToken = isBaseTokenMoneynessGreaterOrEqual
        ? pool.baseToken
        : pool.quoteToken;
    const currentPoolData = {
        base: baseToken,
        quote: quoteToken,
        chainId: chainId,
        poolId: poolIndex,
    };

    const isButtonFavorited = favePools.check(
        currentPoolData.base.address,
        currentPoolData.quote.address,
        currentPoolData.chainId,
        currentPoolData.poolId,
    );

    function handleFavButton() {
        isButtonFavorited
            ? favePools.remove(baseToken, quoteToken, chainId, poolIndex)
            : favePools.add(quoteToken, baseToken, chainId, poolIndex);
    }

    const { pathname } = useLocation();

    const navTarget = useMemo<pageNames>(() => {
        let output: pageNames;
        if (
            pathname.startsWith('/trade/market') ||
            pathname.startsWith('/account') ||
            pathname === '/'
        ) {
            output = 'market';
        } else if (pathname.startsWith('/trade/limit')) {
            output = 'limit';
        } else if (pathname.startsWith('/trade/pool')) {
            output = 'pool';
        } else {
            console.warn(
                'Could not identify the correct URL path for redirect. Using /trade/market as a fallback value. Refer to TopPoolsCard.tsx for troubleshooting.',
            );
            output = 'market';
        }
        return output as pageNames;
    }, [pathname]);

    const { tokenA, tokenB } = useContext(TradeDataContext);

    // hook to generate navigation actions with pre-loaded path
    const linkGenMarket: linkGenMethodsIF = useLinkGen(navTarget);

    const [addrTokenA, addrTokenB] =
        tokenA.address.toLowerCase() === pool.base.toLowerCase()
            ? [pool.base, pool.quote]
            : tokenA.address.toLowerCase() === pool.quote.toLowerCase()
              ? [pool.quote, pool.base]
              : tokenB.address.toLowerCase() === pool.base.toLowerCase()
                ? [pool.quote, pool.base]
                : [pool.base, pool.quote];

    const mobileScreen = useMediaQuery('(max-width: 500px)');

    const poolDisplay = (
        <FlexContainer gap={8} alignItems='center'>
            {!mobileScreen && (
                <FlexContainer gap={4}>
                    <TokenIcon
                        token={
                            isBaseTokenMoneynessGreaterOrEqual
                                ? pool.quoteToken
                                : pool.baseToken
                        }
                        src={uriToHttp(
                            (isBaseTokenMoneynessGreaterOrEqual
                                ? pool.quoteToken.logoURI
                                : pool.baseToken.logoURI) ?? '...',
                        )}
                        alt={
                            isBaseTokenMoneynessGreaterOrEqual
                                ? pool.quoteToken.symbol
                                : pool.baseToken.symbol
                        }
                        size='m'
                    />
                    <TokenIcon
                        token={
                            isBaseTokenMoneynessGreaterOrEqual
                                ? pool.baseToken
                                : pool.quoteToken
                        }
                        src={uriToHttp(
                            (isBaseTokenMoneynessGreaterOrEqual
                                ? pool.baseToken.logoURI
                                : pool.quoteToken.logoURI) ?? '...',
                        )}
                        alt={
                            isBaseTokenMoneynessGreaterOrEqual
                                ? pool.baseToken.symbol
                                : pool.quoteToken.symbol
                        }
                        size='m'
                    />
                </FlexContainer>
            )}
            {isBaseTokenMoneynessGreaterOrEqual
                ? pool.quoteToken.symbol
                : pool.baseToken.symbol}{' '}
            /{' '}
            {isBaseTokenMoneynessGreaterOrEqual
                ? pool.baseToken.symbol
                : pool.quoteToken.symbol}
        </FlexContainer>
    );

    const priceChangeDisplay = (
        <Text
            color={
                pool.priceChangePercentString?.toLowerCase().includes('change')
                    ? 'white'
                    : pool.isPoolPriceChangePositive
                      ? 'positive'
                      : 'negative'
            }
        >
            {pool.priceChangePercentString}
        </Text>
    );

    const volumeDisplayString: string = pool.volumeChange24h
        ? getFormattedNumber({
              value: pool.volumeChange24h,
              prefix: '$',
          })
        : '';

    const tvlDisplayString: string = pool.tvlTotalUsd
        ? getFormattedNumber({
              value: pool.tvlTotalUsd,
              isTvl: true,
              prefix: '$',
          })
        : '';

    return (
        <MainItemContainer style={{ width: '100%' }}>
            <ItemContainer
                as={Link}
                to={linkGenMarket.getFullURL({
                    chain: chainId,
                    tokenA: addrTokenA,
                    tokenB: addrTokenB,
                })}
                color='text2'
                onClick={() => {
                    if (isPoolDropdownOpen) setIsPoolDropdownOpen(false);
                }}
            >
                {[
                    [poolDisplay],
                    `${pool.displayPriceString ?? '...'}`,
                    `${volumeDisplayString ? volumeDisplayString : '...'}`,
                    `${tvlDisplayString ? tvlDisplayString : '...'}`,

                    pool.displayPrice === undefined ||
                    pool.priceChangePercentString === undefined
                        ? '…'
                        : priceChangeDisplay,
                ].map((item, idx) => (
                    <FlexContainer key={idx} padding='4px 0'>
                        {item}
                    </FlexContainer>
                ))}
            </ItemContainer>

            <FavButton
                key={'pool'}
                handleFavButton={handleFavButton}
                isButtonFavorited={isButtonFavorited}
            />
        </MainItemContainer>
    );
}
