import { Dispatch, memo, SetStateAction, useContext, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa6';
import {
    calculateSecondaryDepositQty,
    getFormattedNumber,
} from '../../../../ambient-utils/dataLayer';
import { AppStateContext } from '../../../../contexts';
import { PoolContext } from '../../../../contexts/PoolContext';
import { RangeContext } from '../../../../contexts/RangeContext';
import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import { TradeTableContext } from '../../../../contexts/TradeTableContext';
import { TradeTokenContext } from '../../../../contexts/TradeTokenContext';
import { UserDataContext } from '../../../../contexts/UserDataContext';
import { FlexContainer, Text } from '../../../../styled/Common';
import { InputDisabledText } from '../../../../styled/Components/TradeModules';
import {
    linkGenMethodsIF,
    poolParamsIF,
    useLinkGen,
} from '../../../../utils/hooks/useLinkGen';
import { formatTokenInput } from '../../../../utils/numbers';
import TokenInputWithWalletBalance from '../../../Form/TokenInputWithWalletBalance';

interface propsIF {
    hidePlus?: boolean;
    tokenAInputQty: { value: string; set: Dispatch<SetStateAction<string>> };
    tokenBInputQty: { value: string; set: Dispatch<SetStateAction<string>> };
    isAmbient: boolean;
    depositSkew: number;
    poolPriceNonDisplay: number;
    isOutOfRange: boolean;
    isWithdrawFromDexChecked: { tokenA: boolean; tokenB: boolean };
    isInputDisabled: { tokenA: boolean; tokenB: boolean };
    toggleDexSelection: (tokenAorB: 'A' | 'B') => void;
    reverseTokens?: () => void;
    isMintLiqEnabled?: boolean;
    isInitPage?: boolean;
    amountToReduceNativeTokenQty: number;
}

function RangeTokenInput(props: propsIF) {
    const {
        tokenAInputQty: { value: tokenAInputQty, set: setTokenAInputQty },
        tokenBInputQty: { value: tokenBInputQty, set: setTokenBInputQty },
        isAmbient,
        depositSkew,
        poolPriceNonDisplay,
        isOutOfRange,
        isWithdrawFromDexChecked: {
            tokenA: isWithdrawTokenAFromDexChecked,
            tokenB: isWithdrawTokenBFromDexChecked,
        },
        isInputDisabled: {
            tokenA: isTokenAInputDisabled,
            tokenB: isTokenBInputDisabled,
        },
        toggleDexSelection,
        hidePlus,
        reverseTokens,
        isMintLiqEnabled = true,
        isInitPage,
        amountToReduceNativeTokenQty,
    } = props;

    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);
    const {
        tokenABalance,
        tokenBBalance,
        tokenADexBalance,
        tokenBDexBalance,
        isTokenABase,
        isTokenAEth,
        isTokenBEth,
    } = useContext(TradeTokenContext);
    const { showRangePulseAnimation } = useContext(TradeTableContext);
    const { poolData } = useContext(PoolContext);
    const { rangeTicksCopied, setRangeTicksCopied } = useContext(RangeContext);
    // hook to generate navigation actions with pre-loaded path
    const linkGenPool: linkGenMethodsIF = useLinkGen('pool');

    const { isUserConnected } = useContext(UserDataContext);

    const {
        tokenA,
        tokenB,
        isTokenAPrimary,
        setIsTokenAPrimary,
        setPrimaryQuantity,
    } = useContext(TradeDataContext);
    useEffect(() => {
        if (poolPriceNonDisplay) {
            updateTokenQty();
        }
    }, [poolPriceNonDisplay, depositSkew, tokenA.address]);

    const resetTokenQuantities = () => {
        setTokenAInputQty('');
        setTokenBInputQty('');
        setPrimaryQuantity('');
    };

    const setTokenQtyValue = (inputValue: string, primaryToken: 'A' | 'B') => {
        if (poolPriceNonDisplay === undefined) return;

        const qtyToken = calculateSecondaryDepositQty(
            poolPriceNonDisplay,
            tokenA.decimals,
            tokenB.decimals,
            inputValue,
            primaryToken === 'A',
            isTokenABase,
            isAmbient,
            depositSkew,
        );

        const truncatedTokenQty = qtyToken
            ? getFormattedNumber({
                  value: qtyToken,
                  isInput: true,
                  zeroDisplay: '0',
                  nullDisplay: '',
              })
            : '';

        if (primaryToken === 'A') {
            setTokenAInputQty(inputValue);
            setTokenBInputQty(truncatedTokenQty);
        } else {
            setTokenAInputQty(truncatedTokenQty);
            setTokenBInputQty(inputValue);
        }
    };

    const reverseTokensLocal = reverseTokens
        ? reverseTokens
        : (): void => {
              resetTokenQuantities();
              setIsTokenAPrimary(!isTokenAPrimary);
              if (!rangeTicksCopied && !isInitPage) {
                  // URL params for link to pool page
                  const poolLinkParams: poolParamsIF = {
                      chain: chainId,
                      tokenA: tokenB.address,
                      tokenB: tokenA.address,
                  };
                  // navigate user to pool page with URL params defined above
                  linkGenPool.navigate(poolLinkParams);
              }
              if (rangeTicksCopied) setRangeTicksCopied(false);
          };

    const handleTokenAChangeEvent = (value: string) => {
        setIsTokenAPrimary(true);
        setPrimaryQuantity(value);
        setTokenQtyValue(value, 'A');
    };

    const handleTokenBChangeEvent = (value: string) => {
        setIsTokenAPrimary(false);
        setPrimaryQuantity(value);
        setTokenQtyValue(value, 'B');
    };

    const updateTokenQty = () => {
        if (!isOutOfRange) {
            isTokenAPrimary
                ? setTokenQtyValue(tokenAInputQty, 'A')
                : setTokenQtyValue(tokenBInputQty, 'B');
        }
    };

    const disabledContent = (
        <InputDisabledText
            flexDirection='column'
            alignItems='center'
            justifyContent='center'
            fullHeight
            fullWidth
        >
            The market is outside your specified range.
            <Text color='accent1'>Single-asset deposit only.</Text>
        </InputDisabledText>
    );

    const usdValueTokenA = isTokenABase
        ? poolData.basePrice
        : poolData.quotePrice;
    const usdValueTokenB = isTokenABase
        ? poolData.quotePrice
        : poolData.basePrice;

    return (
        <FlexContainer flexDirection='column' gap={8}>
            <TokenInputWithWalletBalance
                fieldId='range_A'
                tokenAorB='A'
                token={tokenA}
                tokenInput={tokenAInputQty}
                tokenBalance={tokenABalance}
                tokenDexBalance={tokenADexBalance}
                isTokenEth={isTokenAEth}
                isDexSelected={isWithdrawTokenAFromDexChecked}
                showPulseAnimation={showRangePulseAnimation}
                handleTokenInputEvent={handleTokenAChangeEvent}
                reverseTokens={reverseTokensLocal}
                handleToggleDexSelection={() => toggleDexSelection('A')}
                parseTokenInput={(val: string, isMax?: boolean) => {
                    setTokenAInputQty(formatTokenInput(val, tokenA, isMax));
                }}
                showWallet={isUserConnected}
                disabledContent={
                    isTokenAInputDisabled && isMintLiqEnabled
                        ? disabledContent
                        : undefined
                }
                amountToReduceNativeTokenQty={amountToReduceNativeTokenQty}
                isInitPage={isInitPage}
                usdValue={usdValueTokenA}
            />
            <FlexContainer justifyContent='center' alignItems='center'>
                {!hidePlus && (
                    // the plus is a non-interactive divider; override the
                    // pointer cursor SVGs pick up so it doesn't read as clickable
                    <FaPlus
                        size={26}
                        color='var(--accent1)'
                        style={{ cursor: 'default' }}
                    />
                )}
            </FlexContainer>

            <TokenInputWithWalletBalance
                fieldId='range_B'
                tokenAorB='B'
                token={tokenB}
                tokenInput={tokenBInputQty}
                tokenBalance={tokenBBalance}
                tokenDexBalance={tokenBDexBalance}
                isTokenEth={isTokenBEth}
                isDexSelected={isWithdrawTokenBFromDexChecked}
                showPulseAnimation={showRangePulseAnimation}
                handleTokenInputEvent={handleTokenBChangeEvent}
                reverseTokens={reverseTokensLocal}
                handleToggleDexSelection={() => toggleDexSelection('B')}
                parseTokenInput={(val: string, isMax?: boolean) => {
                    setTokenBInputQty(formatTokenInput(val, tokenB, isMax));
                }}
                showWallet={isUserConnected}
                disabledContent={
                    isTokenBInputDisabled && isMintLiqEnabled
                        ? disabledContent
                        : undefined
                }
                amountToReduceNativeTokenQty={amountToReduceNativeTokenQty}
                isInitPage={isInitPage}
                isWithdraw
                usdValue={usdValueTokenB}
            />
        </FlexContainer>
    );
}

export default memo(RangeTokenInput);
