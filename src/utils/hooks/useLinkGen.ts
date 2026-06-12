import { useLocation, useNavigate } from 'react-router-dom';

export interface swapParamsIF {
    chain: string;
    tokenA: string;
    tokenB: string;
}

export interface marketParamsIF {
    chain: string;
    tokenA: string;
    tokenB: string;
}

export interface limitParamsIF {
    chain: string;
    tokenA: string;
    tokenB: string;
    limitTick?: number;
}

export interface poolParamsIF {
    chain: string;
    tokenA: string;
    tokenB: string;
    lowTick?: string;
    highTick?: string;
}

export interface initParamsIF {
    chain: string;
    tokenA: string;
    tokenB: string;
}

export interface repoParamsIF {
    chain: string;
    tokenA: string;
    tokenB: string;
}

// type containing all the URL parameter interfaces
type anyParamsIF =
    | swapParamsIF
    | marketParamsIF
    | limitParamsIF
    | poolParamsIF
    | initParamsIF
    | repoParamsIF;

// index of all base URL pathways in the Ambient app
const BASE_URL_PATHS = {
    index: '',
    home: '',
    swap: '/swap',
    market: '/trade/market',
    limit: '/trade/limit',
    pool: '/trade/pool',
    initpool: '/initpool',
    reposition: '/trade/reposition',
    explore: '/explore',
    explorePools: '/explore/pools',
    exploreTokens: '/explore/tokens',
    tos: '/terms',
    testpage: '/testpage',
    account: '/account',
    vaults: '/vaults',
    accountPoints: '/account/points',
    privacy: '/privacy',
    faq: '/faq',
    faqPoints: '/faq/points',
    notFound: '/404',
} as const;

// string-literal union type of keys in `BASE_URL_PATHS`
export type pageNames = keyof typeof BASE_URL_PATHS;
// string-literal union type of keys in `BASE_URL_PATHS`
export type baseURLs = (typeof BASE_URL_PATHS)[pageNames];

export interface linkGenMethodsIF {
    currentPage: pageNames;
    baseURL: baseURLs;
    getFullURL: (paramsObj?: anyParamsIF | string) => string;
    navigate: (paramsObj?: anyParamsIF | string) => void;
    redirect: (paramsObj?: anyParamsIF | string) => void;
}

// TODO:    @Emily: it probably makes sense to expand this hook to
// TODO:    .... centralize URLs to link external resources

export const useLinkGen = (page?: pageNames): linkGenMethodsIF => {
    // current URL path of the app relative to index page
    const { pathname } = useLocation();

    // callable fn to navigate the user to a given URL path in the app
    const navigate = useNavigate();

    // base URL of the user's location in the app, primarily uses provided
    // ... argument but will read the current URL pathname as a backup check
    const baseURL: baseURLs = BASE_URL_PATHS[page ?? getPageFromLocation()];

    // fn to infer the current page in the app based on the URL path
    function getPageFromLocation(): pageNames {
        let pageName: pageNames;
        if (pathname === '/') {
            pageName = 'index';
        } else if (pathname.startsWith(BASE_URL_PATHS.swap)) {
            pageName = 'swap';
        } else if (pathname.startsWith(BASE_URL_PATHS.market)) {
            pageName = 'market';
        } else if (pathname.startsWith(BASE_URL_PATHS.limit)) {
            pageName = 'limit';
        } else if (pathname.startsWith(BASE_URL_PATHS.pool)) {
            pageName = 'pool';
        } else if (pathname.startsWith(BASE_URL_PATHS.initpool)) {
            pageName = 'initpool';
        } else if (pathname.startsWith(BASE_URL_PATHS.reposition)) {
            pageName = 'reposition';
        } else if (pathname.startsWith(BASE_URL_PATHS.explorePools)) {
            pageName = 'explorePools';
        } else if (pathname.startsWith(BASE_URL_PATHS.exploreTokens)) {
            pageName = 'exploreTokens';
        } else if (pathname.startsWith(BASE_URL_PATHS.explore)) {
            pageName = 'explore';
        } else if (pathname.startsWith(BASE_URL_PATHS.tos)) {
            pageName = 'tos';
        } else if (pathname.startsWith(BASE_URL_PATHS.testpage)) {
            pageName = 'testpage';
        } else if (pathname.startsWith(BASE_URL_PATHS.account)) {
            pageName = 'account';
        } else if (pathname.startsWith(BASE_URL_PATHS.vaults)) {
            pageName = 'vaults';
        } else if (pathname.startsWith(BASE_URL_PATHS.privacy)) {
            pageName = 'privacy';
        } else if (pathname.startsWith(BASE_URL_PATHS.faqPoints)) {
            pageName = 'faqPoints';
        } else if (pathname.includes(BASE_URL_PATHS.notFound)) {
            pageName = 'notFound';
        } else {
            pageName = 'home';
        }
        return pageName;
    }

    // fn to build a URL for a given page including parameters
    function getFullURL(paramsObj?: anyParamsIF | string): baseURLs | string {
        let paramsSlug = '';
        if (paramsObj) {
            if (typeof paramsObj === 'string') {
                paramsSlug = '/' + paramsObj;
            } else {
                paramsSlug =
                    '/' +
                    Object.entries(paramsObj)
                        .map((tup: [string, string | number]) => tup.join('='))
                        .join('&');
            }
        }
        return baseURL + paramsSlug;
    }

    // fn to build a full URL including params AND navigate the user
    function navigateUser(paramsObj?: anyParamsIF | string): void {
        navigate(getFullURL(paramsObj));
    }

    // fn with same mode of action as `navigateUser()` with history stack replacement
    function redirectUser(paramsObj?: anyParamsIF | string): void {
        navigate(getFullURL(paramsObj), { replace: true });
    }

    return {
        currentPage: getPageFromLocation(),
        baseURL,
        getFullURL,
        navigate: navigateUser,
        redirect: redirectUser,
    };
};
