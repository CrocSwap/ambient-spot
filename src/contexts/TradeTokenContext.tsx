import { toDisplayQty } from '@crocswap-libs/sdk';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { FastLaneProtectionIF } from '../App/hooks/useFastLaneProtection';
import { usePoolMetadata } from '../App/hooks/usePoolMetadata';
import { useTokenPairAllowance } from '../App/hooks/useTokenPairAllowance';
import { ZERO_ADDRESS } from '../ambient-utils/constants';
import { AppStateContext } from './AppStateContext';
import { ChainDataContext } from './ChainDataContext';
import { CrocEnvContext } from './CrocEnvContext';
import { ReceiptContext } from './ReceiptContext';
import { TokenBalanceContext } from './TokenBalanceContext';
import { TradeDataContext } from './TradeDataContext';
import { UserDataContext } from './UserDataContext';

export interface TradeTokenContextIF {
    baseToken: {
        address: string;
        balance: string;
        setBalance: (val: string) => void;
        dexBalance: string;
        setDexBalance: (val: string) => void;
        decimals: number;
    };
    quoteToken: {
        address: string;
        balance: string;
        setBalance: (val: string) => void;
        dexBalance: string;
        setDexBalance: (val: string) => void;
        decimals: number;
    };
    tokenABalance: string;
    tokenBBalance: string;
    tokenADexBalance: string;
    tokenBDexBalance: string;
    isTokenAEth: boolean;
    isTokenBEth: boolean;
    tokenAAllowance: bigint | undefined;
    tokenBAllowance: bigint | undefined;
    setRecheckTokenAApproval: (val: boolean) => void;
    setRecheckTokenBApproval: (val: boolean) => void;
    isTokenABase: boolean;
    contextMatchesParams: boolean;
    isChartVisible: boolean;
    fastLaneProtection: FastLaneProtectionIF;
}

export const TradeTokenContext = createContext({} as TradeTokenContextIF);

