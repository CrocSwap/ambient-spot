import { Dispatch, SetStateAction } from 'react';

import {
    LimitOrderIF,
    TokenIF,
    TransactionIF,
} from '../../../../ambient-utils/types';
import {
    LimitOrdersByPool,
    PositionsByPool,
} from '../../../../contexts/GraphDataContext';
import { checkCircleLocation } from './circle';
import {
    drawDataHistory,
    lineData,
    scaleData,
    selectedDrawnData,
} from './chartUtils';
import { createShapeLocationCheckers } from './shapeLocations';

type OrderHistoryHover = {
    type: string;
    id: string;
    totalValueUSD: number;
    tokenFlowDecimalCorrected: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    order: any;
};

type OrderDataArray<T> =
    | Array<{
          order: T;
          totalValueUSD: number;
          tokenFlowDecimalCorrected: number;
          mergedIds: Array<{ hash: string; type: string }>;
      }>
    | undefined;

interface UseHoverStatusArgs {
    scaleData: scaleData | undefined;
    denomInBase: boolean;
    isTokenABase: boolean;
    tokenA: TokenIF;
    tokenB: TokenIF;
    // drawn-shape hover inputs
    drawnShapeHistory: drawDataHistory[];
    checkers: ReturnType<typeof createShapeLocationCheckers>;
    setHoveredDrawnShape: Dispatch<
        SetStateAction<selectedDrawnData | undefined>
    >;
    setIsDragActive: Dispatch<SetStateAction<boolean>>;
    // order-history hover inputs
    showSwap: boolean;
    showHistorical: boolean;
    showLiquidity: boolean;
    userPositionsByPool: PositionsByPool;
    userLimitOrdersByPool: LimitOrdersByPool;
    userTransactionData: Array<TransactionIF> | undefined;
    filteredTransactionalData: OrderDataArray<TransactionIF>;
    filteredLimitTxData: OrderDataArray<LimitOrderIF>;
    selectedOrderHistory: OrderHistoryHover | undefined;
    setHoveredOrderHistory: Dispatch<
        SetStateAction<OrderHistoryHover | undefined>
    >;
    setIsHoveredOrderHistory: Dispatch<SetStateAction<boolean>>;
    setHoverOHTooltip: Dispatch<SetStateAction<boolean>>;
    setHoveredOrderTooltipPlacement: Dispatch<
        SetStateAction<
            { top: number; left: number; isOnLeftSide: boolean } | undefined
        >
    >;
    setSelectedOrderHistory: Dispatch<
        SetStateAction<OrderHistoryHover | undefined>
    >;
    setIsSelectedOrderHistory: Dispatch<SetStateAction<boolean>>;
    setCurrentTxActiveInTransactions: (txHash: string) => void;
    handleCardClick: (id: string, type: string) => void;
}

/**
 * Groups the pointer hit-testing routines that walk the drawn-shape history and
 * the order-history collections to find the element under the cursor. Behavior
 * is identical to the previous inline implementations in `Chart.tsx`; this only
 * relocates the cohesive block. All read-only context and the relevant state
 * setters are threaded in through `args`.
 */
