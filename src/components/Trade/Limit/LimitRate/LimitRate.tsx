import { pinTickLower, pinTickUpper } from '@crocswap-libs/sdk';
import {
    ChangeEvent,
    Dispatch,
    SetStateAction,
    useContext,
    useEffect,
    useState,
} from 'react';
import { AiOutlineInfoCircle } from 'react-icons/ai';
import { HiMinus, HiPlus } from 'react-icons/hi';
import { removeLeadingZeros } from '../../../../ambient-utils/dataLayer';
import {
    pinTickToTickLower,
    pinTickToTickUpper,
} from '../../../../ambient-utils/dataLayer/functions/pinTick';
import { useSimulatedIsPoolInitialized } from '../../../../App/hooks/useSimulatedIsPoolInitialized';
import { AppStateContext } from '../../../../contexts/AppStateContext';
import { CrocEnvContext } from '../../../../contexts/CrocEnvContext';
import { PoolContext } from '../../../../contexts/PoolContext';
import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import { TradeTableContext } from '../../../../contexts/TradeTableContext';
import { FlexContainer } from '../../../../styled/Common';
import {
    LimitRateButton,
    LimitRateButtonContainer,
    TokenQuantityInput,
} from '../../../../styled/Components/TradeModules';
import {
    linkGenMethodsIF,
    useLinkGen,
} from '../../../../utils/hooks/useLinkGen';
import { updatesIF } from '../../../../utils/hooks/useUrlParams';
import { Chip } from '../../../Form/Chip';
import { ExplanationButton } from '../../../Form/Icons/Icons.styles';

interface propsIF {
    previousDisplayPrice: string;
    setPreviousDisplayPrice: Dispatch<SetStateAction<string>>;
    displayPrice: string;
    setDisplayPrice: Dispatch<SetStateAction<string>>;
    setPriceInputFieldBlurred: Dispatch<SetStateAction<boolean>>;
    isSellTokenBase: boolean;
    disable?: boolean;
    updateURL: (changes: updatesIF) => void;
}

