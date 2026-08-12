import { CrocEnv } from '@crocswap-libs/sdk';
import { useAppKitProvider } from '@reown/appkit/react';
import { ethers } from 'ethers';
import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    blastMainnet,
    ethereumMainnet,
    getDefaultPairForChain,
    plumeMainnet,
    scrollMainnet,
} from '../ambient-utils/constants';
import { translateTokenSymbol } from '../ambient-utils/dataLayer';
import { PoolIF, TokenIF } from '../ambient-utils/types';
import { useBlacklist } from '../App/hooks/useBlacklist';
import { useTopPools } from '../App/hooks/useTopPools';
import { BatchedJsonRpcProvider } from '../utils/batchedProvider';
import {
    limitParamsIF,
    linkGenMethodsIF,
    poolParamsIF,
    swapParamsIF,
    useLinkGen,
} from '../utils/hooks/useLinkGen';
import { AppStateContext } from './AppStateContext';
import { TokenContext } from './TokenContext';
import { UserDataContext } from './UserDataContext';

interface UrlRoutesTemplateIF {
    swap: string;
    market: string;
    limit: string;
    pool: string;
}

export interface CrocEnvContextIF {
    crocEnv: CrocEnv | undefined;
    setCrocEnv: (val: CrocEnv | undefined) => void;
    topPools: PoolIF[];
    defaultUrlParams: UrlRoutesTemplateIF;
    provider: BatchedJsonRpcProvider;
    mainnetProvider: BatchedJsonRpcProvider | undefined;
    scrollProvider: BatchedJsonRpcProvider | undefined;
    blastProvider: BatchedJsonRpcProvider | undefined;
    plumeProvider: BatchedJsonRpcProvider | undefined;
}

export const CrocEnvContext = createContext({} as CrocEnvContextIF);
const mainnetProvider = new BatchedJsonRpcProvider(
    ethereumMainnet.evmRpcUrls,
    parseInt(ethereumMainnet.chainId),
    {
        staticNetwork: true,
    },
);
const scrollProvider = new BatchedJsonRpcProvider(
    scrollMainnet.evmRpcUrls,
    parseInt(scrollMainnet.chainId),
    {
        staticNetwork: true,
    },
);
const blastProvider = new BatchedJsonRpcProvider(
    blastMainnet.evmRpcUrls,
    parseInt(blastMainnet.chainId),
    {
        staticNetwork: true,
    },
);
const plumeProvider = new BatchedJsonRpcProvider(
    plumeMainnet.evmRpcUrls,
    parseInt(plumeMainnet.chainId),
    {
        staticNetwork: true,
    },
);

