import { CrocImpact, fromDisplayQty, toDisplayQty } from '@crocswap-libs/sdk';
import {
    Dispatch,
    memo,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { precisionOfInput } from '../../../ambient-utils/dataLayer';
import { calcImpact } from '../../../App/functions/calcImpact';
import useDebounce from '../../../App/hooks/useDebounce';
import { AppStateContext } from '../../../contexts';
import { ChainDataContext } from '../../../contexts/ChainDataContext';
import { CrocEnvContext } from '../../../contexts/CrocEnvContext';
import { PoolContext } from '../../../contexts/PoolContext';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { TradeTableContext } from '../../../contexts/TradeTableContext';
import { TradeTokenContext } from '../../../contexts/TradeTokenContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import { FlexContainer } from '../../../styled/Common';
import { linkGenMethodsIF, useLinkGen } from '../../../utils/hooks/useLinkGen';
import {
    formatTokenInput,
    normalizeExponential,
    stringToBigInt,
} from '../../../utils/numbers';
import TokenInputWithWalletBalance from '../../Form/TokenInputWithWalletBalance';
import TokensArrow from '../../Global/TokensArrow/TokensArrow';

interface propsIF {
    sellQtyString: { value: string; set: Dispatch<SetStateAction<string>> };
    buyQtyString: { value: string; set: Dispatch<SetStateAction<string>> };
    isSellLoading: { value: boolean; set: Dispatch<SetStateAction<boolean>> };
    isBuyLoading: { value: boolean; set: Dispatch<SetStateAction<boolean>> };
    isWithdrawFromDexChecked: boolean;
    isSaveAsDexSurplusChecked: boolean;
    slippageTolerancePercentage: number;
    setSwapAllowed: Dispatch<SetStateAction<boolean>>;
    setLastImpactQuery: Dispatch<
        SetStateAction<
            | {
                  input: string;
                  isInputSell: boolean;
                  impact: CrocImpact | undefined;
              }
            | undefined
        >
    >;
    isLiquidityInsufficient: boolean;
    setIsLiquidityInsufficient: Dispatch<SetStateAction<boolean>>;
    toggleDexSelection: (tokenAorB: 'A' | 'B') => void;
    amountToReduceNativeTokenQty: number;
    usdValueTokenA: number | undefined;
    usdValueTokenB: number | undefined;
    percentDiffUsdValue: number | undefined;
}

function SwapTokenInput(props: propsIF) {
    const {
        sellQtyString: { value: sellQtyString, set: setSellQtyString },
        buyQtyString: { value: buyQtyString, set: setBuyQtyString },
        isSellLoading: { value: isSellLoading, set: setIsSellLoading },
        isBuyLoading: { value: isBuyLoading, set: setIsBuyLoading },
        isWithdrawFromDexChecked,
        isSaveAsDexSurplusChecked,
        slippageTolerancePercentage,
        setSwapAllowed,
        isLiquidityInsufficient,
        setIsLiquidityInsufficient,
        toggleDexSelection,
        amountToReduceNativeTokenQty,
        setLastImpactQuery,
        usdValueTokenA,
        usdValueTokenB,
        percentDiffUsdValue,
    } = props;

    const { crocEnv } = useContext(CrocEnvContext);

    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);
    const { lastBlockNumber } = useContext(ChainDataContext);
    const { isPoolInitialized } = useContext(PoolContext);
    const { isUserOnline } = useContext(AppStateContext);
    const {
        tokenABalance,
        tokenBBalance,
        tokenADexBalance,
        tokenBDexBalance,
        isTokenAEth: isSellTokenEth,
        isTokenBEth: isBuyTokenEth,
        contextMatchesParams,
    } = useContext(TradeTokenContext);

    const { showSwapPulseAnimation } = useContext(TradeTableContext);
    const { isUserConnected } = useContext(UserDataContext);
    const {
        tokenA,
        tokenB,
        isTokenAPrimary,
        setIsTokenAPrimary,
        primaryQuantity,
        setPrimaryQuantity,
        setLimitTick,
        shouldSwapDirectionReverse,
        setShouldSwapDirectionReverse,
    } = useContext(TradeDataContext);
    // hook to generate navigation actions with pre-loaded path
    const linkGenAny: linkGenMethodsIF = useLinkGen();

    const [lastInput, setLastInput] = useState<string | undefined>();
    // Let input rest 1/5 of a second before triggering an update
    const debouncedLastInput = useDebounce(lastInput, 200);

    const reverseTokens = (): void => {
        linkGenAny.navigate({
            chain: chainId,
            tokenA: tokenB.address,
            tokenB: tokenA.address,
        });
        setIsTokenAPrimary(!isTokenAPrimary);

        setLimitTick(undefined);
    };

    const handleBlockUpdate = () => {
        if (contextMatchesParams) {
            isTokenAPrimary
                ? handleTokenAChangeEvent()
                : handleTokenBChangeEvent();
        }
    };

    useEffect(() => {
        (async () => {
            if (
                isUserOnline &&
                crocEnv &&
                (await crocEnv.context).chain.chainId === chainId
            ) {
                handleBlockUpdate();
            }
        })();
    }, [
        isUserOnline,
        lastBlockNumber,
        contextMatchesParams,
        isTokenAPrimary,
        crocEnv,
        chainId,
    ]);

    useEffect(() => {
        if (shouldSwapDirectionReverse) {
            reverseTokens();
            setShouldSwapDirectionReverse(false);
        }
    }, [shouldSwapDirectionReverse]);

    useEffect(() => {
        if (isUserOnline && debouncedLastInput !== undefined) {
            isTokenAPrimary
                ? handleTokenAChangeEvent(debouncedLastInput)
                : handleTokenBChangeEvent(debouncedLastInput);
        }
    }, [debouncedLastInput, isUserOnline]);

    const lastQuery = useRef({ isAutoUpdate: false, inputValue: '' });

    async function refreshImpact(
        input: string,
        sellToken: boolean,
    ): Promise<number | undefined> {
        if (
            !isUserOnline ||
            isNaN(parseFloat(input)) ||
            parseFloat(input) <= 0 ||
            !crocEnv
        ) {
            setIsLiquidityInsufficient(false);

            return undefined;
        }
        const impact = await calcImpact(
            sellToken,
            crocEnv,
            tokenA.address,
            tokenB.address,
            slippageTolerancePercentage / 100,
            input,
        );
        if (impact === undefined) {
            setLastImpactQuery(undefined);
        } else {
            setLastImpactQuery({
                input,
                isInputSell: sellToken,
                impact,
            });
        }
        if (sellToken) {
            const estimatedBuyBigInt = impact?.buyQty
                ? stringToBigInt(impact.buyQty, tokenB.decimals)
                : 0n;

            const precisionForTruncation =
                tokenB.decimals < 6
                    ? tokenB.decimals
                    : estimatedBuyBigInt <
                        fromDisplayQty('0.01', tokenB.decimals)
                      ? tokenB.decimals
                      : estimatedBuyBigInt >
                          fromDisplayQty('100', tokenB.decimals)
                        ? 2
                        : estimatedBuyBigInt >
                            fromDisplayQty('2', tokenB.decimals)
                          ? 3
                          : 6;

            const normalizedEstimatedBuyString = normalizeExponential(
                toDisplayQty(estimatedBuyBigInt, tokenB.decimals),
                precisionForTruncation,
            );

            // prevent writing result of impact query to the UI if a new query has been made
            if (
                stringToBigInt(
                    lastQuery.current.inputValue,
                    tokenA.decimals,
                ) === stringToBigInt(input, tokenA.decimals)
            ) {
                setBuyQtyString(normalizedEstimatedBuyString);
                setIsBuyLoading(false);
            }
        } else {
            const estimatedSellBigInt = impact?.buyQty
                ? stringToBigInt(impact.sellQty, tokenA.decimals)
                : 0n;

            const precisionForTruncation =
                tokenA.decimals < 6
                    ? tokenA.decimals
                    : estimatedSellBigInt <
                        fromDisplayQty('0.01', tokenA.decimals)
                      ? tokenA.decimals
                      : estimatedSellBigInt >
                          fromDisplayQty('100', tokenA.decimals)
                        ? 2
                        : estimatedSellBigInt >
                            fromDisplayQty('2', tokenA.decimals)
                          ? 3
                          : 6;

            const normalizedEstimatedSellString = normalizeExponential(
                toDisplayQty(estimatedSellBigInt, tokenA.decimals),
                precisionForTruncation,
            );

            // prevent writing result of impact query to the UI if a new query has been made
            const lastQueryBigInt = stringToBigInt(
                lastQuery.current.inputValue,
                tokenB.decimals,
            );
            const currentQueryBigInt = stringToBigInt(input, tokenB.decimals);

            if (lastQueryBigInt === currentQueryBigInt) {
                setSellQtyString(normalizedEstimatedSellString);
                setIsSellLoading(false);
            }
        }

        // prevent swaps with a price impact in excess of -99.99% or 1 million percent
        if (impact) {
            if (
                impact.percentChange < -0.9999 ||
                impact.percentChange > 10000
            ) {
                setIsLiquidityInsufficient(true);
                setSwapAllowed(false);
                return undefined;
            } else {
                setIsLiquidityInsufficient(false);
                return parseFloat(sellToken ? impact.buyQty : impact.sellQty);
            }
        } else {
            if (isPoolInitialized) {
                setIsLiquidityInsufficient(true);
            } else {
                setIsLiquidityInsufficient(false);
            }
            setSwapAllowed(false);
            return undefined;
        }
    }

    const debouncedTokenAChangeEvent = (value: string) => {
        if (parseFloat(value) > 0) setIsBuyLoading(true);
        setSellQtyString(value);
        setPrimaryQuantity(value);
        setLastInput(value);
        lastQuery.current = { isAutoUpdate: false, inputValue: value };

        setIsTokenAPrimary(true);
    };

    const debouncedTokenBChangeEvent = (value: string) => {
        if (parseFloat(value) > 0) setIsSellLoading(true);
        setBuyQtyString(value);
        setPrimaryQuantity(value);
        setLastInput(value);
        lastQuery.current = { isAutoUpdate: false, inputValue: value };

        setIsTokenAPrimary(false);
    };

    const handleTokenAChangeEvent = async (value?: string) => {
        if (value !== undefined) {
            if (value === '') {
                setBuyQtyString('');
                setSellQtyString('');
                setPrimaryQuantity('');
                setIsBuyLoading(false);
                return;
            }
            if (parseFloat(value) !== 0) {
                const truncatedInputStr = formatTokenInput(value, tokenA);
                await refreshImpact(truncatedInputStr, true);
            } else {
                setBuyQtyString('');
                setPrimaryQuantity(value);
                setIsBuyLoading(false);
            }
        } else {
            lastQuery.current = {
                isAutoUpdate: true,
                inputValue: primaryQuantity,
            };
            if (precisionOfInput(primaryQuantity) > tokenA.decimals) {
                setBuyQtyString('');
                setSellQtyString('');
                setPrimaryQuantity('');
                setIsBuyLoading(false);
                return;
            }
            await refreshImpact(primaryQuantity, true);
        }
    };

    const handleTokenBChangeEvent = async (value?: string) => {
        if (value !== undefined) {
            if (value === '') {
                setBuyQtyString('');
                setSellQtyString('');
                setPrimaryQuantity('');
                setIsSellLoading(false);
                return;
            }
            if (parseFloat(value) !== 0) {
                const truncatedInputStr = formatTokenInput(value, tokenB);
                await refreshImpact(truncatedInputStr, false);
            } else {
                setSellQtyString('');
                setPrimaryQuantity(value);
                setIsSellLoading(false);
            }
        } else {
            lastQuery.current = {
                isAutoUpdate: true,
                inputValue: primaryQuantity,
            };
            if (precisionOfInput(primaryQuantity) > tokenB.decimals) {
                setBuyQtyString('');
                setSellQtyString('');
                setPrimaryQuantity('');
                setIsSellLoading(false);
                return;
            }
            await refreshImpact(primaryQuantity, false);
        }
    };

    const refreshTokenData = async () => {
        if (isTokenAPrimary) {
            setIsBuyLoading(true);
            handleTokenAChangeEvent && (await handleTokenAChangeEvent());
            setIsBuyLoading(false);
        } else {
            setIsSellLoading(true);
            handleTokenBChangeEvent && (await handleTokenBChangeEvent());
            setIsSellLoading(false);
        }
    };

    // refresh token data when swap module initializes
    useEffect(() => {
        (async () => {
            if (crocEnv && (await crocEnv.context).chain.chainId === chainId) {
                await refreshTokenData();
            }
        })();
    }, [crocEnv, chainId, isUserOnline]);

    useEffect(() => {
        if (isTokenAPrimary) {
            if (sellQtyString !== primaryQuantity) {
                setSellQtyString && setSellQtyString(primaryQuantity);
            }
        } else {
            if (buyQtyString !== primaryQuantity) {
                setBuyQtyString && setBuyQtyString(primaryQuantity);
            }
        }
    }, [isTokenAPrimary, sellQtyString, buyQtyString, primaryQuantity]);

    function reverseForAmbient(): void {
        isTokenAPrimary
            ? sellQtyString !== '' && parseFloat(sellQtyString) > 0
                ? setIsSellLoading(true)
                : null
            : buyQtyString !== '' && parseFloat(buyQtyString) > 0
              ? setIsBuyLoading(true)
              : null;

        if (!isTokenAPrimary) {
            setSellQtyString(primaryQuantity);
        } else {
            setBuyQtyString(primaryQuantity);
        }
        setIsTokenAPrimary(!isTokenAPrimary);

        reverseTokens();
    }

    return (
        <FlexContainer flexDirection='column' gap={8}>
            <TokenInputWithWalletBalance
                fieldId='swap_sell'
                tokenAorB='A'
                token={tokenA}
                tokenInput={
                    isTokenAPrimary ||
                    isLiquidityInsufficient ||
                    (!isTokenAPrimary && parseFloat(buyQtyString) > 0)
                        ? sellQtyString
                        : ''
                }
                tokenBalance={tokenABalance}
                tokenDexBalance={tokenADexBalance}
                isTokenEth={isSellTokenEth}
                isDexSelected={isWithdrawFromDexChecked}
                isLoading={isSellLoading && buyQtyString !== ''}
                impactCalculationPending={isBuyLoading && sellQtyString !== ''}
                showPulseAnimation={showSwapPulseAnimation}
                handleTokenInputEvent={debouncedTokenAChangeEvent}
                reverseTokens={reverseTokens}
                handleToggleDexSelection={() => toggleDexSelection('A')}
                showWallet={isUserConnected}
                parseTokenInput={(val: string, isMax?: boolean) => {
                    setSellQtyString(formatTokenInput(val, tokenA, isMax));
                }}
                amountToReduceNativeTokenQty={amountToReduceNativeTokenQty}
                usdValue={usdValueTokenA}
            />
            <FlexContainer
                fullWidth
                justifyContent='center'
                alignItems='center'
            >
                <TokensArrow onClick={() => reverseForAmbient()} />
            </FlexContainer>
            <TokenInputWithWalletBalance
                fieldId='swap_buy'
                tokenAorB='B'
                token={tokenB}
                tokenInput={
                    !isTokenAPrimary ||
                    isLiquidityInsufficient ||
                    parseFloat(sellQtyString) > 0
                        ? buyQtyString
                        : ''
                }
                tokenBalance={tokenBBalance}
                tokenDexBalance={tokenBDexBalance}
                isTokenEth={isBuyTokenEth}
                isDexSelected={isSaveAsDexSurplusChecked}
                isLoading={isBuyLoading && sellQtyString !== ''}
                impactCalculationPending={isSellLoading && buyQtyString !== ''}
                showPulseAnimation={showSwapPulseAnimation}
                handleTokenInputEvent={debouncedTokenBChangeEvent}
                reverseTokens={reverseTokens}
                handleToggleDexSelection={() => toggleDexSelection('B')}
                showWallet={isUserConnected}
                hideWalletMaxButton
                handleRefresh={primaryQuantity ? refreshTokenData : undefined}
                parseTokenInput={(val: string, isMax?: boolean) => {
                    setBuyQtyString(formatTokenInput(val, tokenB, isMax));
                }}
                amountToReduceNativeTokenQty={0} // value not used for buy token
                usdValue={usdValueTokenB}
                percentDiffUsdValue={percentDiffUsdValue}
            />
        </FlexContainer>
    );
}

export default memo(SwapTokenInput);