export default function LimitRate(props: propsIF) {
    const {
        displayPrice,
        setDisplayPrice,
        isSellTokenBase,
        setPriceInputFieldBlurred,
        disable,
        updateURL,
    } = props;

    const {
        activeNetwork: { gridSize, chainId },
        globalPopup: { open: openGlobalPopup },
    } = useContext(AppStateContext);
    const { crocEnv } = useContext(CrocEnvContext);
    const { pool, usdPriceInverse, isTradeDollarizationEnabled, poolData } =
        useContext(PoolContext);
    const { showOrderPulseAnimation } = useContext(TradeTableContext);
    const linkGenLimit: linkGenMethodsIF = useLinkGen('limit');
    const isPoolInitialized = useSimulatedIsPoolInitialized();
    const {
        isDenomBase,
        setLimitTick,
        limitTick,
        isTokenAPrimary,
        setIsTokenAPrimary,
        tokenA,
        tokenB,
        isTokenABase: isBid,
        currentPoolPriceTick,
    } = useContext(TradeDataContext);

    const { basePrice, quotePrice, poolPriceDisplay } = poolData;

    const side: 'buy' | 'sell' =
        (isDenomBase && !isBid) || (!isDenomBase && isBid) ? 'buy' : 'sell';

    const increaseTick = (): void => {
        if (limitTick !== undefined) {
            setSelectedPreset(undefined);
            const newLimitTick: number = limitTick + gridSize;
            setLimitTick(newLimitTick);
            updateURL({ update: [['limitTick', newLimitTick]] });
            setPriceInputFieldBlurred(true);
        }
    };

    const decreaseTick = (): void => {
        if (limitTick !== undefined) {
            setSelectedPreset(undefined);
            const newLimitTick: number = limitTick - gridSize;
            setLimitTick(newLimitTick);
            updateURL({ update: [['limitTick', newLimitTick]] });
            setPriceInputFieldBlurred(true);
        }
    };

    const [topOfBookTickValue, setTopOfBookTickValue] = useState<
        number | undefined
    >();
    const [onePercentPresetTickValue, setOnePercentTickValue] = useState<
        number | undefined
    >();
    const [fivePercentPresetTickValue, setFivePercentTickValue] = useState<
        number | undefined
    >();
    const [tenPercentPresetTickValue, setTenPercentTickValue] = useState<
        number | undefined
    >();

    const [selectedPreset, setSelectedPreset] = useState<number | undefined>(
        undefined,
    );

    useEffect(() => {
        setTopOfBookTickValue(undefined);
        setOnePercentTickValue(undefined);
        setFivePercentTickValue(undefined);
        setTenPercentTickValue(undefined);
    }, [tokenA.address + tokenB.address]);

    const willLimitFail = async (testLimitTick: number) => {
        try {
            if (!crocEnv) return;

            const testOrder = isTokenAPrimary
                ? crocEnv.sell(tokenA.address, 0)
                : crocEnv.buy(tokenB.address, 0);

            const ko = testOrder.atLimit(
                isTokenAPrimary ? tokenB.address : tokenA.address,
                testLimitTick,
            );

            if (await ko.willMintFail()) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        (async () => {
            if (currentPoolPriceTick !== undefined) {
                let newTopOfBookLimit = isSellTokenBase
                    ? pinTickToTickLower(currentPoolPriceTick, gridSize) -
                      gridSize
                    : pinTickToTickUpper(currentPoolPriceTick, gridSize) +
                      gridSize;
                const willFail = await willLimitFail(newTopOfBookLimit);
                if (willFail) {
                    newTopOfBookLimit = isSellTokenBase
                        ? newTopOfBookLimit - gridSize
                        : newTopOfBookLimit + gridSize;
                }
                setTopOfBookTickValue(newTopOfBookLimit);
                if (selectedPreset === 0) {
                    setLimitTick(topOfBookTickValue);
                    updateURL({ update: [['limitTick', newTopOfBookLimit]] });
                    setPriceInputFieldBlurred(true);
                }
                setOnePercentTickValue(
                    isSellTokenBase
                        ? pinTickToTickLower(
                              currentPoolPriceTick - 1 * 100,
                              gridSize,
                          )
                        : pinTickToTickUpper(
                              currentPoolPriceTick + 1 * 100,
                              gridSize,
                          ),
                );
                setFivePercentTickValue(
                    isSellTokenBase
                        ? pinTickToTickLower(
                              currentPoolPriceTick - 5 * 100,
                              gridSize,
                          )
                        : pinTickToTickUpper(
                              currentPoolPriceTick + 5 * 100,
                              gridSize,
                          ),
                );
                setTenPercentTickValue(
                    isSellTokenBase
                        ? pinTickToTickLower(
                              currentPoolPriceTick - 10 * 100,
                              gridSize,
                          )
                        : pinTickToTickUpper(
                              currentPoolPriceTick + 10 * 100,
                              gridSize,
                          ),
                );
            }
        })();
    }, [currentPoolPriceTick, isSellTokenBase, gridSize, selectedPreset]);

    const updateLimitWithButton = (percent: number) => {
        if (!currentPoolPriceTick) return;
        const lowTick = currentPoolPriceTick - percent * 100;
        const highTick = currentPoolPriceTick + percent * 100;
        const pinnedTick: number = isSellTokenBase
            ? pinTickToTickLower(lowTick, gridSize)
            : pinTickToTickUpper(highTick, gridSize);

        setLimitTick(pinnedTick);
        updateURL({ update: [['limitTick', pinnedTick]] });
        setPriceInputFieldBlurred(true);
    };

    const handleLimitChange = async (value: string) => {
        if (pool) {
            if (parseFloat(value) === 0 || isNaN(parseFloat(value))) return;
            const limit = await pool.fromDisplayPrice(
                isDenomBase ? parseFloat(value) : 1 / parseFloat(value),
            );

            if (limit) {
                const pinnedTick: number = isSellTokenBase
                    ? pinTickLower(limit, gridSize)
                    : pinTickUpper(limit, gridSize);
                setLimitTick(pinnedTick);

                const newLimitNum = parseFloat(value);

                const currentPoolPriceNum = poolPriceDisplay
                    ? isDenomBase
                        ? 1 / poolPriceDisplay
                        : poolPriceDisplay
                    : undefined;

                const newLimitBelowCurrentPoolPrice = currentPoolPriceNum
                    ? newLimitNum < currentPoolPriceNum
                    : false;
                const shouldReverse =
                    side === 'sell'
                        ? newLimitBelowCurrentPoolPrice
                        : !newLimitBelowCurrentPoolPrice;

                if (shouldReverse) {
                    setIsTokenAPrimary((isTokenAPrimary) => !isTokenAPrimary);
                    linkGenLimit.redirect({
                        chain: chainId,
                        tokenA: tokenB.address,
                        tokenB: tokenA.address,
                        limitTick: pinnedTick,
                    });
                } else {
                    updateURL({ update: [['limitTick', pinnedTick]] });
                }
            }
        }
    };

    const isValidLimitInputString = (str: string) => {
        // matches dollar or non-dollar amounts
        return /^\$?\d*\.?\d*\$?$/.test(str); // allows $ at the end
        // return /^\$?\d*\.?\d*$/.test(str); // doesn't allow $ at the end
    };

    const handleOnChange = (input: string) => {
        if (!isValidLimitInputString(input)) return;
        setSelectedPreset(undefined);
        setDisplayPrice(input);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleKeyDown = (e: any) => {
        const target = e.target as HTMLInputElement;
        if (e.key === 'Enter') {
            target && handleOnBlur(target.value); // Trigger blur event
        }
    };

    const handleOnBlur = async (input: string) => {
        const inputStartsWithDollar = input.startsWith('$');
        const inputEndsWithDollar = input.endsWith('$');
        const isDollarized =
            inputStartsWithDollar ||
            inputEndsWithDollar ||
            isTradeDollarizationEnabled;
        const parsedInput = parseFloat(
            inputStartsWithDollar
                ? input.slice(1)
                : inputEndsWithDollar
                  ? input.slice(undefined, -1)
                  : input,
        );

        const convertedFromDollarNum = isDollarized
            ? isDenomBase
                ? quotePrice
                    ? parsedInput / quotePrice
                    : usdPriceInverse
                      ? parsedInput / usdPriceInverse
                      : undefined
                : basePrice
                  ? parsedInput / basePrice
                  : usdPriceInverse
                    ? parsedInput / usdPriceInverse
                    : undefined
            : undefined;

        const newDisplayPrice = removeLeadingZeros(
            isDollarized && convertedFromDollarNum
                ? convertedFromDollarNum.toString()
                : input,
        );

        await handleLimitChange(newDisplayPrice);
        setPriceInputFieldBlurred(true);
    };

    const balancedPresets: number[] = [0, 1, 5, 10];
    type presetValues = (typeof balancedPresets)[number];

    const limitTickMatchesPreset = (preset: number): boolean => {
        if (limitTick === undefined) {
            return false;
        } else if (preset === 0) {
            return limitTick === topOfBookTickValue;
        } else if (preset === 1) {
            return limitTick === onePercentPresetTickValue;
        } else if (preset === 5) {
            return limitTick === fivePercentPresetTickValue;
        } else if (preset === 10) {
            return limitTick === tenPercentPresetTickValue;
        } else {
            return false;
        }
    };

    return (
        <FlexContainer flexDirection='column' gap={4}>
            <FlexContainer
                alignItems='center'
                justifyContent='space-between'
                fontSize='body'
                color='text2'
            >
                <p>Price</p>
            </FlexContainer>

            <FlexContainer
                animation={showOrderPulseAnimation ? 'pulse' : ''}
                fullWidth
                justifyContent='space-between'
                alignItems='center'
                gap={4}
                id='limit_rate'
            >
                <FlexContainer
                    fullWidth
                    background='dark2'
                    style={{ borderRadius: 'var(--border-radius)' }}
                    padding='0 16px'
                >
                    <TokenQuantityInput
                        id='limit_rate_input'
                        onFocus={() => {
                            const limitRateInputField =
                                document.getElementById('limit_rate_input');
                            (limitRateInputField as HTMLInputElement).select();
                        }}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOnChange(e.target.value)
                        }
                        placeholder={
                            !isPoolInitialized
                                ? 'Pool not initialized'
                                : isTradeDollarizationEnabled
                                  ? '$0.00'
                                  : '0.0'
                        }
                        onBlur={(e: ChangeEvent<HTMLInputElement>) =>
                            handleOnBlur(e.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        value={
                            !isPoolInitialized
                                ? 'Pool not initialized'
                                : displayPrice === 'NaN'
                                  ? '...'
                                  : isTradeDollarizationEnabled &&
                                      !displayPrice.startsWith('$')
                                    ? '$' + displayPrice
                                    : displayPrice
                        }
                        type='string'
                        step='any'
                        inputMode='text'
                        autoComplete='off'
                        autoCorrect='off'
                        min='0'
                        minLength={1}
                        disabled={disable || !isPoolInitialized}
                        tabIndex={0}
                        aria-label='Limit Price.'
                        aria-live='polite'
                        aria-atomic='true'
                        aria-relevant='all'
                    />
                </FlexContainer>
                <LimitRateButtonContainer
                    flexDirection='column'
                    justifyContent='center'
                    alignItems='center'
                    background='dark2'
                    disabled={!isPoolInitialized}
                >
                    <LimitRateButton
                        id='increase_limit_rate_button'
                        onClick={!isDenomBase ? increaseTick : decreaseTick}
                        aria-label='Increase limit tick.'
                    >
                        <HiPlus />
                    </LimitRateButton>
                    <LimitRateButton
                        id='decrease_limit_tick_button'
                        onClick={!isDenomBase ? decreaseTick : increaseTick}
                        aria-label='Decrease limit tick.'
                    >
                        <HiMinus />
                    </LimitRateButton>
                </LimitRateButtonContainer>
            </FlexContainer>
            <FlexContainer
                fullWidth
                wrap
                alignItems='center'
                gap={10}
                padding='8px 0 0 8px'
            >
                {balancedPresets.map((preset: presetValues) => {
                    const humanReadable: string =
                        preset === 0 ? 'Top of Book' : preset.toString() + '%';
                    return (
                        <Chip
                            key={humanReadable}
                            id={`limit_rate_preset_${humanReadable}`}
                            variant={
                                limitTickMatchesPreset(preset)
                                    ? 'filled'
                                    : 'secondary'
                            }
                            onClick={() => {
                                if (preset === 0) {
                                    setSelectedPreset(0);
                                } else if (preset) {
                                    setSelectedPreset(preset);
                                    updateLimitWithButton(preset);
                                }
                            }}
                            aria-label={`Set limit rate to ${humanReadable}.`}
                        >
                            {humanReadable}
                        </Chip>
                    );
                })}
                <ExplanationButton
                    onClick={() =>
                        openGlobalPopup(
                            <div>
                                The price you specify is the pool price at which
                                your limit order will be completely filled and
                                claimable. The Top of Book preset will pin the
                                limit price as close as possible to the current
                                pool price, reducing the expected fill time for
                                a successfully created limit order, but
                                increasing the chances your limit order creation
                                will fail should the pool price move toward your
                                limit price during your transaction. You can
                                remove an unfilled or partially filled limit
                                order at any time before fill completion.
                            </div>,
                            'Limit Price',
                            'right',
                        )
                    }
                    aria-label='Open limit rate explanation popup.'
                >
                    <AiOutlineInfoCircle color='var(--text2)' />
                </ExplanationButton>
            </FlexContainer>
        </FlexContainer>
    );
}