export const TradeTokenContextProvider = (props: { children: ReactNode }) => {
    const {
        isUserIdle,
        activeNetwork: { chainId, isTestnet },
        isTradeRoute,
    } = useContext(AppStateContext);

    const { crocEnv } = useContext(CrocEnvContext);
    const { lastBlockNumber } = useContext(ChainDataContext);
    const { setTokenBalance } = useContext(TokenBalanceContext);
    const { userAddress, isUserConnected } = useContext(UserDataContext);
    const {
        tokenA,
        tokenB,
        baseToken,
        quoteToken,
        isTokenABase,
        contextMatchesParams,
    } = useContext(TradeDataContext);

    const { sessionReceipts } = useContext(ReceiptContext);
    const {
        tokenAAllowance,
        tokenBAllowance,
        setRecheckTokenAApproval,
        setRecheckTokenBApproval,
        fastLaneProtection,
    } = useTokenPairAllowance();

    const {
        baseTokenAddress,
        quoteTokenAddress,
        baseTokenDecimals,
        quoteTokenDecimals,
        isChartVisible,
    } = usePoolMetadata();

    const [baseTokenBalance, setBaseTokenBalance] = useState<string>('');
    const [quoteTokenBalance, setQuoteTokenBalance] = useState<string>('');
    const [baseTokenDexBalance, setBaseTokenDexBalance] = useState<string>('');
    const [quoteTokenDexBalance, setQuoteTokenDexBalance] =
        useState<string>('');
    const {
        tokenABalance,
        tokenBBalance,
        tokenADexBalance,
        tokenBDexBalance,
        isTokenAEth,
        isTokenBEth,
    } = useMemo(() => {
        const tokenABalance = isTokenABase
            ? baseTokenBalance
            : quoteTokenBalance;
        const tokenBBalance = isTokenABase
            ? quoteTokenBalance
            : baseTokenBalance;
        const tokenADexBalance = isTokenABase
            ? baseTokenDexBalance
            : quoteTokenDexBalance;
        const tokenBDexBalance = isTokenABase
            ? quoteTokenDexBalance
            : baseTokenDexBalance;

        const isTokenAEth = tokenA.address === ZERO_ADDRESS;
        const isTokenBEth = tokenB.address === ZERO_ADDRESS;
        return {
            tokenABalance,
            tokenBBalance,
            tokenADexBalance,
            tokenBDexBalance,
            isTokenAEth,
            isTokenBEth,
        };
    }, [
        isTokenABase,
        baseTokenBalance,
        baseTokenDexBalance,
        quoteTokenBalance,
        quoteTokenDexBalance,
        tokenA,
        tokenB,
    ]);

    const tradeTokenContext = {
        baseToken: {
            address: baseTokenAddress,
            balance: baseTokenBalance,
            setBalance: setBaseTokenBalance,
            dexBalance: baseTokenDexBalance,
            setDexBalance: setBaseTokenDexBalance,
            decimals: baseTokenDecimals,
        },
        quoteToken: {
            address: quoteTokenAddress,
            balance: quoteTokenBalance,
            setBalance: setQuoteTokenBalance,
            dexBalance: quoteTokenDexBalance,
            setDexBalance: setQuoteTokenDexBalance,
            decimals: quoteTokenDecimals,
        },
        tokenABalance,
        tokenBBalance,
        tokenADexBalance,
        tokenBDexBalance,
        isTokenAEth,
        isTokenBEth,
        tokenAAllowance,
        tokenBAllowance,
        setRecheckTokenAApproval,
        setRecheckTokenBApproval,
        isTokenABase,
        contextMatchesParams,
        isChartVisible,
        fastLaneProtection,
    };

    const blockTrigger = isTestnet ? 0 : lastBlockNumber;

    useEffect(() => {
        (async () => {
            if (
                isTradeRoute &&
                !isUserIdle &&
                crocEnv &&
                userAddress &&
                isUserConnected &&
                baseToken.address &&
                quoteToken.address &&
                baseTokenDecimals &&
                quoteTokenDecimals &&
                (await crocEnv.context).chain.chainId === chainId
            ) {
                try {
                    const baseTokenInstance = crocEnv.token(baseToken.address);
                    const quoteTokenInstance = crocEnv.token(
                        quoteToken.address,
                    );

                    // Fetch all balances concurrently
                    const [
                        baseWalletBalance,
                        baseDexBalance,
                        quoteWalletBalance,
                        quoteDexBalance,
                    ] = await Promise.all([
                        baseTokenInstance.wallet(userAddress),
                        baseTokenInstance.balance(userAddress),
                        quoteTokenInstance.wallet(userAddress),
                        quoteTokenInstance.balance(userAddress),
                    ]);

                    // Convert balances to display format
                    const newBaseWalletBalance = toDisplayQty(
                        baseWalletBalance,
                        baseTokenDecimals,
                    );
                    const newBaseDexBalance = toDisplayQty(
                        baseDexBalance,
                        baseTokenDecimals,
                    );
                    const newQuoteWalletBalance = toDisplayQty(
                        quoteWalletBalance,
                        quoteTokenDecimals,
                    );
                    const newQuoteDexBalance = toDisplayQty(
                        quoteDexBalance,
                        quoteTokenDecimals,
                    );

                    // Update state only if values changed
                    if (newBaseWalletBalance !== baseTokenBalance) {
                        setBaseTokenBalance(newBaseWalletBalance);
                    }
                    setTokenBalance({
                        tokenAddress: baseToken.address,
                        walletBalance: baseWalletBalance.toString(),
                    });

                    if (newBaseDexBalance !== baseTokenDexBalance) {
                        setBaseTokenDexBalance(newBaseDexBalance);
                    }
                    setTokenBalance({
                        tokenAddress: baseToken.address,
                        dexBalance: baseDexBalance.toString(),
                    });

                    if (newQuoteWalletBalance !== quoteTokenBalance) {
                        setQuoteTokenBalance(newQuoteWalletBalance);
                    }
                    setTokenBalance({
                        tokenAddress: quoteToken.address,
                        walletBalance: quoteWalletBalance.toString(),
                    });

                    if (newQuoteDexBalance !== quoteTokenDexBalance) {
                        setQuoteTokenDexBalance(newQuoteDexBalance);
                    }
                    setTokenBalance({
                        tokenAddress: quoteToken.address,
                        dexBalance: quoteDexBalance.toString(),
                    });
                } catch (error) {
                    console.error('Error fetching balances:', error);
                }
            }
        })();
    }, [
        crocEnv,
        chainId,
        isUserIdle,
        isUserConnected,
        userAddress,
        baseToken.address,
        quoteToken.address,
        baseTokenDecimals,
        quoteTokenDecimals,
        isTradeRoute,
        blockTrigger,
        sessionReceipts.length,
    ]);

    return (
        <TradeTokenContext value={tradeTokenContext}>
            {props.children}
        </TradeTokenContext>
    );
};