export function useHoverStatus(args: UseHoverStatusArgs) {
    const {
        scaleData,
        denomInBase,
        isTokenABase,
        tokenA,
        tokenB,
        drawnShapeHistory,
        checkers,
        setHoveredDrawnShape,
        setIsDragActive,
        showHistorical,
        showSwap,
        showLiquidity,
        userPositionsByPool,
        userLimitOrdersByPool,
        userTransactionData,
        filteredTransactionalData,
        filteredLimitTxData,
        selectedOrderHistory,
        setHoveredOrderHistory,
        setIsHoveredOrderHistory,
        setHoverOHTooltip,
        setHoveredOrderTooltipPlacement,
        setSelectedOrderHistory,
        setIsSelectedOrderHistory,
        setCurrentTxActiveInTransactions,
        handleCardClick,
    } = args;

    const {
        checkLineLocation,
        checkRectLocation,
        checkRayLineLocation,
        checkSwapLoation,
        checkFibonacciLocation,
    } = checkers;

    const drawnShapesHoverStatus = (mouseX: number, mouseY: number) => {
        let resElement = undefined;

        drawnShapeHistory.forEach((element) => {
            const isShapeInCurrentPool =
                tokenA.address ===
                    (isTokenABase === element.pool.isTokenABase
                        ? element.pool.tokenA
                        : element.pool.tokenB) &&
                tokenB.address ===
                    (isTokenABase === element.pool.isTokenABase
                        ? element.pool.tokenB
                        : element.pool.tokenA);

            if (isShapeInCurrentPool) {
                if (element.type === 'FibRetracement') {
                    const data = structuredClone(element.data);

                    if (element.reverse) {
                        [data[0], data[1]] = [data[1], data[0]];
                    }

                    if (
                        checkFibonacciLocation(
                            data,
                            element.extraData,
                            mouseX,
                            mouseY,
                            denomInBase,
                            element.extendLeft,
                            element.extendRight,
                        )
                    ) {
                        resElement = element;
                    }
                }

                if (element.type === 'Brush' || element.type === 'Angle') {
                    const lineData: Array<lineData[]> = [];
                    lineData.push(element.data);

                    lineData.forEach((line) => {
                        if (
                            checkLineLocation(line, mouseX, mouseY, denomInBase)
                        ) {
                            resElement = element;
                        }
                    });
                }

                if (element.type === 'Rect' || element.type === 'DPRange') {
                    if (element.type === 'DPRange' && scaleData) {
                        const endY =
                            element.data[1].denomInBase === denomInBase
                                ? element.data[1].y
                                : 1 / element.data[1].y;
                        const startY =
                            element.data[0].denomInBase === denomInBase
                                ? element.data[0].y
                                : 1 / element.data[0].y;

                        const dpRangeTooltipData: lineData[] = [
                            {
                                x: scaleData.drawingLinearxScale.invert(
                                    scaleData.drawingLinearxScale(
                                        Math.min(
                                            element.data[0].x,
                                            element.data[1].x,
                                        ) +
                                            Math.abs(
                                                element.data[0].x -
                                                    element.data[1].x,
                                            ) /
                                                2,
                                    ) - 90,
                                ),
                                y: scaleData.yScale.invert(
                                    scaleData.yScale(endY) +
                                        (endY > startY ? -15 : 15),
                                ),
                                denomInBase: element.data[0].denomInBase,
                            },
                            {
                                x: scaleData.drawingLinearxScale.invert(
                                    scaleData.drawingLinearxScale(
                                        Math.min(
                                            element.data[0].x,
                                            element.data[1].x,
                                        ) +
                                            Math.abs(
                                                element.data[0].x -
                                                    element.data[1].x,
                                            ) /
                                                2,
                                    ) + 90,
                                ),
                                y: scaleData.yScale.invert(
                                    scaleData.yScale(endY) +
                                        (endY > startY ? -80 : 80),
                                ),
                                denomInBase: element.data[1].denomInBase,
                            },
                        ];

                        if (
                            checkRectLocation(
                                dpRangeTooltipData,
                                mouseX,
                                mouseY,
                                true,
                            )
                        ) {
                            resElement = element;
                        }
                    }
                    if (
                        checkRectLocation(element.data, mouseX, mouseY, false)
                    ) {
                        resElement = element;
                    }
                }

                if (element.type === 'Ray') {
                    if (
                        checkRayLineLocation(
                            element.data,
                            mouseX,
                            mouseY,
                            denomInBase,
                        )
                    ) {
                        resElement = element;
                    }
                }
            }
        });

        if (resElement && scaleData) {
            const selectedCircle = checkCircleLocation(
                resElement,
                mouseX,
                mouseY,
                scaleData,
                denomInBase,
            );

            setHoveredDrawnShape({
                data: resElement,
                selectedCircle: selectedCircle,
            });

            setIsDragActive(true);
        } else {
            setIsDragActive(false);
            setHoveredDrawnShape(undefined);
        }
    };

    const orderHistoryHoverStatus = (
        mouseX: number,
        mouseY: number,
        onClick: boolean,
    ) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let resElement: any = undefined;

        if (scaleData) {
            if (userPositionsByPool) {
                userPositionsByPool.positions.forEach((position) => {
                    if (
                        (position.positionLiq === 0 && showHistorical) ||
                        (position.positionLiq > 0 && showLiquidity)
                    ) {
                        const rectLocation = [
                            {
                                x: position?.timeFirstMint * 1000,
                                y: denomInBase
                                    ? position.bidTickInvPriceDecimalCorrected
                                    : position.bidTickPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                            {
                                x:
                                    position.positionLiq > 0
                                        ? new Date().getTime() +
                                          5 * 86400 * 1000
                                        : position?.latestUpdateTime * 1000,
                                y: denomInBase
                                    ? position.askTickInvPriceDecimalCorrected
                                    : position.askTickPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                        ];

                        if (
                            checkRectLocation(
                                rectLocation,
                                mouseX,
                                mouseY,
                                denomInBase,
                            )
                        ) {
                            resElement = {
                                id: position.positionId,
                                type:
                                    position.positionLiq === 0
                                        ? 'historical'
                                        : 'historicalLiq',
                                order: position,
                                totalValueUSD: position.totalValueUSD,
                                tokenFlowDecimalCorrected: 0,
                                mergedIds: [
                                    {
                                        hash: position.positionId,
                                        type: 'historical',
                                    },
                                ],
                            };
                        }
                    }
                });
            }

            if (userLimitOrdersByPool && showLiquidity && userTransactionData) {
                const userLimitOrderHistory = userTransactionData.filter(
                    (transaction) =>
                        transaction.entityType === 'limitOrder' &&
                        transaction.changeType === 'mint',
                );

                const processLimitOrder = (entity: LimitOrderIF) => {
                    const mintedInTick = userLimitOrderHistory.filter(
                        (his) =>
                            his.isBuy === entity.isBid &&
                            his.bidTick === entity.bidTick &&
                            his.askTick === entity.askTick,
                    );

                    if (mintedInTick?.length > 0) {
                        return mintedInTick;
                    }
                };

                userLimitOrdersByPool.limitOrders.forEach((limitOrder) => {
                    if (limitOrder.claimableLiq === 0) {
                        const mergedIds: Array<{ hash: string; type: string }> =
                            [];

                        const mintedInTick = processLimitOrder(limitOrder);

                        mintedInTick?.forEach((mint) => {
                            const isIn = mergedIds.find(
                                (id) => id.hash === mint.txHash,
                            );

                            if (isIn === undefined) {
                                mergedIds.push({
                                    hash: mint.txHash,
                                    type: mint.entityType,
                                });
                            }
                        });

                        const tokenFlowDecimalCorrected = limitOrder.isBid
                            ? denomInBase
                                ? limitOrder.originalPositionLiqBaseDecimalCorrected
                                : limitOrder.expectedPositionLiqQuoteDecimalCorrected
                            : denomInBase
                              ? limitOrder.expectedPositionLiqBaseDecimalCorrected
                              : limitOrder.originalPositionLiqQuoteDecimalCorrected;

                        const swapOrderData = [
                            {
                                x: limitOrder.timeFirstMint * 1000,
                                y: denomInBase
                                    ? limitOrder.invLimitPriceDecimalCorrected
                                    : limitOrder.limitPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                        ];

                        if (
                            checkSwapLoation(
                                swapOrderData,
                                mouseX,
                                mouseY,
                                limitOrder.totalValueUSD,
                                true,
                            )
                        ) {
                            resElement = {
                                id: limitOrder.limitOrderId,
                                type: 'limitSwapLine',
                                order: limitOrder,
                                totalValueUSD: limitOrder.totalValueUSD,
                                tokenFlowDecimalCorrected:
                                    tokenFlowDecimalCorrected,
                                mergedIds: mergedIds,
                            };
                        }

                        const line = [
                            ...swapOrderData,
                            {
                                x: new Date().getTime() + 5 * 86400 * 1000,
                                y: denomInBase
                                    ? limitOrder.invLimitPriceDecimalCorrected
                                    : limitOrder.limitPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                        ];

                        if (
                            checkLineLocation(line, mouseX, mouseY, denomInBase)
                        ) {
                            resElement = {
                                id: limitOrder.limitOrderId,
                                type: 'limitSwapLine',
                                order: limitOrder,
                                totalValueUSD: limitOrder.totalValueUSD,
                                tokenFlowDecimalCorrected:
                                    tokenFlowDecimalCorrected,
                                mergedIds: mergedIds,
                            };
                        }
                    }
                });
            }

            if (filteredTransactionalData && showSwap && userTransactionData) {
                filteredTransactionalData.forEach((element) => {
                    if (showSwap) {
                        const swapOrderData = [
                            {
                                x: element.order.txTime * 1000,
                                y: denomInBase
                                    ? element.order.swapInvPriceDecimalCorrected
                                    : element.order.swapPriceDecimalCorrected,
                                denomInBase: denomInBase,
                            },
                        ];

                        if (
                            checkSwapLoation(
                                swapOrderData,
                                mouseX,
                                mouseY,
                                element.totalValueUSD,
                            )
                        ) {
                            resElement = {
                                id: element.order.txId,
                                type: element.order.entityType,
                                order: element,
                                totalValueUSD: element.totalValueUSD,
                                tokenFlowDecimalCorrected:
                                    element.tokenFlowDecimalCorrected,
                                mergedIds: element.mergedIds,
                            };
                        }
                    }
                });
            }

            if (filteredLimitTxData && userTransactionData && showSwap) {
                filteredLimitTxData.forEach((element) => {
                    const swapOrderData = [
                        {
                            x: element.order.crossTime * 1000,
                            y: denomInBase
                                ? element.order.invLimitPriceDecimalCorrected
                                : element.order.limitPriceDecimalCorrected,
                            denomInBase: denomInBase,
                        },
                    ];

                    if (
                        checkSwapLoation(
                            swapOrderData,
                            mouseX,
                            mouseY,
                            element.totalValueUSD,
                        )
                    ) {
                        resElement = {
                            id: element.order.limitOrderId,
                            type: 'claimableLimit',
                            order: element,
                            totalValueUSD: element.totalValueUSD,
                            tokenFlowDecimalCorrected:
                                element.tokenFlowDecimalCorrected,
                            mergedIds: element.mergedIds,
                        };
                    }
                });
            }

            if (resElement && scaleData) {
                setHoveredOrderHistory(() => {
                    return resElement;
                });
                setIsHoveredOrderHistory(true);
                setHoverOHTooltip(true);
            } else {
                setHoveredOrderTooltipPlacement(() => undefined);
                setHoveredOrderHistory(() => undefined);
                setIsHoveredOrderHistory(false);
                setHoverOHTooltip(false);
            }

            if (onClick && scaleData) {
                if (resElement) {
                    const shouldSelect = selectedOrderHistory
                        ? resElement.id !== selectedOrderHistory?.id
                        : true;

                    shouldSelect &&
                        handleCardClick(resElement.id, resElement.type);

                    setSelectedOrderHistory(() => {
                        return shouldSelect ? resElement : undefined;
                    });

                    setIsSelectedOrderHistory(() => {
                        !shouldSelect && setCurrentTxActiveInTransactions('');
                        return shouldSelect;
                    });
                } else {
                    setCurrentTxActiveInTransactions('');
                    setSelectedOrderHistory(undefined);
                    setIsSelectedOrderHistory(false);
                }
            }

            return { order: resElement, isClicked: onClick };
        }
        return undefined;
    };

    return { drawnShapesHoverStatus, orderHistoryHoverStatus };
}
