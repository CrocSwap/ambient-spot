import {
    bigIntToFloat,
    CrocImpact,
    fromDisplayQty,
    toDisplayQty,
} from '@crocswap-libs/sdk';
import { memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    getFormattedNumber,
    getPriceImpactString,
    isStablePair,
    performFastLaneSwap,
    performSwap,
    waitForTransaction,
} from '../../../../ambient-utils/dataLayer';
import Button from '../../../../components/Form/Button';
import { useModal } from '../../../../components/Global/Modal/useModal';
import TooltipComponent from '../../../../components/Global/TooltipComponent/TooltipComponent';
import ConfirmSwapModal from '../../../../components/Swap/ConfirmSwapModal/ConfirmSwapModal';
import SwapExtraInfo from '../../../../components/Swap/SwapExtraInfo/SwapExtraInfo';
import SwapTokenInput from '../../../../components/Swap/SwapTokenInput/SwapTokenInput';
import SubmitTransaction from '../../../../components/Trade/TradeModules/SubmitTransaction/SubmitTransaction';
import TradeModuleHeader from '../../../../components/Trade/TradeModules/TradeModuleHeader';
import { TradeModuleSkeleton } from '../../../../components/Trade/TradeModules/TradeModuleSkeleton';

import { ChainDataContext } from '../../../../contexts/ChainDataContext';
import { CrocEnvContext } from '../../../../contexts/CrocEnvContext';
import {
    trackSwap,
    TxOutcome,
    txOutcomeFromError,
    txOutcomeFromReceipt,
} from '../../../../utils/analytics';
import { PoolContext } from '../../../../contexts/PoolContext';
import { TokenContext } from '../../../../contexts/TokenContext';
import { TradeTokenContext } from '../../../../contexts/TradeTokenContext';
import { UserPreferenceContext } from '../../../../contexts/UserPreferenceContext';
import { FlexContainer } from '../../../../styled/Common';
import { WarningContainer } from '../../../../styled/Components/TradeModules';

import { ethers } from 'ethers';
import {
    ATLAS_ROUTER_ADDRESS,
    GAS_DROPS_ESTIMATE_SWAP_FROM_DEX,
    GAS_DROPS_ESTIMATE_SWAP_FROM_WALLET_TO_DEX,
    GAS_DROPS_ESTIMATE_SWAP_FROM_WALLET_TO_WALLET,
    GAS_DROPS_ESTIMATE_SWAP_NATIVE,
    GAS_DROPS_ESTIMATE_SWAP_TO_FROM_DEX,
    HIDE_TOKEN_VALUES,
    L1_GAS_CALC_ENABLED,
    NUM_GWEI_IN_ETH,
    NUM_GWEI_IN_WEI,
    NUM_WEI_IN_GWEI,
    SWAP_BUFFER_MULTIPLIER_L2,
    SWAP_BUFFER_MULTIPLIER_MAINNET,
    ZERO_ADDRESS,
} from '../../../../ambient-utils/constants';
import { MAINNET_TOKENS } from '../../../../ambient-utils/constants/networks/ethereumMainnet';
import { useApprove } from '../../../../App/functions/approve';
import { calcL1Gas } from '../../../../App/functions/calcL1Gas';
import useDebounce from '../../../../App/hooks/useDebounce';
import { AppStateContext } from '../../../../contexts';
import { GraphDataContext } from '../../../../contexts/GraphDataContext';
import { ReceiptContext } from '../../../../contexts/ReceiptContext';
import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import { UserDataContext } from '../../../../contexts/UserDataContext';
import { useUrlParams } from '../../../../utils/hooks/useUrlParams';

interface propsIF {
    isOnTradeRoute?: boolean;
}

