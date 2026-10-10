import { memo, useContext } from 'react';
import { getFormattedNumber } from '../../../../ambient-utils/dataLayer';
import { TokenIF } from '../../../../ambient-utils/types';
import { UserDataContext } from '../../../../contexts/UserDataContext';
import { FlexContainer, Text } from '../../../../styled/Common';
import { formatTokenInput } from '../../../../utils/numbers';
import TokenInputWithWalletBalance from '../../../Form/TokenInputWithWalletBalance';

interface propsIF {
    // the single token the user deposits
    token: TokenIF;
    // the other pool token the deposit will be partially swapped into
    counterpartToken: TokenIF;
    tokenBalance: string;
    tokenDexBalance: string;
    isTokenEth: boolean;
    isDexSelected: boolean;
    toggleDexSelection: () => void;
    qty: { value: string; set: (val: string) => void };
    reverseTokens: () => void;
    usdValue: number | undefined;
    amountToReduceNativeTokenQty: number;
    // estimated amount of the counterpart token the swap will produce
    estimatedCounterpartQty: number | null;
}

// Single-token ("zap") deposit input. The user enters one amount; the mint
// flow swaps the correct portion into the counterpart token automatically, so
// only one input is shown. The token selector (reverseTokens) still lets the
// user switch between the two pool tokens.
function RangeZapTokenInput(props: propsIF) {
    const {
        token,
        counterpartToken,
        tokenBalance,
        tokenDexBalance,
        isTokenEth,
        isDexSelected,
        toggleDexSelection,
        qty,
        reverseTokens,
        usdValue,
        amountToReduceNativeTokenQty,
        estimatedCounterpartQty,
    } = props;

    const { isUserConnected } = useContext(UserDataContext);

    const estimatedCounterpartDisplay =
        estimatedCounterpartQty && parseFloat(qty.value) > 0
            ? getFormattedNumber({
                  value: estimatedCounterpartQty,
                  isInput: true,
              })
            : undefined;

    return (
        <FlexContainer flexDirection='column' gap={8}>
            <TokenInputWithWalletBalance
                fieldId='range_zap'
                tokenAorB='A'
                token={token}
                tokenInput={qty.value}
                tokenBalance={tokenBalance}
                tokenDexBalance={tokenDexBalance}
                isTokenEth={isTokenEth}
                isDexSelected={isDexSelected}
                showPulseAnimation={false}
                handleTokenInputEvent={(val: string) => qty.set(val)}
                reverseTokens={reverseTokens}
                handleToggleDexSelection={toggleDexSelection}
                parseTokenInput={(val: string, isMax?: boolean) => {
                    qty.set(formatTokenInput(val, token, isMax));
                }}
                showWallet={isUserConnected}
                amountToReduceNativeTokenQty={amountToReduceNativeTokenQty}
                usdValue={usdValue}
            />
            <Text
                fontSize='body'
                color='text2'
                style={{ padding: '0 8px', textAlign: 'center' }}
            >
                Your {token.symbol} will be automatically balanced into{' '}
                {token.symbol} and {counterpartToken.symbol} to fund this
                position
                {estimatedCounterpartDisplay
                    ? ` (≈ ${estimatedCounterpartDisplay} ${counterpartToken.symbol}).`
                    : '.'}
            </Text>
        </FlexContainer>
    );
}

export default memo(RangeZapTokenInput);