export const CrocEnvContextProvider = (props: { children: ReactNode }) => {
    const {
        activeNetwork: { chainId, evmRpcUrls },
        isUserOnline,
    } = useContext(AppStateContext);

    const { userAddress } = useContext(UserDataContext);
    const { walletProvider } = useAppKitProvider('eip155');
    const [crocEnv, setCrocEnv] = useState<CrocEnv | undefined>();
    const { tokens } = useContext(TokenContext);

    const topPools: PoolIF[] = useTopPools(chainId);

    // hooks to generate default URL paths
    const linkGenSwap: linkGenMethodsIF = useLinkGen('swap');
    const linkGenMarket: linkGenMethodsIF = useLinkGen('market');
    const linkGenLimit: linkGenMethodsIF = useLinkGen('limit');
    const linkGenPool: linkGenMethodsIF = useLinkGen('pool');

    function createDefaultUrlParams(chainId: string): UrlRoutesTemplateIF {
        const [dfltTokenA, dfltTokenB]: [TokenIF, TokenIF] =
            getDefaultPairForChain(chainId);

        const savedTokenASymbol: string | null = localStorage.getItem('tokenA');
        const savedTokenBSymbol: string | null = localStorage.getItem('tokenB');

        const tokensMatchingA: TokenIF[] =
            savedTokenASymbol === dfltTokenA.symbol
                ? [dfltTokenA]
                : tokens.getTokensByNameOrSymbol(
                      savedTokenASymbol || '',
                      chainId,
                      true,
                  );
        const tokensMatchingB: TokenIF[] =
            savedTokenBSymbol === dfltTokenA.symbol
                ? [dfltTokenA]
                : tokens.getTokensByNameOrSymbol(
                      savedTokenBSymbol || '',
                      chainId,
                      true,
                  );

        const firstTokenMatchingA = tokensMatchingA[0] || undefined;
        const firstTokenMatchingB = tokensMatchingB[0] || undefined;

        const isSavedTokenADefaultB = savedTokenASymbol
            ? translateTokenSymbol(savedTokenASymbol) ===
              translateTokenSymbol(dfltTokenB.symbol)
            : false;

        const isSavedTokenBDefaultA = savedTokenBSymbol
            ? translateTokenSymbol(savedTokenBSymbol) ===
              translateTokenSymbol(dfltTokenA.symbol)
            : false;

        const shouldReverseDefaultTokens =
            isSavedTokenADefaultB || isSavedTokenBDefaultA;

        // default URL params for swap and market modules
        // decision tree exists to preferentially consume most recent
        // ... token pair rather than the hardcoded default
        const swapParams: swapParamsIF = {
            chain: chainId,
            tokenA: firstTokenMatchingA
                ? firstTokenMatchingA.address
                : shouldReverseDefaultTokens
                  ? dfltTokenB.address
                  : dfltTokenA.address,
            tokenB: firstTokenMatchingB
                ? firstTokenMatchingB.address
                : shouldReverseDefaultTokens
                  ? dfltTokenA.address
                  : dfltTokenB.address,
        };

        // default URL params for the limit module
        const limitParams: limitParamsIF = {
            ...swapParams,
        };

        // default URL params for the pool module
        const poolParams: poolParamsIF = {
            ...swapParams,
        };

        return {
            swap: linkGenSwap.getFullURL(swapParams),
            market: linkGenMarket.getFullURL(swapParams),
            limit: linkGenLimit.getFullURL(limitParams),
            pool: linkGenPool.getFullURL(poolParams),
        };
    }

    const initUrl = createDefaultUrlParams(chainId);
    const [defaultUrlParams, setDefaultUrlParams] =
        useState<UrlRoutesTemplateIF>(initUrl);

    const [provider, setProvider] = useState<BatchedJsonRpcProvider>(
        new BatchedJsonRpcProvider(evmRpcUrls, parseInt(chainId), {
            staticNetwork: true,
        }),
    );

    useEffect(() => {
        (async () => {
            if (provider) {
                const currentProviderChainId = (
                    await provider.getNetwork()
                ).chainId.toString();

                if (currentProviderChainId !== parseInt(chainId).toString()) {
                    setProvider(
                        new BatchedJsonRpcProvider(
                            evmRpcUrls,
                            parseInt(chainId),
                            {
                                staticNetwork: true,
                            },
                        ),
                    );
                }
            }
        })();
    }, [provider, chainId, evmRpcUrls]);

    useBlacklist(userAddress);

    // set new crocEnv
    useEffect(() => {
        (async () => {
            if (!isUserOnline) return;
            let signer = undefined;
            if (walletProvider) {
                const w3provider = new ethers.BrowserProvider(
                    walletProvider as ethers.Eip1193Provider,
                );
                signer = await w3provider.getSigner();
            }
            if (!provider && !signer) {
                setCrocEnv(undefined);
                return;
            } else if (provider) {
                const newCrocEnv = new CrocEnv(
                    provider,
                    signer ? signer : undefined,
                );
                setCrocEnv(newCrocEnv);
            }
        })();
    }, [isUserOnline, provider, walletProvider, userAddress, evmRpcUrls]);

    useEffect(() => {
        setDefaultUrlParams(createDefaultUrlParams(chainId));
    }, [chainId]);

    // data returned by this context
    const crocEnvContext: CrocEnvContextIF = {
        crocEnv,
        setCrocEnv,
        topPools,
        defaultUrlParams,
        provider,
        mainnetProvider,
        scrollProvider,
        blastProvider,
        plumeProvider,
    };

    return (
        <CrocEnvContext.Provider value={crocEnvContext}>
            {props.children}
        </CrocEnvContext.Provider>
    );
};
