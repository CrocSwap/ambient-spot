import Divider from '@material-ui/core/Divider/Divider';
import * as d3 from 'd3';
import { MouseEvent, useContext, useEffect, useState } from 'react';
import { SketchPicker } from 'react-color';
import Spinner from '../../../components/Global/Spinner/Spinner';
import { BrandContext } from '../../../contexts/BrandContext';
import { ChartContext, ChartThemeIF } from '../../../contexts/ChartContext';
import { PoolContext } from '../../../contexts/PoolContext';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import { LS_KEY_CHART_CONTEXT_SETTINGS } from '../../platformAmbient/Chart/ChartUtils/chartConstants';
import {
    chartItemStates,
    renderChart,
} from '../../platformAmbient/Chart/ChartUtils/chartUtils';
import { ColorPickerTab } from '../../platformAmbient/Chart/Draw/FloatingToolbar/FloatingToolbarCss';
import {
    DropDownList,
    DropDownListContainer,
    LabelSettingsArrow,
    ListItem,
} from '../../platformAmbient/Chart/Draw/FloatingToolbar/FloatingToolbarSettingsCss';
import CurveDepth from '../../platformAmbient/Trade/TradeCharts/TradeChartsComponents/CurveDepth';
import { ColorObjIF } from './ChartSettings';
import {
    ActionButtonContainer,
    CheckList,
    CheckListContainer,
    ColorList,
    ColorOptions,
    ColorPickerContainer,
    ContextMenuContextText,
    ContextMenuFooter,
    ContextOptions,
    ContextOptionsSection,
    FooterButtons,
    FooterContextText,
    Icon,
    MobileSettingsRow,
    OptionColor,
    OptionsContent,
    OptionsHeader,
    SelectedButton,
    SelectionContainer,
    StyledCheckbox,
    StyledSelectbox,
} from './ChartSettingsCss';

interface ContextMenuContentIF {
    chartThemeColors: ChartThemeIF;
    isCondensedModeEnabled: boolean;
    setIsCondensedModeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setShouldDisableChartSettings: React.Dispatch<
        React.SetStateAction<boolean>
    >;
    chartItemStates: chartItemStates;
    isSelecboxActive: boolean;
    setIsSelecboxActive: React.Dispatch<React.SetStateAction<boolean>>;
    selectedColorObj: ColorObjIF | undefined;
    setSelectedColorObj: React.Dispatch<
        React.SetStateAction<ColorObjIF | undefined>
    >;
    reverseColorObj: boolean;
    applyDefault: boolean;
    setApplyDefault: React.Dispatch<React.SetStateAction<boolean>>;
    isSaving: boolean;
    setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
    isMobile: boolean;
    isSettingsClosing: boolean;
}

