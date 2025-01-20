import { useMemo } from 'react';
import { diffHashSig } from '../../ambient-utils/dataLayer';
import { ChartThemeIF } from '../../contexts/ChartContext';
import { LS_KEY_CHART_ANNOTATIONS } from '../../pages/platformAmbient/Chart/ChartUtils/chartConstants';
import {
    drawnShapeDefaultDash,
    drawnShapeDefaultLineWidth,
    fibDefaultLevels,
    fibonacciDefaultDash,
} from '../../pages/platformAmbient/Chart/ChartUtils/drawConstants';

export const useDrawSettings = (chartThemeColors: ChartThemeIF | undefined) => {
    const drawnShapeDefaultColor =
        chartThemeColors && chartThemeColors.drawngShapeDefaultColor
            ? chartThemeColors.drawngShapeDefaultColor.toString()
            : '#7371fc';

    const d3BackgroundColor = chartThemeColors
        ? chartThemeColors.drawngShapeDefaultColor
        : undefined;

    if (d3BackgroundColor) d3BackgroundColor.opacity = 0.15;

    const drawnShapeDefaultBackgroundColor = d3BackgroundColor
        ? d3BackgroundColor.toString()
        : 'rgba(115, 113, 252, 0.15)';

    const defaultShapeAttributes = {
        color: drawnShapeDefaultColor,
        lineWidth: drawnShapeDefaultLineWidth,
        dash: drawnShapeDefaultDash,
    };

    const defaultShapeBackgroundAttributes = {
        color: drawnShapeDefaultBackgroundColor,
        lineWidth: drawnShapeDefaultLineWidth,
        dash: drawnShapeDefaultDash,
    };

    const defaultFibonacciShapeAttributes = {
        color: drawnShapeDefaultColor,
        lineWidth: drawnShapeDefaultLineWidth,
        dash: fibonacciDefaultDash,
    };

    const defaultLineDrawnShapeEditAttributes = {
        line: { active: true, ...defaultShapeAttributes },
        border: { active: false, ...defaultShapeAttributes },
        background: { active: false, ...defaultShapeBackgroundAttributes },
    };

    const defaultFibonacciDrawnShapeEditAttributes = {
        line: { active: true, ...defaultFibonacciShapeAttributes },
        border: { active: false, ...defaultShapeAttributes },
        background: { active: false, ...defaultShapeBackgroundAttributes },
        extraData: fibDefaultLevels,
        extendLeft: false,
        extendRight: false,
        labelPlacement: 'Left',
        labelAlignment: 'Middle',
        reverse: false,
    };

    const defaultRectDrawnShapeEditAttributes = {
        line: { active: false, ...defaultShapeAttributes },
        border: { active: true, ...defaultShapeAttributes },
        background: { active: true, ...defaultShapeBackgroundAttributes },
    };

    const defaultDpRangeDrawnShapeEditAttributes = {
        line: { active: true, ...defaultShapeAttributes },
        border: { active: false, ...defaultShapeAttributes },
        background: { active: true, ...defaultShapeBackgroundAttributes },
    };

    // const defaultDrawnShapeEditAttributes = {
    //     border: { active: true, ...defaultShapeAttributes },
    //     background: { active: true, ...defaultShapeBackgroundAttributes },
    //     line: { active: false, ...defaultShapeAttributes },
    // };

    function getLineOptions(itemType: string) {
        const storedData = localStorage.getItem(LS_KEY_CHART_ANNOTATIONS);

        if (storedData) {
            const parseStoredData = JSON.parse(storedData);
            if (parseStoredData.defaultSettings) {
                let shouldDefault = false;
                if (parseStoredData.defaultSettings.FibRetracement) {
                    parseStoredData.defaultSettings.FibRetracement.extraData.forEach(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (element: any) => {
                            if (
                                Object.prototype.hasOwnProperty.call(
                                    element,
                                    'color',
                                )
                            ) {
                                shouldDefault = true;
                            }
                        },
                    );

                    parseStoredData.defaultSettings.FibRetracement.extraData =
                        shouldDefault
                            ? structuredClone(fibDefaultLevels)
                            : parseStoredData.defaultSettings.FibRetracement
                                  .extraData;
                }
                const options = parseStoredData.defaultSettings[itemType];
                return options;
            }
        }
    }
    const brushOptions =
        getLineOptions('Brush') ?? defaultLineDrawnShapeEditAttributes;
    const rayOptions =
        getLineOptions('Ray') ?? defaultLineDrawnShapeEditAttributes;
    const rectOptions =
        getLineOptions('Rect') ?? defaultRectDrawnShapeEditAttributes;
    const fibRetracementOptions =
        getLineOptions('FibRetracement') ??
        defaultFibonacciDrawnShapeEditAttributes;
    const dPRangeOptions =
        getLineOptions('DPRange') ?? defaultDpRangeDrawnShapeEditAttributes;

    const drawSettings = useMemo(() => {
        return {
            ['Brush']: brushOptions,
            ['Ray']: rayOptions,
            ['Rect']: rectOptions,
            ['FibRetracement']: fibRetracementOptions,
            ['DPRange']: dPRangeOptions,
            ['defaultBrush']: defaultLineDrawnShapeEditAttributes,
            ['defaultRay']: defaultLineDrawnShapeEditAttributes,
            ['defaultRect']: defaultRectDrawnShapeEditAttributes,
            ['defaultFibRetracement']: defaultFibonacciDrawnShapeEditAttributes,
            ['defaultDPRange']: defaultDpRangeDrawnShapeEditAttributes,
            ['defaultShapeAttributes']: defaultShapeAttributes,
            ['drawnShapeDefaultDash']: drawnShapeDefaultDash,
            ['drawnShapeDefaultColor']: drawnShapeDefaultColor,
            ['drawnShapeDefaultLineWidth']: drawnShapeDefaultLineWidth,
        };
    }, [
        diffHashSig(brushOptions),
        diffHashSig(rayOptions),
        diffHashSig(rectOptions),
        diffHashSig(fibRetracementOptions),
        diffHashSig(dPRangeOptions),
    ]);

    return drawSettings;
};
