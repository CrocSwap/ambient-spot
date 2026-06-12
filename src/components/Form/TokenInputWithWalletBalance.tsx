import { fromDisplayQty, toDisplayQty } from '@crocswap-libs/sdk';
import { memo } from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import { HIDE_TOKEN_VALUES } from '../../ambient-utils/constants';
import { getFormattedNumber } from '../../ambient-utils/dataLayer';
import { TokenIF } from '../../ambient-utils/types';
import { useSimulatedIsPoolInitialized } from '../../App/hooks/useSimulatedIsPoolInitialized';
import { RefreshButton } from '../../styled/Components/TradeModules';
import { formatTokenInput, stringToBigInt } from '../../utils/numbers';
import TokenInputQuantity from './TokenInputQuantity';
import WalletBalanceSubinfo from './WalletBalanceSubinfo';

interface propsIF {
    tokenAorB: 'A' | 'B';
    token: TokenIF;
    tokenInput: string;
    isTokenEth: boolean;
    isDexSelected: boolean;
    showPulseAnimation: boolean;
    handleTokenInputEvent: (val: string) => void;
    reverseTokens: () => void;
    handleToggleDexSelection: () => void;
    usdValue: number | undefined;
    handleRefresh?: () => void;
    parseTokenInput?: (val: string, isMax?: boolean) => void | string;
    fieldId?: string;
    isLoading?: boolean;
    impactCalculationPending?: boolean;
    showWallet?: boolean;
    hideWalletMaxButton?: boolean;
    tokenBalance?: string;
    tokenDexBalance?: string;
    isWithdraw?: boolean;
    disabledContent?: React.ReactNode;
    amountToReduceNativeTokenQty: number;
    isInitPage?: boolean | undefined;
    tokenDecimals?: number;
    percentDiffUsdValue?: number;
    isSwap?: boolean;
}

