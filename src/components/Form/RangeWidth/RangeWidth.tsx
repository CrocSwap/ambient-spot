import {
    ChangeEvent,
    Dispatch,
    memo,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
} from 'react';
import { AiOutlineInfoCircle } from 'react-icons/ai';

import { AppStateContext } from '../../../contexts/AppStateContext';
import { TradeTableContext } from '../../../contexts/TradeTableContext';

import {
    isStablePair,
    truncateDecimals,
} from '../../../ambient-utils/dataLayer';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { FlexContainer, Text } from '../../../styled/Common';
import { Chip } from '../Chip';
import { ExplanationButton } from '../Icons/Icons.styles';
import RangeSlider from '../RangeSlider';

// interface for React functional component props
interface propsIF {
    rangeWidthPercentage: number;
    setRangeWidthPercentage: Dispatch<SetStateAction<number>>;
    setRescaleRangeBoundariesWithSlider: Dispatch<SetStateAction<boolean>>;
}

// React functional component
function RangeWidth(props: propsIF) {
    const {
        rangeWidthPercentage,
        setRangeWidthPercentage,
        setRescaleRangeBoundariesWithSlider,
    } = props;
    const {
        globalPopup: { open: openGlobalPopup },
    } = useContext(AppStateContext);
    const { showRangePulseAnimation } = useContext(TradeTableContext);

    const { tokenA, tokenB } = useContext(TradeDataContext);
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);

    const shouldDisplaySub5PercentWidths = isStablePair(
        tokenA.address,
        tokenB.address,
        chainId,
    );

    // values to generate balanced mode preset buttons
    // const balancedPresets: number[] = [5, 10, 25, 50, 100];
    const balancedPresets: number[] = shouldDisplaySub5PercentWidths
        ? [0.1, 0.25, 0.5, 1, 5, 10, 100]
        : [5, 10, 25, 50, 100];
    // type annotation as union of number-literals in `balancedPresets`
    type presetValues = (typeof balancedPresets)[number];

    // The native <input type=range> thumb tracks the cursor on its own. The
    // expensive part is the `setRangeWidthPercentage` context update, which
    // cascades into a re-render of the whole Range page plus every chart effect
    // keyed on the range width. Firing that synchronously on every `input`
    // event blocks the main thread and makes the thumb visibly lag the cursor.
    // We coalesce updates to at most one per animation frame (always using the
    // latest value) so the handler returns immediately and the thumb stays
    // glued to the cursor while the heavy work runs once per frame.
    const rafIdRef = useRef<number | null>(null);
    const latestValueRef = useRef<number>(rangeWidthPercentage);

    useEffect(() => {
        return () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
            }
        };
    }, []);

    function handleSliderChange(event: ChangeEvent<HTMLInputElement>): void {
        latestValueRef.current = parseFloat(
            truncateDecimals(parseFloat(event.target.value), 2),
        );
        if (rafIdRef.current !== null) return;
        rafIdRef.current = requestAnimationFrame(() => {
            rafIdRef.current = null;
            setRangeWidthPercentage(latestValueRef.current);
        });
    }

    // fn to update the width of range (balanced mode) from buttons
    function updateRangeWithButton(value: presetValues): void {
        // convert the numerical input to a string
        const valueString: string = value.toString();
        // locate the range adjustment slider in the DOM
        const inputSlider: HTMLElement | null =
            document.getElementById('input-slider-range');
        // set the range adjustment slider to the value provided in args
        if (inputSlider) {
            (inputSlider as HTMLInputElement).value = valueString;
        }
        // set the input value to two decimals of precision
        const truncatedValue: string = truncateDecimals(value, 2);
        // convert input value to a float and update range width
        setRangeWidthPercentage(parseFloat(truncatedValue));
        setRescaleRangeBoundariesWithSlider(true);
    }

    return (
        <FlexContainer
            fullWidth
            transition
            flexDirection='column'
            gap={16}
            id='range_width'
            margin='0 0 16px 0'
        >
            <FlexContainer
                fullWidth
                wrap
                justifyContent='center'
                alignItems='center'
                gap={4}
            >
                {balancedPresets.map((preset: presetValues) => {
                    // convert raw preset data to human-readable strings
                    const humanReadable: string =
                        preset === 100 ? 'Ambient' : preset.toString() + '%';
                    // return a JSX element clickable for each preset
                    return (
                        <Chip
                            key={humanReadable}
                            id={`range_width_preset_${humanReadable}`}
                            variant={
                                rangeWidthPercentage === preset
                                    ? 'filled'
                                    : 'secondary'
                            }
                            onClick={() => updateRangeWithButton(preset)}
                            aria-label={`Set range width to ${humanReadable}.`}
                        >
                            {humanReadable}
                        </Chip>
                    );
                })}
                <ExplanationButton
                    onClick={() =>
                        openGlobalPopup(
                            <div>
                                Ambient liquidity remains fully in range
                                regardless of pool price, but accumulates
                                rewards at lower rates.
                            </div>,
                            'Ambient Range Width',
                            'right',
                        )
                    }
                    aria-label='Open range width explanation popup.'
                >
                    <AiOutlineInfoCircle color='var(--text2)' />
                </ExplanationButton>
            </FlexContainer>
            <FlexContainer
                justifyContent='center'
                fontWeight='300'
                fontSize='header1'
                color='text1'
                animation={showRangePulseAnimation ? 'flicker' : ''}
                id='percentage-output'
                aria-live='polite'
                aria-atomic='true'
                aria-relevant='all'
            >
                <Text color='text2' fontWeight='300' id='bal_range_width'>
                    {rangeWidthPercentage === 100
                        ? 'Ambient'
                        : `± ${rangeWidthPercentage}%`}
                </Text>
                <ExplanationButton
                    style={{ margin: '0 8px', cursor: 'pointer' }}
                    onClick={() =>
                        openGlobalPopup(
                            <div>
                                <p>
                                    Percentage width of the range around current
                                    pool price.
                                </p>
                                <p>
                                    Tighter ranges accumulate rewards at faster
                                    rates, but are more likely to suffer
                                    divergence losses.
                                </p>
                            </div>,
                            'Range Width',
                            'right',
                        )
                    }
                >
                    <AiOutlineInfoCircle size={17} />
                </ExplanationButton>
            </FlexContainer>
            <FlexContainer
                alignItems='center'
                padding='0 16px'
                height='40px'
                justifyContent='center'
            >
                <RangeSlider
                    percentageInput
                    defaultValue={rangeWidthPercentage}
                    id='input-slider-range'
                    onChange={handleSliderChange}
                    onClick={() => {
                        setRescaleRangeBoundariesWithSlider(true);
                    }}
                />
            </FlexContainer>
        </FlexContainer>
    );
}

export default memo(RangeWidth);
