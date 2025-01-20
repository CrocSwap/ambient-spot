import * as d3 from 'd3';
import React, {
    createContext,
    Dispatch,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import {
    chartSettingsMethodsIF,
    useChartSettings,
} from '../App/hooks/useChartSettings';
import { getLocalStorageItem } from '../ambient-utils/dataLayer';
import {
    LS_KEY_CHART_ANNOTATIONS,
    LS_KEY_CHART_CONTEXT_SETTINGS,
} from '../pages/platformAmbient/Chart/ChartUtils/chartConstants';
import {
    drawDataHistory,
    getCssVariable,
    selectedDrawnData,
} from '../pages/platformAmbient/Chart/ChartUtils/chartUtils';
import {
    actionKeyIF,
    actionStackIF,
    useUndoRedo,
} from '../pages/platformAmbient/Chart/ChartUtils/useUndoRedo';
import { BrandContext } from './BrandContext';
import { TradeDataContext, TradeDataContextIF } from './TradeDataContext';

type TradeTableState = 'Expanded' | 'Collapsed' | undefined;

interface ChartHeights {
    current: number;
    saved: number;
    min: number;
    max: number;
    default: number;
}

export interface ChartContextIF {
    chartSettings: chartSettingsMethodsIF;
    isFullScreen: boolean;
    setIsFullScreen: (val: boolean) => void;
    setChartHeight: (val: number) => void;
    chartHeights: ChartHeights;
    isEnabled: boolean;
    canvasRef: React.MutableRefObject<null>;
    chartCanvasRef: React.MutableRefObject<null>;
    tradeTableState: TradeTableState;
    isMagnetActive: { value: boolean };
    setIsMagnetActive: React.Dispatch<{ value: boolean }>;
    isChangeScaleChart: boolean;
    setIsChangeScaleChart: React.Dispatch<boolean>;
    isCandleDataNull: boolean;
    setIsCandleDataNull: Dispatch<SetStateAction<boolean>>;
    isToolbarOpen: boolean;
    setIsToolbarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    undoRedoOptions: {
        undo: () => void;
        redo: () => void;
        deleteItem: (item: drawDataHistory) => void;
        currentPool: TradeDataContextIF;
        drawnShapeHistory: drawDataHistory[];
        setDrawnShapeHistory: React.Dispatch<SetStateAction<drawDataHistory[]>>;
        drawActionStack: Map<actionKeyIF, actionStackIF[]>;
        actionKey: actionKeyIF;
        addDrawActionStack: (
            tempLastData: drawDataHistory,
            isNewShape: boolean,
            type: string,
            updatedData?: drawDataHistory | undefined,
        ) => void;
        undoStack: Map<actionKeyIF, actionStackIF[]>;
        deleteAllShapes: () => void;
        currentPoolDrawnShapes: drawDataHistory[];
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolbarRef: React.MutableRefObject<any>;
    activeDrawingType: string;
    setActiveDrawingType: React.Dispatch<SetStateAction<string>>;
    selectedDrawnShape: selectedDrawnData | undefined;
    setSelectedDrawnShape: React.Dispatch<
        SetStateAction<selectedDrawnData | undefined>
    >;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chartContainerOptions: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setChartContainerOptions: React.Dispatch<SetStateAction<any>>;
    isChartHeightMinimum: boolean;
    setIsChartHeightMinimum: React.Dispatch<SetStateAction<boolean>>;
    isMagnetActiveLocal: boolean;
    setIsMagnetActiveLocal: React.Dispatch<SetStateAction<boolean>>;
    setChartThemeColors: React.Dispatch<
        SetStateAction<ChartThemeIF | undefined>
    >;
    chartThemeColors: ChartThemeIF | undefined;
    setColorChangeTrigger: React.Dispatch<SetStateAction<boolean>>;
    colorChangeTrigger: boolean;
    defaultChartSettings: LocalChartSettingsIF | undefined;
    setContextmenu: React.Dispatch<SetStateAction<boolean>>;
    contextmenu: boolean;
    setShouldResetBuffer: React.Dispatch<SetStateAction<boolean>>;
    shouldResetBuffer: boolean;
    contextMenuPlacement:
        | {
              top: number;
              left: number;
              isReversed: boolean;
          }
        | undefined;
    setContextMenuPlacement: React.Dispatch<
        SetStateAction<
            | {
                  top: number;
                  left: number;
                  isReversed: boolean;
              }
            | undefined
        >
    >;
}

export interface ChartThemeIF {
    // candle color
    upCandleBodyColor: d3.RGBColor | d3.HSLColor;
    downCandleBodyColor: d3.RGBColor | d3.HSLColor;
    upCandleBorderColor: d3.RGBColor | d3.HSLColor;
    downCandleBorderColor: d3.RGBColor | d3.HSLColor;

    selectedDateFillColor: d3.RGBColor | d3.HSLColor;

    // liq Color
    liqAskColor: d3.RGBColor | d3.HSLColor;
    liqBidColor: d3.RGBColor | d3.HSLColor;

    // line color
    rangeLinesColor: d3.RGBColor | d3.HSLColor;
    limitLineColor: d3.RGBColor | d3.HSLColor;
    shareableLineColor: d3.RGBColor | d3.HSLColor;

    // triangle color
    triangleColor: d3.RGBColor | d3.HSLColor;

    // drawing color
    drawngShapeDefaultColor: d3.RGBColor | d3.HSLColor;

    selectedDateStrokeColor: d3.RGBColor | d3.HSLColor;
    text2: d3.RGBColor | d3.HSLColor;
    text1: d3.RGBColor | d3.HSLColor;
    accent1: d3.RGBColor | d3.HSLColor;
    accent3: d3.RGBColor | d3.HSLColor;
    dark1: d3.RGBColor | d3.HSLColor;
    dark4: d3.RGBColor | d3.HSLColor;
    [key: string]: d3.RGBColor | d3.HSLColor;
}

export interface LocalChartSettingsIF {
    chartColors: ChartThemeIF;
    isTradeDollarizationEnabled: boolean;
    showVolume: boolean;
    showTvl: boolean;
    showFeeRate: boolean;
}

export const ChartContext = createContext({} as ChartContextIF);

export const ChartContextProvider = (props: { children: React.ReactNode }) => {
    const { skin, platformName } = useContext(BrandContext);

    const isFuta = ['futa'].includes(platformName);

    // 2:1 ratio of the window height subtracted by main header and token info header
    // 1:1 ratio, if the screen is less than 1000px in height
    const CHART_MAX_HEIGHT = window.innerHeight - 160;
    const CHART_MIN_HEIGHT = 4;
    const CHART_DEFAULT_HEIGHT = Math.floor(
        (CHART_MAX_HEIGHT * 2) / (window.innerHeight > 1000 ? 3 : 4),
    );
    let CHART_SAVED_HEIGHT = CHART_DEFAULT_HEIGHT;

    // Fetch alternative default height from local storage if it exists
    const CHART_SAVED_HEIGHT_LOCAL_STORAGE =
        localStorage.getItem('savedChartHeight');

    if (CHART_SAVED_HEIGHT_LOCAL_STORAGE && !isFuta) {
        CHART_SAVED_HEIGHT = parseInt(CHART_SAVED_HEIGHT_LOCAL_STORAGE);
    }

    if (isFuta) {
        CHART_SAVED_HEIGHT = CHART_MAX_HEIGHT + 50;
    }

    const CHART_CONTEXT_SETTINGS_LOCAL_STORAGE = localStorage.getItem(
        LS_KEY_CHART_CONTEXT_SETTINGS,
    );

    const [isCandleDataNull, setIsCandleDataNull] = useState(false);

    const chartAnnotations: {
        isMagnetActive: boolean;
    } | null = JSON.parse(
        getLocalStorageItem(LS_KEY_CHART_ANNOTATIONS) ?? '{}',
    );

    const [isMagnetActive, setIsMagnetActive] = useState({
        value: chartAnnotations?.isMagnetActive ?? false,
    });

    const [isMagnetActiveLocal, setIsMagnetActiveLocal] = useState(
        isMagnetActive.value,
    );

    const { isDenomBase, isTokenABase } = useContext(TradeDataContext);
    const toolbarRef = useRef<HTMLDivElement | null>(null);

    const denominationsInBase = isDenomBase;
    const undoRedoOptions = useUndoRedo(denominationsInBase, isTokenABase);
    const [isChangeScaleChart, setIsChangeScaleChart] = useState(false);

    const [activeDrawingType, setActiveDrawingType] = useState('Cross');

    const [selectedDrawnShape, setSelectedDrawnShape] = useState<
        selectedDrawnData | undefined
    >(undefined);

    const [chartContainerOptions, setChartContainerOptions] = useState();

    const [isChartHeightMinimum, setIsChartHeightMinimum] = useState(false);

    const [contextmenu, setContextmenu] = useState(false);

    const [shouldResetBuffer, setShouldResetBuffer] = useState(true);

    const [contextMenuPlacement, setContextMenuPlacement] = useState<{
        top: number;
        left: number;
        isReversed: boolean;
    }>();

    const [chartHeights, setChartHeights] = useState<{
        current: number;
        saved: number;
        min: number;
        max: number;
        default: number;
    }>({
        current: CHART_SAVED_HEIGHT,
        saved: CHART_SAVED_HEIGHT,
        min: CHART_MIN_HEIGHT,
        max: CHART_MAX_HEIGHT,
        default: CHART_DEFAULT_HEIGHT,
    });

    const [chartThemeColors, setChartThemeColors] = useState<
        ChartThemeIF | undefined
    >(undefined);

    const [colorChangeTrigger, setColorChangeTrigger] = useState(false);

    const [defaultChartSettings, setDefaultChartSettings] =
        useState<LocalChartSettingsIF>();

    // the max size is based on the max height, and is subtracting the minimum size of table and the padding around the drag bar
    useEffect(() => {
        const updateDimension = () => {
            setChartHeights({
                ...chartHeights,
                min: CHART_MIN_HEIGHT,
                max: CHART_MAX_HEIGHT,
                default: CHART_DEFAULT_HEIGHT,
            });
        };
        window.addEventListener('resize', updateDimension);
        return () => {
            window.removeEventListener('resize', updateDimension);
        };
    }, [window.innerHeight, chartHeights]);

    const { pathname: currentLocation } = useLocation();
    const canvasRef = useRef(null);
    const chartCanvasRef = useRef(null);

    const [fullScreenChart, setFullScreenChart] = useState(false);
    const setChartHeight = (val: number) => {
        if (val > CHART_MIN_HEIGHT && val < CHART_MAX_HEIGHT) {
            localStorage.setItem('savedChartHeight', val.toString());
        }

        setChartHeights({
            ...chartHeights,
            current: val,
            saved:
                val > CHART_MIN_HEIGHT && val < CHART_MAX_HEIGHT
                    ? val
                    : chartHeights.saved,
            default: CHART_DEFAULT_HEIGHT,
        });
    };

    const tradeTableState: TradeTableState =
        chartHeights.current === chartHeights.min
            ? 'Expanded'
            : chartHeights.current === chartHeights.max
              ? 'Collapsed'
              : undefined;

    const isChartEnabled =
        !!import.meta.env.VITE_CHART_IS_ENABLED &&
        import.meta.env.VITE_CHART_IS_ENABLED.toLowerCase() === 'false'
            ? false
            : true;

    const initialData = localStorage.getItem(LS_KEY_CHART_ANNOTATIONS);

    const initialIsToolbarOpen = initialData
        ? JSON.parse(initialData).isOpenAnnotationPanel
        : true;

    const [isToolbarOpen, setIsToolbarOpen] =
        useState<boolean>(initialIsToolbarOpen);

    const chartSettings = useChartSettings();

    const chartContext = {
        chartSettings,
        isFullScreen: fullScreenChart,
        setIsFullScreen: setFullScreenChart,
        chartHeights,
        setChartHeight,
        isEnabled: isChartEnabled,
        canvasRef,
        chartCanvasRef,
        tradeTableState,
        isMagnetActive,
        setIsMagnetActive,
        isChangeScaleChart,
        setIsChangeScaleChart,
        isCandleDataNull,
        setIsCandleDataNull,
        isToolbarOpen,
        setIsToolbarOpen,
        undoRedoOptions,
        toolbarRef,
        activeDrawingType,
        setActiveDrawingType,
        selectedDrawnShape,
        setSelectedDrawnShape,
        chartContainerOptions,
        setChartContainerOptions,
        isChartHeightMinimum,
        setIsChartHeightMinimum,
        isMagnetActiveLocal,
        setIsMagnetActiveLocal,
        chartThemeColors,
        setChartThemeColors,
        colorChangeTrigger,
        setColorChangeTrigger,
        defaultChartSettings,
        contextmenu,
        setContextmenu,
        contextMenuPlacement,
        setContextMenuPlacement,
        shouldResetBuffer,
        setShouldResetBuffer,
    };

    useEffect(() => {
        setIsChartHeightMinimum(chartHeights.current <= CHART_MIN_HEIGHT);
    }, [chartHeights.current]);

    useEffect(() => {
        if (!currentLocation.startsWith('/trade')) {
            setFullScreenChart(false);
        }
    }, [currentLocation]);

    useEffect(() => {
        const storedData = localStorage.getItem(LS_KEY_CHART_ANNOTATIONS);
        if (!storedData) {
            localStorage.setItem(
                LS_KEY_CHART_ANNOTATIONS,
                JSON.stringify({
                    isOpenAnnotationPanel: true,
                    drawnShapes: [],
                    isMagnetActive: false,
                }),
            );
        }
    }, []);

    useEffect(() => {
        const storedData = localStorage.getItem(LS_KEY_CHART_ANNOTATIONS);
        if (storedData && !isFuta) {
            const parseStoredData = JSON.parse(storedData);
            parseStoredData.isMagnetActive = isMagnetActive.value;
            localStorage.setItem(
                LS_KEY_CHART_ANNOTATIONS,
                JSON.stringify(parseStoredData),
            );
        }
    }, [isMagnetActive]);

    useEffect(() => {
        const chartDefaultColorVariables = {
            upCandleBodyColor: getCssVariable(
                skin.active,
                '--chart-positive-body',
            ),
            upCandleBorderColor: getCssVariable(
                skin.active,
                '--chart-positive-border',
            ),
            downCandleBodyColor: getCssVariable(
                skin.active,
                '--chart-negative-body',
            ),
            downCandleBorderColor: getCssVariable(
                skin.active,
                '--chart-negative-border',
            ),
            selectedDateFillColor: getCssVariable(
                skin.active,
                '--chart-selected-color',
            ),
            selectedDateStrokeColor: getCssVariable(
                skin.active,
                '--chart-selected-color',
            ),
            liqAskColor: getCssVariable(skin.active, '--liq-ask-color'),
            liqBidColor: getCssVariable(skin.active, '--liq-bid-color'),
            rangeLinesColor: getCssVariable(
                skin.active,
                '--chart-range-lines-color',
            ),
            limitLineColor: getCssVariable(
                skin.active,
                '--chart-limit-line-color',
            ),
            shareableLineColor: getCssVariable(
                skin.active,
                '--shareable-line-color',
            ),
            triangleColor: getCssVariable(skin.active, '--triangle-color'),
            drawngShapeDefaultColor: getCssVariable(skin.active, '--accent1'),
            textColor: getCssVariable(skin.active, '--text2'),
            text1: getCssVariable(skin.active, '--text1'),
            text2: getCssVariable(skin.active, '--text2'),
            accent3: getCssVariable(skin.active, '--accent3'),
            accent1: getCssVariable(skin.active, '--accent1'),
            dark1: getCssVariable(skin.active, '--dark1'),
            dark4: getCssVariable(skin.active, '--dark4'),
        };

        setDefaultChartSettings({
            chartColors: chartDefaultColorVariables,
            isTradeDollarizationEnabled: false,
            showVolume: true,
            showTvl: false,
            showFeeRate: false,
        });
    }, [skin.active]);

    function getColorFromLocalStorageOrDefault(key: string) {
        if (CHART_CONTEXT_SETTINGS_LOCAL_STORAGE && defaultChartSettings) {
            const defaultValue = defaultChartSettings.chartColors[key];

            const colorObj = JSON.parse(
                CHART_CONTEXT_SETTINGS_LOCAL_STORAGE,
            )?.chartColors;

            return (colorObj && d3.color(colorObj[key])) || defaultValue;
        }

        return;
    }

    useEffect(() => {
        if (defaultChartSettings) {
            if (CHART_CONTEXT_SETTINGS_LOCAL_STORAGE) {
                const chartDefaultColorVariables = {
                    upCandleBodyColor:
                        getColorFromLocalStorageOrDefault('upCandleBodyColor'),
                    upCandleBorderColor: getColorFromLocalStorageOrDefault(
                        'upCandleBorderColor',
                    ),
                    downCandleBodyColor: getColorFromLocalStorageOrDefault(
                        'downCandleBodyColor',
                    ),
                    downCandleBorderColor: getColorFromLocalStorageOrDefault(
                        'downCandleBorderColor',
                    ),
                    selectedDateFillColor: getColorFromLocalStorageOrDefault(
                        'selectedDateFillColor',
                    ),
                    selectedDateStrokeColor: getColorFromLocalStorageOrDefault(
                        'selectedDateStrokeColor',
                    ),
                    liqAskColor:
                        getColorFromLocalStorageOrDefault('liqAskColor'),
                    liqBidColor:
                        getColorFromLocalStorageOrDefault('liqBidColor'),
                    rangeLinesColor:
                        getColorFromLocalStorageOrDefault('rangeLinesColor'),
                    limitLineColor:
                        getColorFromLocalStorageOrDefault('limitLineColor'),

                    triangleColor:
                        getColorFromLocalStorageOrDefault('triangleColor'),
                    shareableLineColor:
                        getColorFromLocalStorageOrDefault('shareableLineColor'),
                    drawngShapeDefaultColor: getColorFromLocalStorageOrDefault(
                        'drawngShapeDefaultColor',
                    ),
                    textColor: getColorFromLocalStorageOrDefault('textColor'),
                    text1: getColorFromLocalStorageOrDefault('text1'),
                    text2: getColorFromLocalStorageOrDefault('text2'),
                    accent3: getColorFromLocalStorageOrDefault('accent3'),
                    accent1: getColorFromLocalStorageOrDefault('accent1'),
                    dark1: getColorFromLocalStorageOrDefault('dark1'),
                    dark4: getColorFromLocalStorageOrDefault('dark4'),
                };

                setChartThemeColors(() => chartDefaultColorVariables);
            } else {
                if (defaultChartSettings) {
                    setChartThemeColors(() => {
                        return { ...defaultChartSettings.chartColors };
                    });
                }
            }
        }
    }, [defaultChartSettings]);

    return (
        <ChartContext.Provider value={chartContext}>
            {props.children}
        </ChartContext.Provider>
    );
};
