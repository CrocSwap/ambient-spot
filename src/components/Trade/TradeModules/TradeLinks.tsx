import { Link } from 'react-router-dom';
import { TokenIF } from '../../../ambient-utils/types';
import {
    baseURLs,
    limitParamsIF,
    linkGenMethodsIF,
    marketParamsIF,
    poolParamsIF,
    useLinkGen,
} from '../../../utils/hooks/useLinkGen';
import styles from './TradeLinks.module.css';

interface propsIF {
    chainId: string;
    tokenA: TokenIF;
    tokenB: TokenIF;
    limitTick?: number;
}

export default function TradeLinks(props: propsIF) {
    const { chainId, tokenA, tokenB, limitTick } = props;

    // hooks to generate default URL paths
    const linkGenMarket: linkGenMethodsIF = useLinkGen('market');
    const linkGenLimit: linkGenMethodsIF = useLinkGen('limit');
    const linkGenPool: linkGenMethodsIF = useLinkGen('pool');

    // URL param data to generate nav links
    const marketParams: marketParamsIF = {
        chain: chainId,
        tokenA: tokenA.address,
        tokenB: tokenB.address,
    };
    // this is constructed as such to handle a valid `0` value
    const limitParams: limitParamsIF =
        limitTick === undefined
            ? {
                  ...marketParams,
              }
            : {
                  ...marketParams,
                  limitTick: limitTick,
              };
    const poolParams: poolParamsIF = {
        ...marketParams,
    };

    // interface describing shape of route data to generate nav links
    interface routeIF {
        path: string;
        baseURL: baseURLs | string;
        name: 'Swap' | 'Limit' | 'Pool';
    }

    // data to generate nav links to the three trade modules
    const routes: routeIF[] = [
        {
            path: linkGenMarket.getFullURL(marketParams),
            baseURL: linkGenMarket.baseURL,
            name: 'Swap',
        },
        {
            path: linkGenLimit.getFullURL(limitParams),
            baseURL: linkGenLimit.baseURL,
            name: 'Limit',
        },
        {
            path: linkGenPool.getFullURL(poolParams),
            baseURL: linkGenPool.baseURL,
            name: 'Pool',
        },
    ];

    // nav links to the three trade modules
    return (
        <nav className={styles.container}>
            {routes.map((route: routeIF) => (
                <Link
                    key={JSON.stringify(route)}
                    id={`link_to_${route.name.toLowerCase()}_module`}
                    to={route.path}
                    className={`${styles.trade_link} ${
                        location.pathname.includes(route.baseURL)
                            ? styles.trade_link_active
                            : ''
                    }`}
                >
                    {route.name}
                </Link>
            ))}
        </nav>
    );
}
