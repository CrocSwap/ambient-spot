import { memo, useContext, useEffect, useState } from 'react';

import RangeStatus from '../../../Global/RangeStatus/RangeStatus';
import SelectedRange from './SelectedRange/SelectedRange';

import {
    getUnicodeCharacter,
    uriToHttp,
} from '../../../../ambient-utils/dataLayer';
import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import { FlexContainer, GridContainer, Text } from '../../../../styled/Common';
import { FeeTierDisplay } from '../../../../styled/Components/TradeModules';
import TokenIcon from '../../../Global/TokenIcon/TokenIcon';
import TradeConfirmationSkeleton from '../../TradeModules/TradeConfirmationSkeleton';

interface propsIF {
    sendTransaction: () => Promise<void>;
    newRangeTransactionHash: string;
    spotPriceDisplay: string;
    maxPriceDisplay: string;
    minPriceDisplay: string;
    isTokenABase: boolean;
    isAmbient: boolean;
    isInRange: boolean;
    pinnedMinPriceDisplayTruncatedInBase: string;
    pinnedMinPriceDisplayTruncatedInQuote: string;
    pinnedMaxPriceDisplayTruncatedInBase: string;
    pinnedMaxPriceDisplayTruncatedInQuote: string;
    showConfirmation: boolean;
    txError: Error | undefined;
    resetConfirmation: () => void;
    isAdd: boolean;
    tokenAQty: string;
    tokenBQty: string;
    onClose: () => void;
    slippageTolerance: number;
    // for single-token ("zap") deposits: explains the preliminary swap
    zapDescription?: string;
    // for single-token ("zap") deposits: two-step swap→mint progress stepper
    zapStepper?: React.ReactNode;
}