function TokenInputWithWalletBalance(props: propsIF) {
    const {
        fieldId,
        tokenAorB,
        token,
        tokenInput,
        tokenBalance,
        tokenDexBalance,
        isTokenEth,
        isDexSelected,
        isWithdraw,
        showPulseAnimation,
        isLoading,
        impactCalculationPending,
        showWallet,
        hideWalletMaxButton,
        disabledContent,
        handleTokenInputEvent,
        reverseTokens,
        handleToggleDexSelection,
        parseTokenInput,
        handleRefresh,
        amountToReduceNativeTokenQty,
        isInitPage,
        usdValue,
        percentDiffUsdValue,
        isSwap,
    } = props;

    const usdValueForDom =
        usdValue && parseFloat(tokenInput) > 0
            ? getFormattedNumber({
                  value: usdValue * parseFloat(tokenInput),
                  prefix: '$',
              })
            : '';

    const walletBalanceBigInt = tokenBalance
        ? stringToBigInt(tokenBalance, token.decimals)
        : BigInt(0);
    const dexBalanceBigInt = tokenDexBalance
        ? stringToBigInt(tokenDexBalance, token.decimals)
        : BigInt(0);

    const walletBalanceDisplay = tokenBalance ? tokenBalance : '...';
    const walletAndExchangeBalanceDisplay =
        tokenBalance && tokenDexBalance
            ? (
                  parseFloat(tokenBalance) + parseFloat(tokenDexBalance)
              ).toString()
            : '...';
    const walletAndExchangeBalanceBigInt =
        walletBalanceBigInt + dexBalanceBigInt;

    const balanceDisplay = !isDexSelected
        ? walletBalanceDisplay
        : walletAndExchangeBalanceDisplay;

    const selectedBalanceBigInt = !isDexSelected
        ? walletBalanceBigInt
        : walletAndExchangeBalanceBigInt;

    const balanceToDisplay = getFormattedNumber({
        value: parseFloat(balanceDisplay) ?? undefined,
    });

    const subtractBuffer = (balance: bigint) =>
        isTokenEth
            ? balance -
              fromDisplayQty(
                  (amountToReduceNativeTokenQty * 1.1).toString(), // 10% buffer between amount to reduce and amount used to block user from submitting tx
                  token.decimals,
              )
            : isInitPage
              ? balance - BigInt(1e6)
              : balance;

    const selectedBalanceWithBufferBigInt = selectedBalanceBigInt
        ? subtractBuffer(selectedBalanceBigInt)
        : 0n;

    const scaledSelectedBalanceWithBuffer = toDisplayQty(
        selectedBalanceWithBufferBigInt,
        token.decimals,
    );

    const handleMaxButtonClick = () => {
        if (
            scaledSelectedBalanceWithBuffer !== tokenInput &&
            selectedBalanceWithBufferBigInt > 0n
        ) {
            parseTokenInput &&
                parseTokenInput(scaledSelectedBalanceWithBuffer, true);
            handleTokenInputEvent(
                formatTokenInput(scaledSelectedBalanceWithBuffer, token, true),
            );
        }
    };

    const handleToggleDex = () => {
        // if the sell token quantity is maximized and the user switches to use exchange balance,
        // then the quantity should be updated to the exchange balance maximum
        if (
            tokenAorB === 'A' &&
            (scaledSelectedBalanceWithBuffer === tokenInput ||
                Math.abs(
                    (parseFloat(tokenInput) -
                        parseFloat(scaledSelectedBalanceWithBuffer)) /
                        parseFloat(scaledSelectedBalanceWithBuffer),
                ) < 0.01) // consider the values equal if the difference is less than 1%
        ) {
            if (
                walletBalanceBigInt !==
                walletBalanceBigInt + dexBalanceBigInt
            ) {
                const newBalanceWithBuffer = walletAndExchangeBalanceBigInt
                    ? subtractBuffer(
                          isDexSelected
                              ? walletBalanceBigInt
                              : walletAndExchangeBalanceBigInt,
                      )
                    : 0n;

                const newScaledBalance = toDisplayQty(
                    newBalanceWithBuffer,
                    token.decimals,
                );
                parseTokenInput && parseTokenInput(newScaledBalance);
                handleTokenInputEvent(newScaledBalance);
            }
        }
        handleToggleDexSelection();
    };

    const isPoolInitialized = useSimulatedIsPoolInitialized();

    const walletContent = (
        <>
            <WalletBalanceSubinfo
                usdValueForDom={
                    isLoading ||
                    impactCalculationPending ||
                    !usdValueForDom ||
                    disabledContent ||
                    !isPoolInitialized ||
                    HIDE_TOKEN_VALUES ||
                    token.chainId === parseInt('0x279f') // monad testnet
                        ? ''
                        : usdValueForDom
                }
                percentDiffUsdValue={percentDiffUsdValue}
                showWallet={showWallet}
                isWithdraw={isWithdraw ?? tokenAorB === 'A'}
                balance={balanceToDisplay}
                availableBalance={selectedBalanceWithBufferBigInt}
                useExchangeBalance={
                    isDexSelected &&
                    !!tokenDexBalance &&
                    parseFloat(tokenDexBalance) > 0
                }
                isDexSelected={isDexSelected}
                onToggleDex={handleToggleDex}
                onMaxButtonClick={
                    !hideWalletMaxButton ? handleMaxButtonClick : undefined
                }
                isSwap={isSwap}
            />
        </>
    );

    return (
        <>
            <TokenInputQuantity
                fieldId={fieldId}
                token={token}
                tokenAorB={tokenAorB}
                value={tokenInput}
                handleTokenInputEvent={handleTokenInputEvent}
                reverseTokens={reverseTokens}
                isLoading={isLoading}
                includeWallet={walletContent}
                showPulseAnimation={showPulseAnimation}
                disabledContent={disabledContent}
                isPoolInitialized={isPoolInitialized}
                walletBalance={walletBalanceDisplay}
                usdValue={usdValueForDom}
                percentDiffUsdValue={percentDiffUsdValue}
            />
            {handleRefresh && (
                <RefreshButton
                    onClick={handleRefresh}
                    aria-label='Refresh data'
                >
                    <FiRefreshCw size={18} />
                </RefreshButton>
            )}
        </>
    );
}

export default memo(TokenInputWithWalletBalance);
