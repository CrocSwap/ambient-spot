import {
    createContext,
    Dispatch,
    ReactNode,
    SetStateAction,
    useState,
} from 'react';

export interface RangeContextIF {
    rangeTicksCopied: boolean;
    setRangeTicksCopied: Dispatch<SetStateAction<boolean>>;
    maxRangePrice: number;
    setMaxRangePrice: Dispatch<SetStateAction<number>>;
    minRangePrice: number;
    setMinRangePrice: Dispatch<SetStateAction<number>>;
    simpleRangeWidth: number;
    setSimpleRangeWidth: Dispatch<SetStateAction<number>>;
    rescaleRangeBoundariesWithSlider: boolean;
    setRescaleRangeBoundariesWithSlider: Dispatch<SetStateAction<boolean>>;
    chartTriggeredBy: string;
    setChartTriggeredBy: Dispatch<SetStateAction<string>>;
    currentRangeInReposition: string;
    setCurrentRangeInReposition: Dispatch<SetStateAction<string>>;
    currentRangeInAdd: string;
    setCurrentRangeInAdd: Dispatch<SetStateAction<string>>;
    advancedMode: boolean;
    advancedLowTick: number;
    advancedHighTick: number;
    setAdvancedMode: Dispatch<SetStateAction<boolean>>;
    setAdvancedLowTick: Dispatch<SetStateAction<number>>;
    setAdvancedHighTick: Dispatch<SetStateAction<number>>;
    isLinesSwitched: boolean | undefined;
    setIsLinesSwitched: Dispatch<SetStateAction<boolean | undefined>>;
}

export const RangeContext = createContext({} as RangeContextIF);

export const RangeContextProvider = (props: { children: ReactNode }) => {
    // low and high bounds of range to display in DOM for advanced mode
    const [maxRangePrice, setMaxRangePrice] = useState<number>(0);
    const [minRangePrice, setMinRangePrice] = useState<number>(0);

    const [rangeTicksCopied, setRangeTicksCopied] = useState<boolean>(false);
    const [simpleRangeWidth, setSimpleRangeWidth] = useState<number>(10);

    const [currentRangeInReposition, setCurrentRangeInReposition] =
        useState<string>('');
    const [currentRangeInAdd, setCurrentRangeInAdd] = useState<string>('');
    const [advancedMode, setAdvancedMode] = useState<boolean>(false);
    const [advancedLowTick, setAdvancedLowTick] = useState<number>(0);
    const [advancedHighTick, setAdvancedHighTick] = useState<number>(0);
    const [
        rescaleRangeBoundariesWithSlider,
        setRescaleRangeBoundariesWithSlider,
    ] = useState<boolean>(false);
    const [chartTriggeredBy, setChartTriggeredBy] = useState<string>('');
    const [isLinesSwitched, setIsLinesSwitched] = useState<boolean | undefined>(
        undefined,
    );
    const rangeContext = {
        maxRangePrice,
        setMaxRangePrice,
        minRangePrice,
        setMinRangePrice,
        simpleRangeWidth,
        setSimpleRangeWidth,
        rescaleRangeBoundariesWithSlider,
        setRescaleRangeBoundariesWithSlider,
        chartTriggeredBy,
        setChartTriggeredBy,
        currentRangeInReposition,
        setCurrentRangeInReposition,
        currentRangeInAdd,
        setCurrentRangeInAdd,
        rangeTicksCopied,
        setRangeTicksCopied,
        advancedMode,
        setAdvancedMode,
        advancedLowTick,
        setAdvancedLowTick,
        advancedHighTick,
        setAdvancedHighTick,
        isLinesSwitched,
        setIsLinesSwitched,
    };

    return <RangeContext value={rangeContext}>{props.children}</RangeContext>;
};
