import {
    fromDisplayQty,
    priceHalfAboveTick,
    priceHalfBelowTick,
    tickToPrice,
    toDisplayQty,
} from '@crocswap-libs/sdk';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
    getFormattedNumber,
    submitLimitOrder,
    waitForTransaction,
} from '../../../../ambient-utils/dataLayer';
import { useTradeData } from '../../../../App/hooks/useTradeData';
import Button from '../../../../components/Form/Button';
import { useModal } from '../../../../components/Global/Modal/useModal';
import ConfirmLimitModal from '../../../../components/Trade/Limit/ConfirmLimitModal/ConfirmLimitModal';
import LimitExtraInfo from '../../../../components/Trade/Limit/LimitExtraInfo/LimitExtraInfo';
import LimitRate from '../../../../components/Trade/Limit/LimitRate/LimitRate';
import LimitTokenInput from '../../../../components/Trade/Limit/LimitTokenInput/LimitTokenInput';
import SubmitTransaction from '../../../../components/Trade/TradeModules/SubmitTransaction/SubmitTransaction';
import TradeModuleHeader from '../../../../components/Trade/TradeModules/TradeModuleHeader';
import { TradeModuleSkeleton } from '../../../../components/Trade/TradeModules/TradeModuleSkeleton';

import {
    DISABLE_WORKAROUNDS,
    GAS_DROPS_ESTIMATE_LIMIT_FROM_DEX,
    GAS_DROPS_ESTIMATE_LIMIT_FROM_WALLET,
    GAS_DROPS_ESTIMATE_LIMIT_NATIVE,
    IS_LOCAL_ENV,
    LIMIT_BUFFER_MULTIPLIER_L2,
    LIMIT_BUFFER_MULTIPLIER_MAINNET,
    NUM_GWEI_IN_ETH,
    NUM_GWEI_IN_WEI,
    ZERO_ADDRESS,
} from '../../../../ambient-utils/constants';
import { getPositionHash } from '../../../../ambient-utils/dataLayer/functions/getPositionHash';
import {
    pinTickToTickLower,
    pinTickToTickUpper,
} from '../../../../ambient-utils/dataLayer/functions/pinTick';
import { useApprove } from '../../../../App/functions/approve';
import { AppStateContext } from '../../../../contexts';
import { ChainDataContext } from '../../../../contexts/ChainDataContext';
import { CrocEnvContext } from '../../../../contexts/CrocEnvContext';
import { GraphDataContext } from '../../../../contexts/GraphDataContext';
import { PoolContext } from '../../../../contexts/PoolContext';
import { ReceiptContext } from '../../../../contexts/ReceiptContext';
import { TokenContext } from '../../../../contexts/TokenContext';
import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import { TradeTokenContext } from '../../../../contexts/TradeTokenContext';
import { UserDataContext } from '../../../../contexts/UserDataContext';
import { UserPreferenceContext } from '../../../../contexts/UserPreferenceContext';
import {
    TransactionError,
    isTransactionDeniedError,
    isTransactionFailedError,
    isTransactionReplacedError,
} from '../../../../utils/TransactionError';
import { limitTutorialSteps } from '../../../../utils/tutorial/Limit';