function Swap(props: propsIF) {
    const { isOnTradeRoute } = props;
    const { crocEnv, provider } = useContext(CrocEnvContext);
    const {
        activeNetwork: { chainId, poolIndex, displayName: chainDisplayName },
        isUserOnline,
    } = useContext(AppStateContext);
    const { userAddress } = useContext(UserDataContext);
    const {
        gasPriceInGwei,
        nativeTokenUsdPrice,
        isActiveNetworkL2,
        isActiveNetworkPlume,
        isActiveNetworkMainnet,
    } = useContext(ChainDataContext);
    const { isPoolInitialized, poolData } = useContext(PoolContext);
    const { tokens } = useContext(TokenContext);

    const {
        tokenAAllowance,
        tokenABalance,
        tokenADexBalance,
        fastLaneProtection,
    } = useContext(TradeTokenContext);
    const { swapSlippage, dexBalSwap, bypassConfirmSwap } = useContext(
        UserPreferenceContext,
    );
    const {
        addPendingTx,
        addReceipt,
        addTransactionByType,
        removePendingTx,
        updateTransactionHash,
        pendingTransactions,
    } = useContext(ReceiptContext);

    // get URL pathway for user relative to index
    const { pathname } = useLocation();
    !pathname.includes('/trade') && useUrlParams(tokens, chainId, provider);

    const [isModalOpen, openModal, closeModal] = useModal();
    // use URL pathway to determine if user is in swap or market page
    // depending on location we pull data on the tx in progress differently
    // TODO: confirm this doesn't break data that needs to be different when on trade page
    const { liquidityFee } = useContext(GraphDataContext);
    const {
        tokenA,
        tokenB,
        baseToken,
        quoteToken,
        isTokenAPrimary,
        isDenomBase,
        primaryQuantity,
        setPrimaryQuantity,
        areDefaultTokensUpdatedForChain,
        isTokenABase,
    } = useContext(TradeDataContext);

    const [sellQtyString, setSellQtyString] = useState<string>(
        isTokenAPrimary ? primaryQuantity : '',
    );
    const [buyQtyString, setBuyQtyString] = useState<string>(
        !isTokenAPrimary ? primaryQuantity : '',
    );

    const sellQtyBigInt = useMemo(
        () => fromDisplayQty(sellQtyString || '0', tokenA.decimals),
        [sellQtyString, tokenA.decimals],
    );

    const sellQtyNoExponentString = useMemo(() => {
        return sellQtyString.includes('e')
            ? toDisplayQty(sellQtyBigInt, tokenA.decimals)
            : sellQtyString;
    }, [sellQtyBigInt, sellQtyString, tokenA.decimals]);

    const buyQtyBigInt = useMemo(
        () => fromDisplayQty(buyQtyString || '0', tokenB.decimals),
        [buyQtyString, tokenB.decimals],
    );
    const buyQtyNoExponentString = useMemo(() => {
        return buyQtyString.includes('e')
            ? toDisplayQty(buyQtyBigInt, tokenB.decimals)
            : buyQtyString;
    }, [buyQtyBigInt, buyQtyString, tokenB.decimals]);

    const [isSellLoading, setIsSellLoading] = useState(false);
    const [isBuyLoading, setIsBuyLoading] = useState(false);
    const [swapAllowed, setSwapAllowed] = useState<boolean>(
        primaryQuantity !== '',
    );

    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
    const [isLiquidityInsufficient, setIsLiquidityInsufficient] =
        useState<boolean>(false);
    // hooks to track whether user will use dex or wallet funds in transaction, this is
    // ... abstracted away from the central hook because the hook manages preference
    // ... and does not consider whether dex balance is sufficient
    const [isWithdrawFromDexChecked, setIsWithdrawFromDexChecked] =
        useState<boolean>(false);
    const [isSaveAsDexSurplusChecked, setIsSaveAsDexSurplusChecked] =
        useState<boolean>(dexBalSwap.outputToDexBal.isEnabled);

    const [newSwapTransactionHash, setNewSwapTransactionHash] = useState('');
    const [txError, setTxError] = useState<Error>();
    const [swapButtonErrorMessage, setSwapButtonErrorMessage] =
        useState<string>('');

    const [lastImpactQuery, setLastImpactQuery] = useState<
        | {
              input: string;
              isInputSell: boolean;
              impact: CrocImpact | undefined;
          }
        | undefined
    >();

    const priceImpact = useMemo(() => {
        return lastImpactQuery ? lastImpactQuery.impact : undefined;
    }, [lastImpactQuery]);

    useEffect(() => {
        if (primaryQuantity === '') {
            setLastImpactQuery(undefined);
        }
    }, [primaryQuantity]);
    const [swapGasPriceinDollars, setSwapGasPriceinDollars] = useState<
        string | undefined
    >();

    const slippageTolerancePercentage = isStablePair(
        tokenA.address,
        tokenB.address,
        chainId,
    )
        ? swapSlippage.stable
        : swapSlippage.volatile;

    const effectivePrice =
        parseFloat(priceImpact?.buyQty || '0') /
        parseFloat(priceImpact?.sellQty || '1');
    const isPriceInverted =
        (isDenomBase && !isTokenABase) || (!isDenomBase && isTokenABase);
    const effectivePriceWithDenom = effectivePrice
        ? isPriceInverted
            ? 1 / effectivePrice
            : effectivePrice
        : undefined;
    const priceImpactNum = !priceImpact?.percentChange
        ? undefined
        : Math.abs(priceImpact.percentChange) * 100;

    const [priceImpactNumMemo, setPriceImpactNumMemo] = useState<
        number | undefined
    >();

    useEffect(() => {
        setPriceImpactNumMemo(priceImpactNum);
    }, [priceImpactNum]);

    const tokenASurplusMinusTokenARemainderNum = useMemo(() => {
        try {
            return (
                fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) -
                fromDisplayQty(sellQtyNoExponentString || '0', tokenA.decimals)
            );
        } catch (error) {
            console.log({ error });
            return 0n;
        }
    }, [tokenADexBalance, sellQtyNoExponentString]);

    const isTokenADexSurplusSufficient =
        tokenASurplusMinusTokenARemainderNum >= 0;

    const tokenAQtyCoveredByWalletBalance = useMemo(() => {
        try {
            return isWithdrawFromDexChecked
                ? tokenASurplusMinusTokenARemainderNum < 0
                    ? tokenASurplusMinusTokenARemainderNum * -1n
                    : 0n
                : fromDisplayQty(
                      sellQtyNoExponentString || '0',
                      tokenA.decimals,
                  );
        } catch (error) {
            console.log({ error });
            return 0n;
        }
    }, [
        sellQtyNoExponentString,
        tokenASurplusMinusTokenARemainderNum,
        isWithdrawFromDexChecked,
        tokenA.decimals,
    ]);

    const isTokenAWalletBalanceSufficient =
        fromDisplayQty(tokenABalance || '0', tokenA.decimals) >=
        tokenAQtyCoveredByWalletBalance;

    const isTokenAAllowanceSufficient =
        tokenAAllowance === undefined
            ? true
            : tokenAAllowance >= tokenAQtyCoveredByWalletBalance;

    const isUsdtResetRequired = useMemo(() => {
        return (
            tokenA.address.toLowerCase() ===
                MAINNET_TOKENS.USDT.address.toLowerCase() &&
            !!tokenAAllowance &&
            tokenAAllowance < tokenAQtyCoveredByWalletBalance
        );
    }, [tokenA.address, tokenAAllowance, tokenAQtyCoveredByWalletBalance]);

    // values if either token needs to be confirmed before transacting
    const needConfirmTokenA = useMemo(() => {
        return !tokens.verify(tokenA.address);
    }, [tokenA.address, tokens]);
    const needConfirmTokenB = useMemo(() => {
        return !tokens.verify(tokenB.address);
    }, [tokenB.address, tokens]);

    // value showing if no acknowledgement is necessary
    const areBothAckd: boolean =
        areDefaultTokensUpdatedForChain &&
        !needConfirmTokenA &&
        !needConfirmTokenB;

    const isSellTokenNativeToken = tokenA.address === ZERO_ADDRESS;

    const [
        amountToReduceNativeTokenQtyMainnet,
        setAmountToReduceNativeTokenQtyMainnet,
    ] = useState<number>(0.001);
    const [amountToReduceNativeTokenQtyL2, setAmountToReduceNativeTokenQtyL2] =
        useState<number>(0.0003);

    const amountToReduceNativeTokenQty =
        chainId === '0x82750' || chainId === '0x8274f'
            ? amountToReduceNativeTokenQtyL2
            : amountToReduceNativeTokenQtyMainnet;

    const activeTxHash = useRef<string>('');

    const activeTxHashInPendingTxs = pendingTransactions.some(
        (tx) => tx === activeTxHash.current,
    );

    // reset activeTxHash when the pair changes or user updates quantity
    useEffect(() => {
        activeTxHash.current = '';
    }, [tokenA.address + tokenB.address, primaryQuantity]);

    useEffect(() => {
        if (isTokenAPrimary && isSellLoading) {
            setIsSellLoading(false);
        } else if (!isTokenAPrimary && isBuyLoading) {
            setIsBuyLoading(false);
        }
    }, [isTokenAPrimary]);

    useEffect(() => {
        if (!isUserOnline) {
            setSwapAllowed(false);
            setSwapButtonErrorMessage('Currently Offline');
            return;
        }
        if (tokenABalance === '') return;
        if (
            (sellQtyNoExponentString === '' && buyQtyNoExponentString === '') ||
            (isTokenAPrimary &&
                !isBuyLoading &&
                (isNaN(parseFloat(sellQtyNoExponentString)) ||
                    parseFloat(sellQtyNoExponentString) <= 0)) ||
            (!isTokenAPrimary &&
                !isSellLoading &&
                (isNaN(parseFloat(buyQtyNoExponentString)) ||
                    parseFloat(buyQtyNoExponentString) <= 0))
        ) {
            setSwapAllowed(false);
            setSwapButtonErrorMessage('Enter an Amount');
            if (
                isBuyLoading &&
                (sellQtyNoExponentString === '' ||
                    parseFloat(sellQtyNoExponentString) <= 0)
            ) {
                setIsBuyLoading(false);
                setLastImpactQuery(undefined);
            } else if (
                isSellLoading &&
                (buyQtyString === '' || parseFloat(buyQtyNoExponentString) <= 0)
            ) {
                setIsSellLoading(false);
                setLastImpactQuery(undefined);
            }
        } else if (isPoolInitialized === false) {
            setSwapAllowed(false);
            setSwapButtonErrorMessage('Pool Not Initialized');
        } else if (isSellLoading || isBuyLoading) {
            setSwapAllowed(false);
            setSwapButtonErrorMessage('...');
        } else if (isLiquidityInsufficient) {
            setSwapAllowed(false);
            setSwapButtonErrorMessage('Liquidity Insufficient');
        } else {
            const hurdleBigInt = isWithdrawFromDexChecked
                ? fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) +
                  fromDisplayQty(tokenABalance || '0', tokenA.decimals)
                : fromDisplayQty(tokenABalance || '0', tokenA.decimals);

            const balanceLabel = isWithdrawFromDexChecked
                ? 'Combined Wallet and Exchange'
                : 'Wallet';

            setSwapAllowed(
                fromDisplayQty(
                    sellQtyNoExponentString || '0',
                    tokenA.decimals,
                ) <= hurdleBigInt,
            );

            if (
                fromDisplayQty(
                    sellQtyNoExponentString || '0',
                    tokenA.decimals,
                ) > hurdleBigInt
            ) {
                if (activeTxHashInPendingTxs) {
                    setSellQtyString('');
                    setBuyQtyString('');
                    setPrimaryQuantity('');
                    activeTxHash.current = '';
                    setSwapButtonErrorMessage('');
                } else {
                    setSwapButtonErrorMessage(
                        `${tokenA.symbol} Amount Exceeds ${balanceLabel} Balance`,
                    );
                    setSwapAllowed(false);
                }
            } else if (
                isSellTokenNativeToken &&
                tokenAQtyCoveredByWalletBalance +
                    fromDisplayQty(
                        amountToReduceNativeTokenQty.toString(),
                        tokenA.decimals,
                    ) >
                    fromDisplayQty(tokenABalance, tokenA.decimals)
            ) {
                setSwapAllowed(false);
                setSwapButtonErrorMessage(
                    `${tokenA.symbol} Wallet Balance Insufficient to Cover Gas`,
                );
            } else {
                setSwapAllowed(true);
            }
        }
    }, [
        isUserOnline,
        crocEnv,
        isPoolInitialized,
        isPoolInitialized === undefined, // Needed to distinguish false from undefined
        tokenA.address,
        tokenB.address,
        buyQtyNoExponentString,
        sellQtyNoExponentString,
        isWithdrawFromDexChecked,
        isBuyLoading,
        isSellLoading,
        isSellTokenNativeToken,
        tokenABalance,
        tokenAQtyCoveredByWalletBalance,
        amountToReduceNativeTokenQty,
        activeTxHashInPendingTxs,
        isTokenAPrimary,
    ]);

    useEffect(() => {
        if (parseFloat(primaryQuantity) === 0) return;
        if (isTokenAPrimary) {
            setIsBuyLoading(true);
            setSwapButtonErrorMessage('...');
            setBuyQtyString('');
        } else {
            setIsSellLoading(true);
            setSwapButtonErrorMessage('...');
            setSellQtyString('');
        }
    }, [tokenA.address + tokenB.address, isTokenAPrimary]);

    useEffect(() => {
        resetConfirmation();
    }, [baseToken.address + quoteToken.address]);

    const [l1GasFeeSwapInGwei, setL1GasFeeSwapInGwei] = useState<number>(
        isActiveNetworkL2 ? 10000 : 0,
    );
    const [extraL1GasFeeSwap, setExtraL1GasFeeSwap] = useState(
        isActiveNetworkL2 ? 0.01 : 0,
    );

    // calculate price of gas for swap
    useEffect(() => {
        if (gasPriceInGwei && nativeTokenUsdPrice) {
            const averageSwapCostInGasDrops = isSellTokenNativeToken
                ? GAS_DROPS_ESTIMATE_SWAP_NATIVE
                : isWithdrawFromDexChecked
                  ? isTokenADexSurplusSufficient
                      ? isSaveAsDexSurplusChecked
                          ? GAS_DROPS_ESTIMATE_SWAP_TO_FROM_DEX
                          : GAS_DROPS_ESTIMATE_SWAP_FROM_DEX
                      : isSaveAsDexSurplusChecked
                        ? GAS_DROPS_ESTIMATE_SWAP_FROM_WALLET_TO_DEX
                        : GAS_DROPS_ESTIMATE_SWAP_FROM_WALLET_TO_WALLET
                  : isSaveAsDexSurplusChecked
                    ? GAS_DROPS_ESTIMATE_SWAP_FROM_WALLET_TO_DEX
                    : GAS_DROPS_ESTIMATE_SWAP_FROM_WALLET_TO_WALLET;

            const costOfMainnetSwapInETH =
                gasPriceInGwei * averageSwapCostInGasDrops * NUM_GWEI_IN_WEI;

            setAmountToReduceNativeTokenQtyMainnet(
                SWAP_BUFFER_MULTIPLIER_MAINNET * costOfMainnetSwapInETH,
            );
            const l1costOfScrollSwapInETH =
                l1GasFeeSwapInGwei / NUM_GWEI_IN_ETH;

            const l2costOfScrollSwapInETH =
                gasPriceInGwei * averageSwapCostInGasDrops * NUM_GWEI_IN_WEI;
            const costOfScrollSwapInETH =
                l1costOfScrollSwapInETH + l2costOfScrollSwapInETH;

            setAmountToReduceNativeTokenQtyL2(
                SWAP_BUFFER_MULTIPLIER_L2 * costOfScrollSwapInETH,
            );

            const gasPriceInDollarsNum =
                gasPriceInGwei *
                averageSwapCostInGasDrops *
                NUM_GWEI_IN_WEI *
                nativeTokenUsdPrice;

            setSwapGasPriceinDollars(
                getFormattedNumber({
                    value: gasPriceInDollarsNum + extraL1GasFeeSwap,
                    isUSD: true,
                }),
            );
        }
    }, [
        gasPriceInGwei,
        nativeTokenUsdPrice,
        isSellTokenNativeToken,
        isWithdrawFromDexChecked,
        isTokenADexSurplusSufficient,
        isSaveAsDexSurplusChecked,
        extraL1GasFeeSwap,
        l1GasFeeSwapInGwei,
    ]);

    useEffect(() => {
        (async () => {
            if (!crocEnv || !L1_GAS_CALC_ENABLED) return;

            const qty = isTokenAPrimary
                ? sellQtyNoExponentString.replaceAll(',', '')
                : buyQtyNoExponentString.replaceAll(',', '');

            if (qty === '' || parseFloat(qty) === 0) return;
            const l1Gas = userAddress
                ? await calcL1Gas({
                      crocEnv,
                      isQtySell: isTokenAPrimary,
                      qty,
                      buyTokenAddress: tokenB.address,
                      sellTokenAddress: tokenA.address,
                      slippageTolerancePercentage,
                      isWithdrawFromDexChecked,
                      isSaveAsDexSurplusChecked,
                  })
                : undefined;

            const costOfNativeTokenInCents = BigInt(
                Math.floor((nativeTokenUsdPrice || 0) * 100),
            );
            const l1GasInGwei =
                l1Gas && l1Gas != BigInt(0)
                    ? l1Gas / BigInt(NUM_WEI_IN_GWEI)
                    : undefined;
            l1GasInGwei &&
                setL1GasFeeSwapInGwei(bigIntToFloat(l1GasInGwei) || 0);

            const l1GasCents = l1GasInGwei
                ? (l1GasInGwei * costOfNativeTokenInCents) /
                  BigInt(NUM_GWEI_IN_ETH)
                : undefined;

            const l1GasDollarsNum =
                l1GasCents !== undefined
                    ? bigIntToFloat(l1GasCents) / 100
                    : undefined;
            if (l1GasDollarsNum !== undefined) {
                setExtraL1GasFeeSwap(l1GasDollarsNum + 0.01);
            }
        })();
    }, [
        crocEnv,
        isTokenAPrimary,
        sellQtyNoExponentString,
        buyQtyNoExponentString,
        tokenA.address,
        tokenB.address,
        slippageTolerancePercentage,
        isWithdrawFromDexChecked,
        isSaveAsDexSurplusChecked,
        nativeTokenUsdPrice,
        L1_GAS_CALC_ENABLED,
    ]);

    useEffect(() => {
        if (
            fastLaneProtection?.isEnabled &&
            fastLaneProtection.isChainAccepted
        ) {
            setIsWithdrawFromDexChecked(false);
            dexBalSwap?.outputToDexBal.disable();
        } else {
            setIsWithdrawFromDexChecked(
                fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) > 0n,
            );
            setIsSaveAsDexSurplusChecked(dexBalSwap?.outputToDexBal.isEnabled);
        }
    }, [
        tokenADexBalance,
        fastLaneProtection?.isEnabled,
        dexBalSwap?.outputToDexBal.isEnabled,
        fastLaneProtection.isChainAccepted,
    ]);

    const resetConfirmation = () => {
        setShowConfirmation(false);
        setTxError(undefined);
        setNewSwapTransactionHash('');
    };

    async function initiateSwap() {
        resetConfirmation();

        setShowConfirmation(true);
        if (!crocEnv) return;

        const qty = isTokenAPrimary
            ? sellQtyNoExponentString
            : buyQtyNoExponentString;

        const isQtySell = isTokenAPrimary;
        const isFastLane = !!(
            fastLaneProtection.isEnabled && fastLaneProtection?.isChainAccepted
        );
        // captured at submission so the event describes what the user sent
        const trackSwapOutcome = (outcome: TxOutcome) =>
            trackSwap({
                outcome,
                source: 'swap-form',
                fastLane: isFastLane,
                fromExchangeBalance: isWithdrawFromDexChecked,
                toExchangeBalance: isSaveAsDexSurplusChecked,
                chain: chainDisplayName,
            });

        let tx;
        try {
            const sellTokenAddress = tokenA.address;
            const buyTokenAddress = tokenB.address;

            tx = await (isFastLane
                ? performFastLaneSwap({
                      crocEnv,
                      isQtySell,
                      qty,
                      buyTokenAddress,
                      sellTokenAddress,
                      slippageTolerancePercentage,
                      isWithdrawFromDexChecked,
                      isSaveAsDexSurplusChecked,
                  })
                : performSwap({
                      crocEnv,
                      isQtySell,
                      qty,
                      buyTokenAddress,
                      sellTokenAddress,
                      slippageTolerancePercentage,
                      isWithdrawFromDexChecked,
                      isSaveAsDexSurplusChecked,
                  }));
            activeTxHash.current = tx?.hash;
            setNewSwapTransactionHash(tx?.hash);
            addPendingTx(tx?.hash);

            if (tx.hash) {
                addTransactionByType({
                    chainId: chainId,
                    userAddress: userAddress || '',
                    txHash: tx.hash,
                    txAction:
                        buyTokenAddress.toLowerCase() ===
                        quoteToken.address.toLowerCase()
                            ? 'Buy'
                            : 'Sell',
                    txType: 'Market',
                    txDescription: `Swap ${tokenA.symbol}→${tokenB.symbol}`,
                    txDetails: {
                        baseAddress: baseToken.address,
                        quoteAddress: quoteToken.address,
                        poolIdx: poolIndex,
                        baseSymbol: baseToken.symbol,
                        quoteSymbol: quoteToken.symbol,
                        isBid: isTokenABase,
                    },
                });
            }
        } catch (error) {
            console.log({ error });
            setTxError(error);
            trackSwapOutcome(txOutcomeFromError(error));
        }

        if (tx) {
            let receipt;
            try {
                receipt = await waitForTransaction(
                    provider,
                    tx.hash,
                    removePendingTx,
                    addPendingTx,
                    updateTransactionHash,
                    setNewSwapTransactionHash,
                );
            } catch (e) {
                console.log({ e });
            }

            if (receipt) {
                addReceipt(receipt);
                removePendingTx(receipt.hash);
            }
            trackSwapOutcome(receipt ? txOutcomeFromReceipt(receipt) : 'error');
        }
    }

    const handleModalOpen = () => {
        resetConfirmation();
        openModal();
    };

    const handleModalClose = () => {
        resetConfirmation();
        closeModal();
    };

    const { approve, isApprovalPending } = useApprove();

    const toggleDexSelection = (tokenAorB: 'A' | 'B') => {
        if (
            fastLaneProtection?.isEnabled &&
            fastLaneProtection.isChainAccepted
        ) {
            // Show tooltip message
            return;
        }

        if (tokenAorB === 'A') {
            setIsWithdrawFromDexChecked(!isWithdrawFromDexChecked);
        } else {
            if (isSaveAsDexSurplusChecked) dexBalSwap.outputToDexBal.disable();
            else dexBalSwap.outputToDexBal.enable();
            setIsSaveAsDexSurplusChecked(!isSaveAsDexSurplusChecked);
        }
    };

    useEffect(() => {
        if (dexBalSwap.outputToDexBal.isEnabled) {
            setIsSaveAsDexSurplusChecked(true);
        } else {
            setIsSaveAsDexSurplusChecked(false);
        }
    }, [dexBalSwap.outputToDexBal.isEnabled]);

    // logic to acknowledge one or both tokens as necessary
    const ackAsNeeded = (): void => {
        needConfirmTokenA && tokens.acknowledge(tokenA);
        needConfirmTokenB && tokens.acknowledge(tokenB);
    };

    const liquidityInsufficientWarning = isLiquidityInsufficient ? (
        <WarningContainer
            flexDirection='row'
            justifyContent='space-between'
            alignItems='center'
            fontSize='body'
            color='other-red'
            padding='4px 8px'
        >
            <div>Pool Liquidity is Insufficient for this Swap</div>
            <TooltipComponent
                title='Current Pool Liquidity is Insufficient for this Swap'
                placement='bottom'
            />
        </WarningContainer>
    ) : undefined;

    const isButtonDisabled =
        (!swapAllowed || sellQtyString === '' || buyQtyString === '') &&
        areBothAckd;

    const priceImpactWarning =
        !isLiquidityInsufficient &&
        priceImpactNumMemo &&
        priceImpactNumMemo > 2 &&
        !(isButtonDisabled && swapButtonErrorMessage === 'Enter an Amount') ? (
            <WarningContainer
                flexDirection='row'
                justifyContent='space-between'
                alignItems='center'
                fontSize='body'
                color='other-red'
                padding='4px 8px'
            >
                <FlexContainer
                    flexDirection='row'
                    gap={4}
                    alignItems='center'
                    style={{ minWidth: '70px' }}
                    padding='0 4px 0 0'
                >
                    <div>Price Impact Warning</div>
                    <TooltipComponent
                        title='Difference Between Current (Spot) Price and Final Price'
                        placement='bottom'
                    />
                </FlexContainer>
                <div>{getPriceImpactString(priceImpactNumMemo)}%</div>
            </WarningContainer>
        ) : undefined;

    const showPriceImpactWarning =
        (priceImpactNumMemo || 0) > 10 &&
        isTokenAWalletBalanceSufficient &&
        !isLiquidityInsufficient &&
        !(isButtonDisabled && swapButtonErrorMessage === 'Enter an Amount');

    const usdValueTokenA = isTokenABase
        ? poolData.basePrice
        : poolData.quotePrice;
    const usdValueTokenB = isTokenABase
        ? poolData.quotePrice
        : poolData.basePrice;

    const percentDiffUsdValue =
        usdValueTokenA &&
        usdValueTokenB &&
        buyQtyBigInt > 0n &&
        sellQtyBigInt > 0n &&
        !HIDE_TOKEN_VALUES &&
        tokenA.chainId !== parseInt('0x279f') // monad testnet
            ? ((usdValueTokenB * parseFloat(buyQtyNoExponentString) -
                  usdValueTokenA * parseFloat(sellQtyNoExponentString)) /
                  (usdValueTokenA * parseFloat(sellQtyNoExponentString))) *
              100
            : 0;

    const usdDiffGreaterThanThreshold =
        (percentDiffUsdValue || 0) < -10 &&
        isTokenAWalletBalanceSufficient &&
        !isLiquidityInsufficient &&
        !(isButtonDisabled && swapButtonErrorMessage === 'Enter an Amount');

    const usdDiffGreaterThanThresholdDebounced = useDebounce(
        usdDiffGreaterThanThreshold,
        500,
    );

    const showUsdDiffWarning = usdDiffGreaterThanThreshold
        ? usdDiffGreaterThanThresholdDebounced &&
          !HIDE_TOKEN_VALUES &&
          tokenA.chainId !== parseInt('0x279f') // monad testnet
        : false;

    const showWarning = showPriceImpactWarning || showUsdDiffWarning;

    const buttonTitle = areBothAckd
        ? bypassConfirmSwap.isEnabled
            ? swapAllowed
                ? showWarning
                    ? showPriceImpactWarning
                        ? 'I understand the price impact of this swap. Submit anyway!'
                        : 'I understand the loss of value. Submit anyway!'
                    : 'Submit Swap'
                : swapButtonErrorMessage
            : swapAllowed
              ? showWarning
                  ? showPriceImpactWarning
                      ? 'I understand the price impact of this swap. Confirm anyway!'
                      : 'I understand the loss of value. Confirm anyway!'
                  : 'Confirm'
              : swapButtonErrorMessage
        : 'Acknowledge';

    return (
        <TradeModuleSkeleton
            chainId={chainId}
            isSwapPage={!isOnTradeRoute}
            header={
                <TradeModuleHeader
                    slippage={swapSlippage}
                    dexBalSwap={dexBalSwap}
                    bypassConfirm={bypassConfirmSwap}
                    fastLaneProtection={fastLaneProtection}
                    settingsTitle='Swap'
                    isSwapPage={!isOnTradeRoute}
                />
            }
            input={
                <SwapTokenInput
                    isLiquidityInsufficient={isLiquidityInsufficient}
                    setIsLiquidityInsufficient={setIsLiquidityInsufficient}
                    slippageTolerancePercentage={slippageTolerancePercentage}
                    setLastImpactQuery={setLastImpactQuery}
                    sellQtyString={{
                        value: sellQtyString,
                        set: setSellQtyString,
                    }}
                    buyQtyString={{
                        value: buyQtyString,
                        set: setBuyQtyString,
                    }}
                    isSellLoading={{
                        value: isSellLoading,
                        set: setIsSellLoading,
                    }}
                    isBuyLoading={{
                        value: isBuyLoading,
                        set: setIsBuyLoading,
                    }}
                    isWithdrawFromDexChecked={isWithdrawFromDexChecked}
                    isSaveAsDexSurplusChecked={isSaveAsDexSurplusChecked}
                    setSwapAllowed={setSwapAllowed}
                    toggleDexSelection={toggleDexSelection}
                    amountToReduceNativeTokenQty={amountToReduceNativeTokenQty}
                    usdValueTokenA={usdValueTokenA}
                    usdValueTokenB={usdValueTokenB}
                    percentDiffUsdValue={percentDiffUsdValue}
                />
            }
            transactionDetails={
                <SwapExtraInfo
                    priceImpact={priceImpact}
                    effectivePriceWithDenom={effectivePriceWithDenom}
                    slippageTolerance={slippageTolerancePercentage}
                    liquidityFee={liquidityFee}
                    swapGasPriceinDollars={swapGasPriceinDollars}
                    showExtraInfoDropdown={
                        primaryQuantity !== '' &&
                        parseFloat(primaryQuantity) > 0
                    }
                    showWarning={showWarning}
                />
            }
            modal={
                isModalOpen ? (
                    <ConfirmSwapModal
                        onClose={handleModalClose}
                        tokenPair={{
                            dataTokenA: tokenA,
                            dataTokenB: tokenB,
                        }}
                        isDenomBase={isDenomBase}
                        baseTokenSymbol={baseToken.symbol}
                        quoteTokenSymbol={quoteToken.symbol}
                        initiateSwapMethod={initiateSwap}
                        newSwapTransactionHash={newSwapTransactionHash}
                        txError={txError}
                        showConfirmation={showConfirmation}
                        resetConfirmation={resetConfirmation}
                        slippageTolerancePercentage={
                            slippageTolerancePercentage
                        }
                        effectivePrice={effectivePrice}
                        isTokenABase={isTokenABase}
                        sellQtyString={sellQtyNoExponentString}
                        buyQtyString={buyQtyNoExponentString}
                        isTokenAPrimary={isTokenAPrimary}
                        priceImpactWarning={priceImpactWarning}
                        isSaveAsDexSurplusChecked={isSaveAsDexSurplusChecked}
                        isMevProtectionEnabled={
                            fastLaneProtection.isChainAccepted
                                ? fastLaneProtection?.isEnabled
                                : undefined
                        }
                        percentDiffUsdValue={percentDiffUsdValue}
                    />
                ) : (
                    <></>
                )
            }
            button={
                <Button
                    idForDOM='confirm_swap_button'
                    style={{ textTransform: 'none' }}
                    title={buttonTitle}
                    action={
                        areBothAckd
                            ? bypassConfirmSwap.isEnabled
                                ? initiateSwap
                                : handleModalOpen
                            : ackAsNeeded
                    }
                    disabled={isButtonDisabled}
                    warning={showWarning}
                    flat
                />
            }
            bypassConfirm={
                showConfirmation && bypassConfirmSwap.isEnabled ? (
                    <SubmitTransaction
                        type='Swap'
                        newTransactionHash={newSwapTransactionHash}
                        txError={txError}
                        resetConfirmation={resetConfirmation}
                        sendTransaction={initiateSwap}
                        transactionPendingDisplayString={`Swapping ${sellQtyString} ${tokenA.symbol} for ${buyQtyString} ${tokenB.symbol}`}
                    />
                ) : undefined
            }
            approveButton={
                isPoolInitialized &&
                isTokenAWalletBalanceSufficient &&
                !isTokenAAllowanceSufficient &&
                fromDisplayQty(
                    sellQtyNoExponentString || '0',
                    tokenA.decimals,
                ) > 0 &&
                sellQtyString !== 'Infinity' ? (
                    <Button
                        idForDOM='approve_token_a_for_swap_module'
                        style={{ textTransform: 'none' }}
                        title={
                            !isApprovalPending
                                ? isUsdtResetRequired
                                    ? 'Reset USDT Approval (Step 1/2)'
                                    : `Approve ${tokenA.symbol}`
                                : isUsdtResetRequired
                                  ? 'USDT Approval Reset Pending...'
                                  : `${tokenA.symbol} Approval Pending...`
                        }
                        disabled={isApprovalPending}
                        action={async () => {
                            await approve(
                                tokenA.address,
                                tokenA.symbol,
                                undefined,
                                isUsdtResetRequired
                                    ? 0n
                                    : isActiveNetworkPlume
                                      ? isTokenAPrimary
                                          ? tokenAQtyCoveredByWalletBalance
                                          : // add 1% buffer to avoid rounding errors
                                            (tokenAQtyCoveredByWalletBalance *
                                                101n) /
                                            100n
                                      : ethers.MaxUint256,
                                fastLaneProtection.isEnabled
                                    ? ATLAS_ROUTER_ADDRESS
                                    : undefined,
                            );
                        }}
                        flat
                    />
                ) : undefined
            }
            warnings={
                priceImpactWarning || liquidityInsufficientWarning ? (
                    <>
                        {priceImpactWarning &&
                            sellQtyString !== '' &&
                            priceImpactWarning}
                        {liquidityInsufficientWarning &&
                            liquidityInsufficientWarning}
                    </>
                ) : undefined
            }
        />
    );
}

export default memo(Swap);