function ConfirmRangeModal(props: propsIF) {
    const {
        sendTransaction,
        newRangeTransactionHash,
        isTokenABase,
        isAmbient,
        isInRange,
        pinnedMinPriceDisplayTruncatedInBase,
        pinnedMinPriceDisplayTruncatedInQuote,
        pinnedMaxPriceDisplayTruncatedInBase,
        pinnedMaxPriceDisplayTruncatedInQuote,
        txError,
        showConfirmation,
        resetConfirmation,
        isAdd,
        tokenAQty,
        tokenBQty,
        onClose = () => null,
        slippageTolerance,
        zapDescription,
        zapStepper,
    } = props;

    const { tokenA, tokenB, isDenomBase } = useContext(TradeDataContext);

    const [isDenomBaseLocalToRangeConfirm, setIsDenomBaseocalToRangeConfirm] =
        useState(isDenomBase);

    const tokenACharacter: string = getUnicodeCharacter(tokenA.symbol);
    const tokenBCharacter: string = getUnicodeCharacter(tokenB.symbol);

    // logic to prevent pool quantities updating during/after pool completion
    const [memoTokenAQty, setMemoTokenAQty] = useState<string | undefined>();
    const [memoTokenBQty, setMemoTokenBQty] = useState<string | undefined>();
    const [memoMinPriceBase, setMemoMinPriceBase] = useState<
        string | undefined
    >();
    const [memoMinPriceQuote, setMemoMinPriceQuote] = useState<
        string | undefined
    >();
    const [memoMaxPriceBase, setMemoMaxPriceBase] = useState<
        string | undefined
    >();
    const [memoMaxPriceQuote, setMemoMaxPriceQuote] = useState<
        string | undefined
    >();
    const [memoIsAdd, setMemoIsAdd] = useState<boolean>(isAdd);

    useEffect(() => {
        if (showConfirmation === false) {
            setMemoTokenAQty(tokenAQty);
            setMemoTokenBQty(tokenBQty);
            setMemoMinPriceBase(pinnedMinPriceDisplayTruncatedInBase);
            setMemoMinPriceQuote(pinnedMinPriceDisplayTruncatedInQuote);
            setMemoMaxPriceBase(pinnedMaxPriceDisplayTruncatedInBase);
            setMemoMaxPriceQuote(pinnedMaxPriceDisplayTruncatedInQuote);
            setMemoIsAdd(isAdd);
        }
    }, [
        showConfirmation,
        tokenAQty,
        tokenBQty,
        pinnedMinPriceDisplayTruncatedInBase,
        pinnedMinPriceDisplayTruncatedInQuote,
        pinnedMaxPriceDisplayTruncatedInBase,
        pinnedMaxPriceDisplayTruncatedInQuote,
        isAdd,
    ]);

    const poolTokenDisplay = (
        <>
            <FlexContainer
                justifyContent='space-between'
                alignItems='center'
                padding='8px 0'
            >
                <FlexContainer alignItems='center' gap={8}>
                    <FlexContainer alignItems='center' gap={8}>
                        <TokenIcon
                            token={tokenA}
                            src={uriToHttp(tokenA.logoURI)}
                            alt={tokenA.symbol}
                            size='2xl'
                        />
                        <TokenIcon
                            token={tokenB}
                            src={uriToHttp(tokenB.logoURI)}
                            alt={tokenB.symbol}
                            size='2xl'
                        />
                    </FlexContainer>
                    <Text fontSize='header2' color='text1'>
                        {tokenA.symbol}/{tokenB.symbol}
                    </Text>
                </FlexContainer>
                <RangeStatus
                    isInRange={isInRange}
                    isEmpty={false}
                    isAmbient={isAmbient}
                />
            </FlexContainer>
            {zapDescription && (
                <Text
                    fontSize='body'
                    color='text2'
                    style={{ padding: '4px 0' }}
                >
                    {zapDescription}
                </Text>
            )}
            <FeeTierDisplay>
                <GridContainer gap={12}>
                    <FlexContainer justifyContent='space-between'>
                        <FlexContainer alignItems='center' gap={8}>
                            <TokenIcon
                                token={tokenA}
                                src={uriToHttp(tokenA.logoURI)}
                                alt={tokenA.symbol}
                                size='m'
                            />
                            <Text fontSize='body'>{tokenA.symbol}</Text>
                        </FlexContainer>
                        <Text fontSize='body'>
                            {memoTokenAQty !== ''
                                ? (zapDescription ? '≈ ' : '') +
                                  tokenACharacter +
                                  memoTokenAQty
                                : '0'}
                        </Text>
                    </FlexContainer>
                    <FlexContainer justifyContent='space-between'>
                        <FlexContainer alignItems='center' gap={8}>
                            <TokenIcon
                                token={tokenB}
                                src={uriToHttp(tokenB.logoURI)}
                                alt={tokenB.symbol}
                                size='m'
                            />
                            <Text fontSize='body'>{tokenB.symbol}</Text>
                        </FlexContainer>
                        <Text fontSize='body'>
                            {memoTokenBQty
                                ? (zapDescription ? '≈ ' : '') +
                                  tokenBCharacter +
                                  memoTokenBQty
                                : '0'}
                        </Text>
                    </FlexContainer>
                </GridContainer>
            </FeeTierDisplay>

            {
                <SelectedRange
                    isDenomBase={isDenomBaseLocalToRangeConfirm}
                    setIsDenomBase={setIsDenomBaseocalToRangeConfirm}
                    isTokenABase={isTokenABase}
                    isAmbient={isAmbient}
                    pinnedMinPriceDisplayTruncatedInBase={memoMinPriceBase}
                    pinnedMinPriceDisplayTruncatedInQuote={memoMinPriceQuote}
                    pinnedMaxPriceDisplayTruncatedInBase={memoMaxPriceBase}
                    pinnedMaxPriceDisplayTruncatedInQuote={memoMaxPriceQuote}
                    slippageTolerance={slippageTolerance}
                />
            }
        </>
    );

    return (
        <TradeConfirmationSkeleton
            type='Range'
            tokenA={{ token: tokenA, quantity: memoTokenAQty }}
            tokenB={{ token: tokenB, quantity: memoTokenBQty }}
            transactionHash={newRangeTransactionHash}
            txError={txError}
            showConfirmation={showConfirmation}
            poolTokenDisplay={poolTokenDisplay}
            statusText={
                !showConfirmation
                    ? memoIsAdd
                        ? `Add ${isAmbient ? 'Ambient' : ''} Liquidity`
                        : `Submit ${isAmbient ? 'Ambient' : ''} Liquidity`
                    : memoIsAdd
                      ? `Adding ${memoTokenAQty ? memoTokenAQty : '0'} ${
                            tokenA.symbol
                        } and ${memoTokenBQty ? memoTokenBQty : '0'} ${
                            tokenB.symbol
                        }`
                      : `Minting a Position with ${
                            memoTokenAQty ? memoTokenAQty : '0'
                        } ${tokenA.symbol} and ${
                            memoTokenBQty ? memoTokenBQty : '0'
                        } ${tokenB.symbol}`
            }
            initiate={sendTransaction}
            resetConfirmation={resetConfirmation}
            onClose={onClose}
            extraNotes={showConfirmation ? zapStepper : undefined}
        />
    );
}

export default memo(ConfirmRangeModal);