export default function Limit() {
    const { crocEnv, ethMainnetUsdPrice, provider } =
        useContext(CrocEnvContext);

    const {
        activeNetwork: { chainId, gridSize, poolIndex },
        isUserOnline,
    } = useContext(AppStateContext);
    const { gasPriceInGwei, isActiveNetworkL2, isActiveNetworkPlume } =
        useContext(ChainDataContext);
    const {
        pool,
        isPoolInitialized,
        isTradeDollarizationEnabled,
        usdPriceInverse,
        poolData,
    } = useContext(PoolContext);
    const { userAddress } = useContext(UserDataContext);
    const { tokens } = useContext(TokenContext);
    const {
        tokenAAllowance,
        baseToken: {
            balance: baseTokenBalance,
            dexBalance: baseTokenDexBalance,
        },
        quoteToken: {
            balance: quoteTokenBalance,
            dexBalance: quoteTokenDexBalance,
        },
    } = useContext(TradeTokenContext);
    const {
        addPendingTx,
        addReceipt,
        addTransactionByType,
        addPositionUpdate,
        removePendingTx,
        updateTransactionHash,
        pendingTransactions,
    } = useContext(ReceiptContext);
    const { mintSlippage, dexBalLimit, bypassConfirmLimit } = useContext(
        UserPreferenceContext,
    );
    const { basePrice, quotePrice } = poolData;

    const [isOpen, openModal, closeModal] = useModal();
    const {
        baseToken,
        quoteToken,
        tokenA,
        tokenB,
        isTokenAPrimary,
        isDenomBase,
        setLimitTick,
        limitTick,
        poolPriceNonDisplay,
        primaryQuantity,
        setPrimaryQuantity,
        isTokenABase,
        currentPoolPriceTick,
    } = useContext(TradeDataContext);
    const { liquidityFee } = useContext(GraphDataContext);
    const { urlParamMap, updateURL } = useTradeData();

    const [limitAllowed, setLimitAllowed] = useState<boolean>(false);
    const [tokenAInputQty, setTokenAInputQty] = useState<string>(
        isTokenAPrimary ? primaryQuantity : '',
    );
    const [tokenBInputQty, setTokenBInputQty] = useState<string>(
        !isTokenAPrimary ? primaryQuantity : '',
    );

    const tokenAInputQtyNoExponentString = useMemo(() => {
        return tokenAInputQty.includes('e')
            ? toDisplayQty(
                  fromDisplayQty(tokenAInputQty || '0', tokenA.decimals),
                  tokenA.decimals,
              )
            : tokenAInputQty;
    }, [tokenAInputQty, tokenA.decimals]);

    const tokenBInputQtyNoExponentString = useMemo(() => {
        try {
            return tokenBInputQty.includes('e')
                ? toDisplayQty(
                      fromDisplayQty(tokenBInputQty || '0', tokenB.decimals),
                      tokenB.decimals,
                  )
                : tokenBInputQty;
        } catch (error) {
            console.log({ error });
            return tokenBInputQty;
        }
    }, [tokenBInputQty, tokenB.decimals]);

    const [isWithdrawFromDexChecked, setIsWithdrawFromDexChecked] =
        useState(false);
    const [isSaveAsDexSurplusChecked, setIsSaveAsDexSurplusChecked] = useState(
        dexBalLimit.outputToDexBal.isEnabled,
    );
    const [limitButtonErrorMessage, setLimitButtonErrorMessage] =
        useState<string>('');
    const [priceInputFieldBlurred, setPriceInputFieldBlurred] = useState(false);
    const [newLimitOrderTransactionHash, setNewLimitOrderTransactionHash] =
        useState('');
    const [txError, setTxError] = useState<Error>();
    const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
    const [endDisplayPrice, setEndDisplayPrice] = useState<
        number | undefined
    >();
    const [startDisplayPrice, setStartDisplayPrice] = useState<
        number | undefined
    >();
    const [middleDisplayPrice, setMiddleDisplayPrice] = useState<
        number | undefined
    >();
    const [orderGasPriceInDollars, setOrderGasPriceInDollars] = useState<
        string | undefined
    >();
    const [displayPrice, setDisplayPrice] = useState('');
    const [previousDisplayPrice, setPreviousDisplayPrice] = useState('');
    const [isOrderValid, setIsOrderValid] = useState<boolean>(true);

    const [
        amountToReduceNativeTokenQtyMainnet,
        setAmountToReduceNativeTokenQtyMainnet,
    ] = useState<number>(0.001);

    const [amountToReduceNativeTokenQtyL2, setAmountToReduceNativeTokenQtyL2] =
        useState<number>(0.0003);

    const amountToReduceNativeTokenQty =
        chainId === '0x82750' || chainId === '0x8274f' || chainId === '0x13e31'
            ? amountToReduceNativeTokenQtyL2
            : amountToReduceNativeTokenQtyMainnet;

    const activeTxHash = useRef<string>('');

    // reset activeTxHash when the pair changes or user updates quantity
    useEffect(() => {
        activeTxHash.current = '';
    }, [tokenA.address + tokenB.address, primaryQuantity]);

    useEffect(() => {
        if (isTokenAPrimary) {
            setLimitButtonErrorMessage('...');
            setTokenBInputQty('');
        } else {
            setLimitButtonErrorMessage('...');
            setTokenAInputQty('');
        }
    }, [tokenA.address + tokenB.address]);

    // TODO: is possible we can convert this to use the TradeTokenContext
    // However, unsure if the fact that baseToken comes from pool affects this
    const isSellTokenBase = pool?.baseToken.tokenAddr === tokenA.address;

    const tokenABalance = isSellTokenBase
        ? baseTokenBalance
        : quoteTokenBalance;
    const tokenADexBalance = isSellTokenBase
        ? baseTokenDexBalance
        : quoteTokenDexBalance;
    const tokenASurplusMinusTokenARemainderNum =
        fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) -
        fromDisplayQty(tokenAInputQtyNoExponentString || '0', tokenA.decimals);
    const isTokenADexSurplusSufficient =
        tokenASurplusMinusTokenARemainderNum >= 0;
    const tokenAQtyCoveredByWalletBalance = isWithdrawFromDexChecked
        ? tokenASurplusMinusTokenARemainderNum < 0
            ? tokenASurplusMinusTokenARemainderNum * -1n
            : 0n
        : fromDisplayQty(
              tokenAInputQtyNoExponentString || '0',
              tokenA.decimals,
          );
    const isTokenAAllowanceSufficient =
        tokenAAllowance === undefined
            ? true
            : tokenAAllowance >= tokenAQtyCoveredByWalletBalance;

    const isTokenAWalletBalanceSufficient =
        fromDisplayQty(tokenABalance || '0', tokenA.decimals) >=
        tokenAQtyCoveredByWalletBalance;

    // TODO: @Emily refactor this to take a token data object
    // values if either token needs to be confirmed before transacting

    const needConfirmTokenA = useMemo(() => {
        return !tokens.verify(tokenA.address);
    }, [tokenA.address, tokens]);
    const needConfirmTokenB = useMemo(() => {
        return !tokens.verify(tokenB.address);
    }, [tokenB.address, tokens]);

    // value showing if no acknowledgement is necessary
    const areBothAckd: boolean = !needConfirmTokenA && !needConfirmTokenB;

    // TODO: logic to determine start, middle, end display prices should be refactored into an ambient-utils function
    useEffect(() => {
        if (!poolPriceNonDisplay) {
            // pool is uninitialized
            setStartDisplayPrice(undefined);
            setMiddleDisplayPrice(undefined);
            setEndDisplayPrice(undefined);
        } else if (limitTick === undefined && crocEnv) {
            if (!pool) return;

            const defaultLimitOffsetPercentage = 1;

            const pinnedTick: number = isSellTokenBase
                ? pinTickToTickLower(
                      currentPoolPriceTick - defaultLimitOffsetPercentage * 100,
                      gridSize,
                  )
                : pinTickToTickUpper(
                      currentPoolPriceTick + defaultLimitOffsetPercentage * 100,
                      gridSize,
                  );

            setLimitTick(pinnedTick);

            const tickPrice = tickToPrice(pinnedTick);
            const tickDispPrice = pool.toDisplayPrice(tickPrice);

            tickDispPrice.then((tp) => {
                const displayPriceWithDenom = isDenomBase ? tp : 1 / tp;
                setEndDisplayPrice(displayPriceWithDenom);

                const dollarizedDisplayPrice = displayPriceWithDenom
                    ? isDenomBase
                        ? quotePrice
                            ? displayPriceWithDenom * quotePrice
                            : undefined
                        : basePrice
                          ? displayPriceWithDenom * basePrice
                          : undefined
                    : usdPriceInverse && displayPriceWithDenom
                      ? usdPriceInverse * displayPriceWithDenom
                      : undefined;

                const limitRateTruncated = isTradeDollarizationEnabled
                    ? getFormattedNumber({
                          value: dollarizedDisplayPrice,
                          removeCommas: true,
                          isInput: true,
                          prefix: '$',
                      })
                    : getFormattedNumber({
                          value: displayPriceWithDenom,
                          isInput: true,
                          removeCommas: true,
                      });

                setDisplayPrice(limitRateTruncated);
                setPreviousDisplayPrice(limitRateTruncated);
            });

            const priceHalfAbove = pool.toDisplayPrice(
                priceHalfAboveTick(pinnedTick, gridSize),
            );
            const priceHalfBelow = pool.toDisplayPrice(
                priceHalfBelowTick(pinnedTick, gridSize),
            );
            const priceFullTickAbove = pool.toDisplayPrice(
                tickToPrice(pinnedTick + gridSize),
            );
            const priceFullTickBelow = pool.toDisplayPrice(
                tickToPrice(pinnedTick - gridSize),
            );

            if (isDenomBase) {
                if (isSellTokenBase) {
                    priceHalfAbove.then((priceHalfAbove) => {
                        setMiddleDisplayPrice(priceHalfAbove);
                    });
                    priceFullTickAbove.then((priceFullTickAbove) => {
                        setStartDisplayPrice(priceFullTickAbove);
                    });
                } else {
                    priceHalfBelow.then((priceHalfBelow) => {
                        setMiddleDisplayPrice(priceHalfBelow);
                    });
                    priceFullTickBelow.then((priceFullTickBelow) => {
                        setStartDisplayPrice(priceFullTickBelow);
                    });
                }
            } else {
                if (isSellTokenBase) {
                    priceHalfAbove.then((priceHalfAbove) => {
                        setMiddleDisplayPrice(1 / priceHalfAbove);
                    });
                    priceFullTickAbove.then((priceFullTickAbove) => {
                        setStartDisplayPrice(1 / priceFullTickAbove);
                    });
                } else {
                    priceHalfBelow.then((priceHalfBelow) => {
                        setMiddleDisplayPrice(1 / priceHalfBelow);
                    });
                    priceFullTickBelow.then((priceFullTickBelow) => {
                        setStartDisplayPrice(1 / priceFullTickBelow);
                    });
                }
            }
        } else if (limitTick !== undefined) {
            if (!pool) return;

            const tickPrice = tickToPrice(limitTick);

            const tickDispPrice = pool.toDisplayPrice(tickPrice);

            tickDispPrice.then((tp) => {
                const displayPriceWithDenom = isDenomBase ? tp : 1 / tp;

                setEndDisplayPrice(displayPriceWithDenom);

                const dollarizedDisplayPrice = displayPriceWithDenom
                    ? isDenomBase
                        ? quotePrice
                            ? displayPriceWithDenom * quotePrice
                            : undefined
                        : basePrice
                          ? displayPriceWithDenom * basePrice
                          : undefined
                    : usdPriceInverse && displayPriceWithDenom
                      ? usdPriceInverse * displayPriceWithDenom
                      : undefined;

                const limitRateTruncated = isTradeDollarizationEnabled
                    ? getFormattedNumber({
                          value: dollarizedDisplayPrice,
                          removeCommas: true,
                          isInput: true,
                          prefix: '$',
                      })
                    : getFormattedNumber({
                          value: displayPriceWithDenom,
                          isInput: true,
                          removeCommas: true,
                      });

                setDisplayPrice(limitRateTruncated);
                setPreviousDisplayPrice(limitRateTruncated);
            });

            const priceHalfAbove = pool.toDisplayPrice(
                priceHalfAboveTick(limitTick, gridSize),
            );
            const priceHalfBelow = pool.toDisplayPrice(
                priceHalfBelowTick(limitTick, gridSize),
            );
            const priceFullTickAbove = pool.toDisplayPrice(
                tickToPrice(limitTick + gridSize),
            );
            const priceFullTickBelow = pool.toDisplayPrice(
                tickToPrice(limitTick - gridSize),
            );

            if (isDenomBase) {
                priceHalfAbove.then((priceHalfAbove) => {
                    if (isSellTokenBase) setMiddleDisplayPrice(priceHalfAbove);
                });
                priceFullTickAbove.then((priceFullTickAbove) => {
                    if (isSellTokenBase)
                        setStartDisplayPrice(priceFullTickAbove);
                });
                priceHalfBelow.then((priceHalfBelow) => {
                    if (!isSellTokenBase) setMiddleDisplayPrice(priceHalfBelow);
                });
                priceFullTickBelow.then((priceFullTickBelow) => {
                    if (!isSellTokenBase)
                        setStartDisplayPrice(priceFullTickBelow);
                });
            } else {
                priceHalfAbove.then((priceHalfAbove) => {
                    if (isSellTokenBase)
                        setMiddleDisplayPrice(1 / priceHalfAbove);
                });
                priceFullTickAbove.then((priceFullTickAbove) => {
                    if (isSellTokenBase)
                        setStartDisplayPrice(1 / priceFullTickAbove);
                });
                priceHalfBelow.then((priceHalfBelow) => {
                    if (!isSellTokenBase)
                        setMiddleDisplayPrice(1 / priceHalfBelow);
                });
                priceFullTickBelow.then((priceFullTickBelow) => {
                    if (!isSellTokenBase)
                        setStartDisplayPrice(1 / priceFullTickBelow);
                });
            }

            setPriceInputFieldBlurred(false);
        }
    }, [
        !!crocEnv,
        pool,
        limitTick,
        isDenomBase,
        priceInputFieldBlurred,
        isSellTokenBase,
        poolPriceNonDisplay,
        isTradeDollarizationEnabled,
        usdPriceInverse,
        basePrice,
        quotePrice,
    ]);

    // patch limit tick into URL if it is missing, this value isn't available
    // ... on firstload so we need to update the URL once the SDK returns it
    useEffect(() => {
        // key for limit tick in the URL param map
        const LIMIT_TICK_KEY = 'limitTick';
        const urlHasLimitTick: boolean = urlParamMap.has(LIMIT_TICK_KEY);
        // if we have a limit tick and it's not present in the URL, trigger an update
        if (!urlHasLimitTick && limitTick !== undefined) {
            updateURL({ update: [[LIMIT_TICK_KEY, limitTick]] });
        }
    }, [limitTick]);

    const updateOrderValidityStatus = async () => {
        try {
            if (!crocEnv) return;
            if (limitTick === undefined) return;
            if (tokenAInputQty === '' && tokenBInputQty === '') return;

            const tknA: string = urlParamMap.get('tokenA') as string;
            const tknB: string = urlParamMap.get('tokenB') as string;
            const limitTickParam: string = urlParamMap.get(
                'limitTick',
            ) as string;
            if (limitTickParam && limitTickParam !== limitTick.toString())
                return;
            const testOrder = isTokenAPrimary
                ? crocEnv.sell(tknA, 0)
                : crocEnv.buy(tknB, 0);

            const ko = testOrder.atLimit(
                isTokenAPrimary ? tknB : tknA,
                limitTick,
            );

            if (await ko.willMintFail()) {
                updateLimitErrorMessage();
                setIsOrderValid(false);
                return;
            } else {
                setIsOrderValid(true);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        updateOrderValidityStatus();
    }, [
        limitTick,
        poolPriceNonDisplay,
        tokenAInputQty === '' && tokenBInputQty === '',
        urlParamMap,
    ]);

    useEffect(() => {
        resetConfirmation();
    }, [baseToken.address + quoteToken.address]);

    const isSellTokenNativeToken = tokenA.address === ZERO_ADDRESS;

    useEffect(() => {
        handleLimitButtonMessage(
            fromDisplayQty(
                tokenAInputQtyNoExponentString || '0',
                tokenA.decimals,
            ),
        );
    }, [
        isUserOnline,
        isOrderValid,
        tokenAInputQtyNoExponentString,
        isPoolInitialized,
        poolPriceNonDisplay,
        limitTick,
        isSellTokenBase,
        isSellTokenNativeToken,
        tokenAQtyCoveredByWalletBalance,
        tokenABalance,
        amountToReduceNativeTokenQty,
        pendingTransactions,
        activeTxHash,
    ]);

    useEffect(() => {
        setIsWithdrawFromDexChecked(
            fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) > 0n,
        );
    }, [tokenADexBalance]);

    const [l1GasFeeLimitInGwei] = useState<number>(
        isActiveNetworkL2 ? 10000 : 0,
    );
    const [extraL1GasFeeLimit] = useState(isActiveNetworkL2 ? 0.01 : 0);

    useEffect(() => {
        if (gasPriceInGwei && ethMainnetUsdPrice) {
            const averageLimitCostInGasDrops = isSellTokenNativeToken
                ? GAS_DROPS_ESTIMATE_LIMIT_NATIVE
                : isWithdrawFromDexChecked
                  ? isTokenADexSurplusSufficient
                      ? GAS_DROPS_ESTIMATE_LIMIT_FROM_DEX
                      : GAS_DROPS_ESTIMATE_LIMIT_FROM_WALLET
                  : GAS_DROPS_ESTIMATE_LIMIT_FROM_WALLET;

            const costOfMainnetLimitInETH =
                gasPriceInGwei * averageLimitCostInGasDrops * NUM_GWEI_IN_WEI;

            setAmountToReduceNativeTokenQtyMainnet(
                LIMIT_BUFFER_MULTIPLIER_MAINNET * costOfMainnetLimitInETH,
            );

            const l1CostOfScrollLimitInETH =
                l1GasFeeLimitInGwei / NUM_GWEI_IN_ETH;

            const l2CostOfScrollLimitInETH =
                gasPriceInGwei * averageLimitCostInGasDrops * NUM_GWEI_IN_WEI;

            const costOfScrollLimitInETH =
                l1CostOfScrollLimitInETH + l2CostOfScrollLimitInETH;

            setAmountToReduceNativeTokenQtyL2(
                LIMIT_BUFFER_MULTIPLIER_L2 * costOfScrollLimitInETH,
            );

            const gasPriceInDollarsNum =
                gasPriceInGwei *
                averageLimitCostInGasDrops *
                NUM_GWEI_IN_WEI *
                ethMainnetUsdPrice;

            setOrderGasPriceInDollars(
                getFormattedNumber({
                    value: gasPriceInDollarsNum + extraL1GasFeeLimit,
                    isUSD: true,
                }),
            );
        }
    }, [
        gasPriceInGwei,
        ethMainnetUsdPrice,
        isSellTokenNativeToken,
        isWithdrawFromDexChecked,
        isTokenADexSurplusSufficient,
        l1GasFeeLimitInGwei,
        extraL1GasFeeLimit,
    ]);

    const resetConfirmation = () => {
        setShowConfirmation(false);
        setTxError(undefined);
        setNewLimitOrderTransactionHash('');
    };

    const updateLimitErrorMessage = () =>
        setLimitButtonErrorMessage(
            `Limit ${
                (isSellTokenBase && !isDenomBase) ||
                (!isSellTokenBase && isDenomBase)
                    ? 'Above Maximum'
                    : 'Below Minimum'
            }  Price`,
        );

    const sendLimitOrder = async () => {
        if (!crocEnv) return;
        if (limitTick === undefined) return;
        resetConfirmation();
        setShowConfirmation(true);

        const sellToken = tokenA.address;
        const buyToken = tokenB.address;

        const sellQty = tokenAInputQtyNoExponentString;
        const buyQty = tokenBInputQtyNoExponentString;

        const qty = isTokenAPrimary ? sellQty : buyQty;
        const type = isTokenAPrimary ? 'sell' : 'buy';

        const posHash = getPositionHash(undefined, {
            isPositionTypeAmbient: false,
            user: userAddress ?? '',
            baseAddress: baseToken.address,
            quoteAddress: quoteToken.address,
            poolIdx: poolIndex,
            bidTick: isSellTokenBase ? limitTick : limitTick - gridSize,
            askTick: isSellTokenBase ? limitTick + gridSize : limitTick,
        });

        let tx;
        try {
            try {
                tx = await submitLimitOrder({
                    crocEnv,
                    qty,
                    sellTokenAddress: sellToken,
                    buyTokenAddress: buyToken,
                    type,
                    limit: limitTick,
                    isWithdrawFromDexChecked,
                });
            } catch (error) {
                if (isTransactionDeniedError(error) || DISABLE_WORKAROUNDS) {
                    throw error;
                }
                // on first attempt try moving limit tick in by 1 tick
                try {
                    tx = await submitLimitOrder({
                        crocEnv,
                        qty,
                        sellTokenAddress: sellToken,
                        buyTokenAddress: buyToken,
                        type,
                        limit: isSellTokenBase
                            ? limitTick + gridSize
                            : limitTick - gridSize,
                        isWithdrawFromDexChecked,
                    });
                } catch (error2) {
                    if (isTransactionDeniedError(error2)) throw error2;
                    // on second attempt try reducing the qty by 5 wei
                    try {
                        const newQty = isTokenAPrimary
                            ? toDisplayQty(
                                  fromDisplayQty(qty, tokenA.decimals) -
                                      BigInt(5), // offset by 5 wei to avoid an outstanding unknown issue
                                  tokenA.decimals,
                              )
                            : toDisplayQty(
                                  fromDisplayQty(qty, tokenB.decimals) -
                                      BigInt(5),
                                  tokenB.decimals,
                              );
                        tx = await submitLimitOrder({
                            crocEnv,
                            qty: newQty,
                            sellTokenAddress: sellToken,
                            buyTokenAddress: buyToken,
                            type,
                            limit: limitTick,
                            isWithdrawFromDexChecked,
                        });
                    } catch (error3) {
                        if (isTransactionDeniedError(error3)) throw error3;
                        // on third attempt try moving limit tick out by 1 tick
                        try {
                            tx = await submitLimitOrder({
                                crocEnv,
                                qty,
                                sellTokenAddress: sellToken,
                                buyTokenAddress: buyToken,
                                type,
                                limit: isSellTokenBase
                                    ? limitTick - gridSize
                                    : limitTick + gridSize,
                                isWithdrawFromDexChecked,
                            });
                        } catch (error4) {
                            if (isTransactionDeniedError(error4)) throw error4;
                            throw error;
                        }
                    }
                }
            }

            if (!tx) return;

            activeTxHash.current = tx?.hash;

            addPendingTx(tx?.hash);
            setNewLimitOrderTransactionHash(tx.hash);
            addTransactionByType({
                chainId: chainId,
                userAddress: userAddress || '',
                txHash: tx.hash,
                txAction:
                    tokenB.address.toLowerCase() ===
                    quoteToken.address.toLowerCase()
                        ? 'Buy'
                        : 'Sell',
                txType: 'Limit',
                txDescription: `Add Limit ${tokenA.symbol}→${tokenB.symbol}`,
                txDetails: {
                    baseAddress: baseToken.address,
                    quoteAddress: quoteToken.address,
                    baseTokenDecimals: baseToken.decimals,
                    quoteTokenDecimals: quoteToken.decimals,
                    poolIdx: poolIndex,
                    baseSymbol: baseToken.symbol,
                    quoteSymbol: quoteToken.symbol,
                    lowTick: isSellTokenBase ? limitTick : limitTick - gridSize,
                    highTick: isSellTokenBase
                        ? limitTick + gridSize
                        : limitTick,
                    isBid: isSellTokenBase,
                },
            });

            addPositionUpdate({
                txHash: tx.hash,
                positionID: posHash,
                isLimit: true,
                unixTimeAdded: Math.floor(Date.now() / 1000),
            });
        } catch (error) {
            console.error({ error });
            setTxError(error);
        }

        let receipt;
        try {
            if (tx)
                receipt = await waitForTransaction(
                    provider,
                    tx.hash,
                    removePendingTx,
                    addPendingTx,
                    updateTransactionHash,
                    setNewLimitOrderTransactionHash,
                );
        } catch (e) {
            const error = e as TransactionError;
            console.error({ error });
            // The user used 'speed up' or something similar
            // in their client, but we now have the updated info
            if (isTransactionReplacedError(error)) {
                IS_LOCAL_ENV && console.debug('repriced');
                removePendingTx(error.hash);
                const newTransactionHash = error.replacement.hash;
                activeTxHash.current = newTransactionHash;
                addPendingTx(newTransactionHash);
                addPositionUpdate({
                    txHash: newTransactionHash,
                    positionID: posHash,
                    isLimit: true,
                    unixTimeAdded: Math.floor(Date.now() / 1000),
                });
                updateTransactionHash(error.hash, error.replacement.hash);
                setNewLimitOrderTransactionHash(newTransactionHash);
                IS_LOCAL_ENV && console.debug({ newTransactionHash });
                receipt = error.receipt;
            } else if (isTransactionFailedError(error)) {
                activeTxHash.current = '';
                receipt = error.receipt;
            }
        }

        if (receipt) {
            addReceipt(receipt);
            removePendingTx(receipt.hash);
        }
    };

    const handleLimitButtonMessage = (tokenAAmount: bigint) => {
        if (!isUserOnline) {
            setLimitAllowed(false);
            setLimitButtonErrorMessage('Currently Offline');
        } else if (!isPoolInitialized) {
            setLimitAllowed(false);
            if (isPoolInitialized === undefined)
                setLimitButtonErrorMessage('...');
            if (isPoolInitialized === false)
                setLimitButtonErrorMessage('Pool Not Initialized');
        } else if (tokenAAmount <= 0) {
            setLimitAllowed(false);
            setLimitButtonErrorMessage('Enter an Amount');
        } else if (!isOrderValid) {
            setLimitAllowed(false);
            setLimitButtonErrorMessage(
                `Limit ${
                    (isSellTokenBase && !isDenomBase) ||
                    (!isSellTokenBase && isDenomBase)
                        ? 'Above Maximum'
                        : 'Below Minimum'
                }  Price`,
            );
        } else {
            if (isWithdrawFromDexChecked) {
                if (
                    tokenAAmount >
                    fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) +
                        fromDisplayQty(tokenABalance || '0', tokenA.decimals)
                ) {
                    if (
                        pendingTransactions.some(
                            (tx) => tx === activeTxHash.current,
                        )
                    ) {
                        setTokenAInputQty('');
                        setTokenBInputQty('');
                        setPrimaryQuantity('');
                        activeTxHash.current = '';
                    }
                    setLimitAllowed(false);
                    setLimitButtonErrorMessage(
                        `${tokenA.symbol} Amount Exceeds Combined Wallet and Exchange Balance`,
                    );
                } else if (
                    isSellTokenNativeToken &&
                    tokenAQtyCoveredByWalletBalance +
                        fromDisplayQty(
                            amountToReduceNativeTokenQty.toString(),
                            18,
                        ) >
                        fromDisplayQty(tokenABalance || '0', tokenA.decimals)
                ) {
                    setLimitAllowed(false);
                    setLimitButtonErrorMessage(
                        `${
                            tokenA.address === ZERO_ADDRESS ? 'ETH ' : ''
                        } Wallet Balance Insufficient to Cover Gas`,
                    );
                } else {
                    setLimitAllowed(true);
                }
            } else {
                if (
                    tokenAAmount >
                    fromDisplayQty(tokenABalance || '0', tokenA.decimals)
                ) {
                    setLimitAllowed(false);
                    setLimitButtonErrorMessage(
                        `${tokenA.symbol} Amount Exceeds Wallet Balance`,
                    );
                } else if (
                    isSellTokenNativeToken &&
                    tokenAQtyCoveredByWalletBalance +
                        fromDisplayQty(
                            amountToReduceNativeTokenQty.toString(),
                            18,
                        ) >
                        fromDisplayQty(tokenABalance || '0', tokenA.decimals)
                ) {
                    setLimitAllowed(false);
                    setLimitButtonErrorMessage(
                        `${
                            tokenA.address === ZERO_ADDRESS ? 'ETH ' : ''
                        } Wallet Balance Insufficient to Cover Gas`,
                    );
                } else {
                    setLimitAllowed(true);
                }
            }
        }
    };

    const handleModalOpen = () => {
        resetConfirmation();
        openModal();
    };

    const handleModalClose = (): void => {
        resetConfirmation();
        closeModal();
    };
    const { approve, isApprovalPending } = useApprove();

    const toggleDexSelection = (tokenAorB: 'A' | 'B') => {
        if (tokenAorB === 'A') {
            setIsWithdrawFromDexChecked(!isWithdrawFromDexChecked);
        } else {
            if (isSaveAsDexSurplusChecked) dexBalLimit.outputToDexBal.disable();
            else dexBalLimit.outputToDexBal.enable();
            setIsSaveAsDexSurplusChecked(!isSaveAsDexSurplusChecked);
        }
    };

    // logic to acknowledge one or both tokens as necessary
    const ackAsNeeded = (): void => {
        needConfirmTokenA && tokens.acknowledge(tokenA);
        needConfirmTokenB && tokens.acknowledge(tokenB);
    };

    const usdValueTokenA = isTokenABase
        ? poolData.basePrice
        : poolData.quotePrice;
    const usdValueTokenB = isTokenABase
        ? poolData.quotePrice
        : poolData.basePrice;

    const percentDiffUsdValue =
        usdValueTokenA && usdValueTokenB
            ? ((usdValueTokenB * parseFloat(tokenBInputQtyNoExponentString) -
                  usdValueTokenA * parseFloat(tokenAInputQtyNoExponentString)) /
                  (usdValueTokenA * parseFloat(tokenAInputQty))) *
              100
            : 0;

    return (
        <TradeModuleSkeleton
            chainId={chainId}
            header={
                <TradeModuleHeader
                    slippage={mintSlippage}
                    bypassConfirm={bypassConfirmLimit}
                    settingsTitle='Limit Order'
                />
            }
            input={
                <LimitTokenInput
                    tokenAInputQty={{
                        value: tokenAInputQty,
                        set: setTokenAInputQty,
                    }}
                    tokenBInputQty={{
                        value:
                            tokenBInputQtyNoExponentString !== '0.0' ||
                            !isTokenAPrimary
                                ? tokenBInputQty
                                : '0',
                        set: setTokenBInputQty,
                    }}
                    isSaveAsDexSurplusChecked={isSaveAsDexSurplusChecked}
                    isWithdrawFromDexChecked={isWithdrawFromDexChecked}
                    limitTickDisplayPrice={middleDisplayPrice || 0}
                    handleLimitButtonMessage={handleLimitButtonMessage}
                    toggleDexSelection={toggleDexSelection}
                    amountToReduceNativeTokenQty={amountToReduceNativeTokenQty}
                    usdValueTokenA={usdValueTokenA}
                    usdValueTokenB={usdValueTokenB}
                    percentDiffUsdValue={percentDiffUsdValue}
                />
            }
            inputOptions={
                <LimitRate
                    previousDisplayPrice={previousDisplayPrice}
                    displayPrice={displayPrice}
                    setDisplayPrice={setDisplayPrice}
                    setPreviousDisplayPrice={setPreviousDisplayPrice}
                    isSellTokenBase={isSellTokenBase}
                    setPriceInputFieldBlurred={setPriceInputFieldBlurred}
                    updateURL={updateURL}
                />
            }
            transactionDetails={
                <LimitExtraInfo
                    showExtraInfoDropdown={
                        tokenAInputQty !== '' || tokenBInputQty !== ''
                    }
                    orderGasPriceInDollars={orderGasPriceInDollars}
                    liquidityFee={liquidityFee}
                    isTokenABase={isSellTokenBase}
                    startDisplayPrice={startDisplayPrice}
                    middleDisplayPrice={middleDisplayPrice}
                    endDisplayPrice={endDisplayPrice}
                />
            }
            modal={
                isOpen ? (
                    <ConfirmLimitModal
                        onClose={handleModalClose}
                        initiateLimitOrderMethod={sendLimitOrder}
                        tokenAInputQty={tokenAInputQtyNoExponentString}
                        tokenBInputQty={tokenBInputQtyNoExponentString}
                        newLimitOrderTransactionHash={
                            newLimitOrderTransactionHash
                        }
                        txError={txError}
                        showConfirmation={showConfirmation}
                        resetConfirmation={resetConfirmation}
                        startDisplayPrice={startDisplayPrice}
                        middleDisplayPrice={middleDisplayPrice}
                        endDisplayPrice={endDisplayPrice}
                        limitAllowed={limitAllowed}
                        limitButtonErrorMessage={limitButtonErrorMessage}
                        percentDiffUsdValue={percentDiffUsdValue}
                    />
                ) : (
                    <></>
                )
            }
            button={
                <Button
                    idForDOM='confirm_limit_order_button'
                    style={{ textTransform: 'none' }}
                    title={
                        areBothAckd
                            ? limitAllowed
                                ? bypassConfirmLimit.isEnabled
                                    ? 'Submit Limit Order'
                                    : 'Confirm'
                                : limitButtonErrorMessage
                            : 'Acknowledge'
                    }
                    action={
                        areBothAckd
                            ? bypassConfirmLimit.isEnabled
                                ? sendLimitOrder
                                : handleModalOpen
                            : ackAsNeeded
                    }
                    disabled={
                        (!limitAllowed ||
                            !isOrderValid ||
                            poolPriceNonDisplay === 0) &&
                        areBothAckd
                    }
                    flat
                />
            }
            bypassConfirm={
                showConfirmation && bypassConfirmLimit.isEnabled ? (
                    <SubmitTransaction
                        type='Limit'
                        newTransactionHash={newLimitOrderTransactionHash}
                        txError={txError}
                        resetConfirmation={resetConfirmation}
                        sendTransaction={sendLimitOrder}
                        transactionPendingDisplayString={`Submitting Limit Order to Swap ${tokenAInputQty} ${tokenA.symbol} for ${tokenBInputQty} ${tokenB.symbol}`}
                    />
                ) : undefined
            }
            approveButton={
                isPoolInitialized &&
                !isTokenAAllowanceSufficient &&
                isTokenAWalletBalanceSufficient &&
                parseFloat(tokenAInputQtyNoExponentString) > 0 ? (
                    <Button
                        idForDOM='approve_limit_order_button'
                        style={{ textTransform: 'none' }}
                        title={
                            !isApprovalPending
                                ? `Approve ${tokenA.symbol}`
                                : `${tokenA.symbol} Approval Pending`
                        }
                        disabled={isApprovalPending}
                        action={async () => {
                            await approve(
                                tokenA.address,
                                tokenA.symbol,
                                undefined,
                                isActiveNetworkPlume
                                    ? isTokenAPrimary
                                        ? tokenAQtyCoveredByWalletBalance
                                        : // add 1% buffer to avoid rounding errors
                                          (tokenAQtyCoveredByWalletBalance *
                                              101n) /
                                          100n
                                    : tokenABalance
                                      ? fromDisplayQty(
                                            tokenABalance,
                                            tokenA.decimals,
                                        )
                                      : undefined,
                            );
                        }}
                        flat={true}
                    />
                ) : undefined
            }
            tutorialSteps={limitTutorialSteps}
        />
    );
}
