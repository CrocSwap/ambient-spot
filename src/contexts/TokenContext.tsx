import { createContext, useContext } from 'react';
import { TokenIF } from '../ambient-utils/types';
import {
    getRecentTokensParamsIF,
    useRecentTokens,
} from '../App/hooks/useRecentTokens';
import { tokenMethodsIF, useTokens } from '../App/hooks/useTokens';
import { useTokenSearch } from '../App/hooks/useTokenSearch';
import { AppStateContext } from './AppStateContext';
import { TokenBalanceContext } from './TokenBalanceContext';

export interface TokenContextIF {
    tokens: tokenMethodsIF;
    outputTokens: TokenIF[];
    ackTokens: TokenIF[];
    rawInput: string;
    validatedInput: string;
    setInput: (val: string) => void;
    searchType: string;
    addRecentToken: (tkn: TokenIF) => void;
    getRecentTokens: (options?: getRecentTokensParamsIF) => TokenIF[];
    addTokenInfo: (token: TokenIF) => TokenIF;
}

export const TokenContext = createContext({} as TokenContextIF);

export const TokenContextProvider = (props: { children: React.ReactNode }) => {
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);
    const { tokenBalances } = useContext(TokenBalanceContext);
    const tokens: tokenMethodsIF = useTokens();
    const { addRecentToken, getRecentTokens } = useRecentTokens(chainId);

    const [outputTokens, validatedInput, setInput, searchType, rawInput] =
        useTokenSearch(chainId, tokens, tokenBalances ?? [], getRecentTokens);

    const addTokenInfo = (token: TokenIF): TokenIF => {
        const oldToken: TokenIF | undefined = tokens.getTokenByAddress(
            token.address,
        );
        const newToken = { ...token };
        newToken.name = oldToken ? oldToken.name : '';
        newToken.logoURI = oldToken ? oldToken.logoURI : '';
        return newToken;
    };

    const tokenContext = {
        tokens,
        ackTokens: tokens.ackTokens,
        outputTokens,
        rawInput,
        validatedInput,
        setInput,
        searchType,
        addRecentToken,
        getRecentTokens,
        addTokenInfo,
    };

    return <TokenContext value={tokenContext}>{props.children}</TokenContext>;
};