export default function ChartSettingsContent(props: ContextMenuContentIF) {
    const {
        chartThemeColors,
        isCondensedModeEnabled,
        setIsCondensedModeEnabled,
        setShouldDisableChartSettings,
        isSelecboxActive,
        setIsSelecboxActive,
        selectedColorObj,
        setSelectedColorObj,
        reverseColorObj,
        applyDefault,
        setApplyDefault,
        isSaving,
        setIsSaving,
        isMobile,
        isSettingsClosing,
    } = props;

    const {
        showFeeRate,
        setShowFeeRate,
        showTvl,
        setShowTvl,
        showVolume,
        setShowVolume,
        showSwap,
        setShowSwap,
        showLatest,
        setLatest,
        rescale,
        setRescale,
        setReset,
        reset,
    } = props.chartItemStates;

    const {
        isTradeDollarizationEnabled,
        setIsTradeDollarizationEnabled,
        isDefaultTradeDollarization,
    } = useContext(PoolContext);

    const { platformName } = useContext(BrandContext);
    const {
        defaultChartSettings,
        setColorChangeTrigger,
        setContextmenu,
        chartSettings,
    } = useContext(ChartContext);

    const {
        baseToken: { symbol: baseTokenSymbol },
        quoteToken: { symbol: quoteTokenSymbol },
        isDenomBase,
    } = useContext(TradeDataContext);

    const { isUserConnected } = useContext(UserDataContext);

    const [priceInOption, setPriceInOption] = useState<string>(
        !isTradeDollarizationEnabled
            ? isDenomBase
                ? quoteTokenSymbol
                : baseTokenSymbol
            : 'USD',
    );

    // const [extendContextOptions, setExtendContextOptions] = useState(false);

    const handlePriceInChange = (option: string) => {
        setIsTradeDollarizationEnabled(
            option !== quoteTokenSymbol && option !== baseTokenSymbol,
        );
        setPriceInOption(option);
    };

    useEffect(() => {
        if (isSettingsClosing) {
            handleCancelChanges();
        }
    }, [isSettingsClosing]);

    const handleCandleColorPicker = (
        replaceSelector: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newColor: any,
    ) => {
        const colorRgbaCode =
            'rgba(' +
            newColor.rgb.r +
            ',' +
            newColor.rgb.g +
            ',' +
            newColor.rgb.b +
            ',' +
            newColor.rgb.a +
            ')';

        const replaceColor = d3.color(colorRgbaCode);

        if (replaceSelector && replaceColor) {
            chartThemeColors[replaceSelector] = replaceColor;

            setColorChangeTrigger(true);

            setSelectedColorObj((prev: ColorObjIF | undefined) => {
                if (prev) {
                    const colorRep = {
                        selectedColor: replaceColor.toString(),
                        replaceSelector: prev.replaceSelector,
                        index: prev.index,
                        placement: prev.placement,
                    } as ColorObjIF;

                    return colorRep;
                }
            });

            renderChart();
        }
    };

    useEffect(() => {
        if (applyDefault && defaultChartSettings) {
            Object.assign(chartThemeColors, defaultChartSettings.chartColors);

            setShowVolume(defaultChartSettings.showVolume);
            setShowTvl(defaultChartSettings.showTvl);
            setShowFeeRate(defaultChartSettings.showFeeRate);
            setIsTradeDollarizationEnabled(isDefaultTradeDollarization);
        }

        const applyTimeOut = setTimeout(() => {
            setApplyDefault(false);
            renderChart();
        }, 1000);
        return () => {
            clearTimeout(applyTimeOut);
        };
    }, [applyDefault]);

    const handleCancelChanges = () => {
        const CHART_CONTEXT_SETTINGS_LOCAL_STORAGE = localStorage.getItem(
            LS_KEY_CHART_CONTEXT_SETTINGS,
        );

        if (CHART_CONTEXT_SETTINGS_LOCAL_STORAGE) {
            const parsedContextData = JSON.parse(
                CHART_CONTEXT_SETTINGS_LOCAL_STORAGE,
            );

            const oldColorData = {
                upCandleBodyColor: d3.color(
                    parsedContextData.chartColors.upCandleBodyColor,
                ) as d3.RGBColor,
                upCandleBorderColor: d3.color(
                    parsedContextData.chartColors.upCandleBorderColor,
                ) as d3.RGBColor,
                downCandleBodyColor: d3.color(
                    parsedContextData.chartColors.downCandleBodyColor,
                ) as d3.RGBColor,
                downCandleBorderColor: d3.color(
                    parsedContextData.chartColors.downCandleBorderColor,
                ) as d3.RGBColor,
                selectedDateFillColor: d3.color(
                    parsedContextData.chartColors.selectedDateFillColor,
                ) as d3.RGBColor,
                selectedDateStrokeColor: d3.color(
                    parsedContextData.chartColors.selectedDateStrokeColor,
                ) as d3.RGBColor,
                liqAskColor: d3.color(
                    parsedContextData.chartColors.liqAskColor,
                ) as d3.RGBColor,
                liqBidColor: d3.color(
                    parsedContextData.chartColors.liqBidColor,
                ) as d3.RGBColor,
                drawngShapeDefaultColor: d3.color(
                    parsedContextData.chartColors.drawngShapeDefaultColor,
                ) as d3.RGBColor,
            };

            Object.assign(chartThemeColors, oldColorData);
        } else {
            defaultChartSettings &&
                Object.assign(
                    chartThemeColors,
                    defaultChartSettings.chartColors,
                );
        }

        renderChart();
        setColorChangeTrigger(true);
        setContextmenu(false);
    };

    const handleSaveChanges = () => {
        setIsSaving(true);

        const localSettings = {
            chartColors: {
                upCandleBodyColor:
                    chartThemeColors.upCandleBodyColor.toString(),
                downCandleBodyColor:
                    chartThemeColors.downCandleBodyColor.toString(),
                selectedDateFillColor:
                    chartThemeColors.selectedDateFillColor.toString(),

                upCandleBorderColor:
                    chartThemeColors.upCandleBorderColor.toString(),
                downCandleBorderColor:
                    chartThemeColors.downCandleBorderColor.toString(),
                liqAskColor: chartThemeColors.liqAskColor.toString(),
                liqBidColor: chartThemeColors.liqBidColor.toString(),
                selectedDateStrokeColor:
                    chartThemeColors.selectedDateStrokeColor.toString(),
            },
            isTradeDollarizationEnabled: isTradeDollarizationEnabled,
            showVolume: showVolume,
            showTvl: showTvl,
            showFeeRate: showFeeRate,
        };

        // Saves to local storage
        localStorage.setItem(
            LS_KEY_CHART_CONTEXT_SETTINGS,
            JSON.stringify(localSettings),
        );

        const savedTimeOut = setTimeout(() => {
            setIsSaving(false);
            setContextmenu(false);
        }, 1000);
        return () => {
            clearTimeout(savedTimeOut);
        };
    };

    const checkListContent = [
        {
            checked: showVolume,
            action: setShowVolume,
            selection: 'Show Volume',
            label: 'volume',
        },
        {
            checked: showTvl,
            action: setShowTvl,
            selection: 'Show TVL',
            label: 'tvl',
        },
        {
            checked: showFeeRate,
            action: setShowFeeRate,
            selection: 'Show Fee Rate',
            label: 'feerate',
        },
        {
            checked: isCondensedModeEnabled,
            action: setIsCondensedModeEnabled,
            selection: 'Hide empty candles',
            label: 'condensedMode',
        },
        {
            checked: showSwap,
            action: setShowSwap,
            selection: 'Show Buys/Sells',
            label: 'swap',
        },
    ];

    const selectionContent = [
        {
            selection: 'Show prices in',
            action: handlePriceInChange,
            options: [isDenomBase ? quoteTokenSymbol : baseTokenSymbol, 'USD'],
        },
    ];

    const colorPickerContent = [
        {
            selection: 'Candle Body',
            actionHandler: 'body',
            action: handleCandleColorPicker,
            upColor: 'upCandleBodyColor',
            downColor: 'downCandleBodyColor',
            exclude: [''],
        },
        {
            selection: 'Candle Borders',
            actionHandler: 'border',
            action: handleCandleColorPicker,
            upColor: 'upCandleBorderColor',
            downColor: 'downCandleBorderColor',
            exclude: [''],
        },
        {
            selection: 'Liquidity Area',
            actionHandler: 'liq',
            action: handleCandleColorPicker,
            downColor: 'liqBidColor',
            upColor: 'liqAskColor',
            exclude: ['futa'],
        },
    ];

    const resetAndRescaleMobileDisplay = (
        <MobileSettingsRow>
            {showLatest && (
                <div>
                    <SelectedButton
                        onClick={() => {
                            if (rescale) {
                                setReset(true);
                            } else {
                                setLatest(true);
                            }
                        }}
                        isActive={false}
                        aria-label='Show latest.'
                    >
                        Latest
                    </SelectedButton>
                </div>
            )}

            <div>
                <SelectedButton
                    onClick={() => {
                        setReset(true);
                        setRescale(true);
                    }}
                    isActive={reset}
                    aria-label='Reset.'
                >
                    Reset
                </SelectedButton>
            </div>

            <div>
                <SelectedButton
                    onClick={() => {
                        setRescale((prevState) => {
                            return !prevState;
                        });
                    }}
                    isActive={rescale ? true : false}
                    aria-label='Auto rescale.'
                >
                    Auto
                </SelectedButton>
            </div>
        </MobileSettingsRow>
    );

    const extendedOptions = (
        <ContextOptions>
            <Divider></Divider>

            <ContextOptionsSection>
                <OptionsHeader>Chart Scale:</OptionsHeader>
                <OptionsContent>{resetAndRescaleMobileDisplay}</OptionsContent>
            </ContextOptionsSection>

            <Divider></Divider>

            <ContextOptionsSection>
                <OptionsHeader>Curve/Depth:</OptionsHeader>
                <OptionsContent>
                    <CurveDepth overlayMethods={chartSettings.poolOverlay} />
                </OptionsContent>
            </ContextOptionsSection>
        </ContextOptions>
    );

    return (
        <>
            <>
                {isMobile && extendedOptions}

                <CheckListContainer>
                    {checkListContent.map(
                        (item, index) =>
                            (item.label !== 'swap' || isUserConnected) && (
                                <CheckList key={index}>
                                    <StyledCheckbox
                                        checked={item.checked}
                                        onClick={() =>
                                            item.action(!item.checked)
                                        }
                                    >
                                        <Icon
                                            viewBox='0 0 24 24'
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                            }}
                                        >
                                            <polyline points='20 6 9 17 4 12' />
                                        </Icon>
                                    </StyledCheckbox>
                                    <ContextMenuContextText>
                                        {['futa'].includes(platformName)
                                            ? item.selection.toUpperCase()
                                            : item.selection}
                                    </ContextMenuContextText>
                                </CheckList>
                            ),
                    )}
                </CheckListContainer>

                <SelectionContainer>
                    {selectionContent.map((item, index) => (
                        <CheckList key={index}>
                            <ContextMenuContextText>
                                {['futa'].includes(platformName)
                                    ? item.selection.toUpperCase()
                                    : item.selection}
                            </ContextMenuContextText>
                            <StyledSelectbox
                                style={{ position: 'relative' }}
                                onClick={(event: MouseEvent<HTMLElement>) => {
                                    event.stopPropagation();
                                    setIsSelecboxActive(!isSelecboxActive);
                                }}
                            >
                                <ContextMenuContextText
                                    style={{ padding: '4px' }}
                                >
                                    {priceInOption}
                                </ContextMenuContextText>
                                <LabelSettingsArrow
                                    style={{ margin: '4px' }}
                                    isActive={isSelecboxActive}
                                    width={8}
                                    height={8}
                                ></LabelSettingsArrow>

                                {isSelecboxActive && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: '-1px',
                                            top: '80%',
                                        }}
                                    >
                                        <DropDownListContainer>
                                            <DropDownList width={90}>
                                                {item.options.map(
                                                    (option, index) => (
                                                        <ListItem
                                                            style={{
                                                                padding:
                                                                    '1px 10px 1px 10px',
                                                            }}
                                                            backgroundColor={
                                                                priceInOption ===
                                                                option
                                                                    ? 'var(--accent1)'
                                                                    : 'var(--dark1)'
                                                            }
                                                            key={index}
                                                            onClick={(
                                                                event: MouseEvent<HTMLElement>,
                                                            ) => {
                                                                event.stopPropagation();
                                                                item.action(
                                                                    option,
                                                                );
                                                            }}
                                                        >
                                                            {option}
                                                        </ListItem>
                                                    ),
                                                )}
                                            </DropDownList>
                                        </DropDownListContainer>
                                    </div>
                                )}
                            </StyledSelectbox>
                        </CheckList>
                    ))}
                </SelectionContainer>

                <ColorPickerContainer>
                    {colorPickerContent.map(
                        (item, index) =>
                            !item.exclude.includes(platformName) && (
                                <ColorList key={index}>
                                    <ContextMenuContextText>
                                        {['futa'].includes(platformName)
                                            ? item.selection.toUpperCase()
                                            : item.selection}
                                    </ContextMenuContextText>

                                    <ColorOptions>
                                        {item.downColor !== '' && (
                                            <OptionColor
                                                backgroundColor={chartThemeColors[
                                                    item.downColor
                                                ]?.toString()}
                                                onClick={(
                                                    event: MouseEvent<HTMLElement>,
                                                ) => {
                                                    event.stopPropagation();
                                                    setSelectedColorObj(
                                                        (prev) => {
                                                            const selectedObj =
                                                                {
                                                                    selectedColor:
                                                                        chartThemeColors[
                                                                            item
                                                                                .downColor
                                                                        ]?.toString(),
                                                                    replaceSelector:
                                                                        item.downColor,
                                                                    index: index,
                                                                    placement:
                                                                        'right',
                                                                };

                                                            const result =
                                                                prev ===
                                                                    undefined ||
                                                                prev.index !==
                                                                    index ||
                                                                prev.placement !==
                                                                    'right'
                                                                    ? selectedObj
                                                                    : undefined;

                                                            setShouldDisableChartSettings(
                                                                result ===
                                                                    undefined,
                                                            );

                                                            return result;
                                                        },
                                                    );
                                                }}
                                            ></OptionColor>
                                        )}
                                        <OptionColor
                                            backgroundColor={chartThemeColors[
                                                item.upColor
                                            ]?.toString()}
                                            onClick={(
                                                event: MouseEvent<HTMLElement>,
                                            ) => {
                                                event.stopPropagation();
                                                setSelectedColorObj((prev) => {
                                                    const selectedObj = {
                                                        selectedColor:
                                                            chartThemeColors[
                                                                item.upColor
                                                            ]?.toString(),
                                                        replaceSelector:
                                                            item.upColor,
                                                        index: index,
                                                        placement: 'left',
                                                    };

                                                    const result =
                                                        prev === undefined ||
                                                        prev.index !== index ||
                                                        prev.placement !==
                                                            'left'
                                                            ? selectedObj
                                                            : undefined;

                                                    setShouldDisableChartSettings(
                                                        result === undefined,
                                                    );

                                                    return result;
                                                });
                                            }}
                                        ></OptionColor>

                                        {selectedColorObj &&
                                            selectedColorObj.index ===
                                                index && (
                                                <ColorPickerTab
                                                    style={{
                                                        position: 'fixed',
                                                        zIndex: 199,
                                                        transform:
                                                            'translate(' +
                                                            (selectedColorObj.placement ===
                                                            'left'
                                                                ? -90
                                                                : -60) +
                                                            'px, ' +
                                                            (reverseColorObj
                                                                ? '-325px)'
                                                                : '10px)'),
                                                    }}
                                                    onClick={(
                                                        event: MouseEvent<HTMLElement>,
                                                    ) =>
                                                        event.stopPropagation()
                                                    }
                                                >
                                                    <SketchPicker
                                                        color={
                                                            selectedColorObj.selectedColor
                                                        }
                                                        width={'170px'}
                                                        onChange={(
                                                            color,
                                                            event,
                                                        ) => {
                                                            event.stopPropagation();
                                                            item.action(
                                                                selectedColorObj.replaceSelector,
                                                                color,
                                                            );
                                                        }}
                                                    />
                                                </ColorPickerTab>
                                            )}
                                    </ColorOptions>
                                </ColorList>
                            ),
                    )}
                </ColorPickerContainer>
            </>

            {!isMobile && (
                <ContextMenuFooter>
                    <FooterButtons
                        backgroundColor={
                            ['futa'].includes(platformName)
                                ? 'var(--dark3)'
                                : 'transparent'
                        }
                        hoverColor={
                            ['futa'].includes(platformName)
                                ? 'var(--dark3)'
                                : applyDefault
                                  ? 'transparent'
                                  : 'var(--accent1)'
                        }
                        textColor={
                            ['futa'].includes(platformName)
                                ? 'var(--text2)'
                                : 'var(--accent1)'
                        }
                        hoverTextColor={
                            ['futa'].includes(platformName)
                                ? 'var(--accent1)'
                                : 'var(--text1)'
                        }
                        width={'auto'}
                        onClick={() => setApplyDefault(true)}
                        isFuta={['futa'].includes(platformName)}
                    >
                        {applyDefault ? (
                            <Spinner size={14} bg='transparent' centered />
                        ) : (
                            <FooterContextText>
                                {['futa'].includes(platformName)
                                    ? 'DEFAULTS'
                                    : 'Apply defaults'}
                            </FooterContextText>
                        )}
                    </FooterButtons>
                    <ActionButtonContainer>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                            }}
                        >
                            <FooterButtons
                                backgroundColor={
                                    ['futa'].includes(platformName)
                                        ? 'var(--dark3)'
                                        : 'transparent'
                                }
                                hoverColor={
                                    ['futa'].includes(platformName)
                                        ? 'var(--dark3)'
                                        : 'var(--accent1)'
                                }
                                textColor={
                                    ['futa'].includes(platformName)
                                        ? 'var(--text2)'
                                        : 'var(--accent1)'
                                }
                                hoverTextColor={
                                    ['futa'].includes(platformName)
                                        ? 'var(--accent1)'
                                        : 'var(--text1)'
                                }
                                width={'55px'}
                                onClick={() => handleCancelChanges()}
                                isFuta={['futa'].includes(platformName)}
                            >
                                <FooterContextText>
                                    {'Cancel'}
                                </FooterContextText>
                            </FooterButtons>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'flex-end',
                            }}
                        >
                            <FooterButtons
                                backgroundColor={
                                    ['futa'].includes(platformName)
                                        ? 'var(--dark3)'
                                        : isSaving
                                          ? 'transparent'
                                          : 'var(--accent1)'
                                }
                                hoverColor={
                                    ['futa'].includes(platformName)
                                        ? 'var(--dark3)'
                                        : 'transparent'
                                }
                                textColor={
                                    ['futa'].includes(platformName)
                                        ? 'var(--text2)'
                                        : 'var(--text1)'
                                }
                                hoverTextColor={'var(--accent1)'}
                                width={'45px'}
                                onClick={() => handleSaveChanges()}
                                isFuta={['futa'].includes(platformName)}
                            >
                                {isSaving ? (
                                    <Spinner
                                        size={14}
                                        bg='transparent'
                                        centered
                                    />
                                ) : (
                                    <FooterContextText>
                                        {['futa'].includes(platformName)
                                            ? 'OK'
                                            : 'Save'}
                                    </FooterContextText>
                                )}
                            </FooterButtons>
                        </div>
                    </ActionButtonContainer>
                </ContextMenuFooter>
            )}
        </>
    );
}
