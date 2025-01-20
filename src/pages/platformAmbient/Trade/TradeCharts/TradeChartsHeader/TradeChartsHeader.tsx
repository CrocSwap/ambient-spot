import { useContext, useRef } from 'react';
import { AiOutlineAreaChart, AiOutlineDollarCircle } from 'react-icons/ai';
import { BsFullscreen } from 'react-icons/bs';
import { IoSettingsOutline } from 'react-icons/io5';
import { RiScreenshot2Fill } from 'react-icons/ri';
import { printDomToImage } from '../../../../../ambient-utils/dataLayer';
import { useSimulatedIsPoolInitialized } from '../../../../../App/hooks/useSimulatedIsPoolInitialized';
import { DefaultTooltip } from '../../../../../components/Global/StyledTooltip/StyledTooltip';
import { AppStateContext } from '../../../../../contexts/AppStateContext';
import { BrandContext } from '../../../../../contexts/BrandContext';
import { CandleContext } from '../../../../../contexts/CandleContext';
import { ChartContext } from '../../../../../contexts/ChartContext';
import { PoolContext } from '../../../../../contexts/PoolContext';
import { TradeDataContext } from '../../../../../contexts/TradeDataContext';
import { TradeTableContext } from '../../../../../contexts/TradeTableContext';
import { FlexContainer } from '../../../../../styled/Common';
import {
    FutaHeaderButton,
    HeaderButtons,
} from '../../../../../styled/Components/Chart';
import useCopyToClipboard from '../../../../../utils/hooks/useCopyToClipboard';
import { useMediaQuery } from '../../../../../utils/hooks/useMediaQuery';
import TradeChartsTokenInfo from '../TradeChartsComponents/TradeChartsTokenInfo';
// import{ IoSettingsOutline } from 'react-icons/io5';

export const TradeChartsHeader = (props: { tradePage?: boolean }) => {
    const {
        isFullScreen: isChartFullScreen,
        setIsFullScreen: setIsChartFullScreen,
        canvasRef,
        chartCanvasRef,
        tradeTableState,
        isCandleDataNull,
        contextmenu,
        setContextmenu,
        setContextMenuPlacement,
    } = useContext(ChartContext);

    const { isTradeDollarizationEnabled, setIsTradeDollarizationEnabled } =
        useContext(PoolContext);

    const {
        isCondensedModeEnabled,
        setIsCondensedModeEnabled,
        showFutaCandles,
        setShowFutaCandles,
    } = useContext(CandleContext);

    const {
        baseToken: { symbol: baseTokenSymbol },
        quoteToken: { symbol: quoteTokenSymbol },
        isDenomBase,
    } = useContext(TradeDataContext);

    const { platformName } = useContext(BrandContext);
    const isFuta = ['futa'].includes(platformName);
    const tradeChartHeaderRef = useRef<HTMLDivElement>(null);
    const tabletView = useMediaQuery(
        '(min-width: 768px) and (max-width: 1200px)',
    );
    const { activeMobileComponent } = useContext(TradeTableContext);

    const [, copy] = useCopyToClipboard();
    const {
        snackbar: { open: openSnackbar },
    } = useContext(AppStateContext);

    const isPoolInitialized = useSimulatedIsPoolInitialized();

    const showNoChartData = !isPoolInitialized || isCandleDataNull;

    const copyChartToClipboard = async () => {
        if (canvasRef.current && chartCanvasRef.current) {
            const filter = (el: Node) => {
                if (el instanceof HTMLElement) {
                    return el.id !== 'tx-table';
                }
                return true;
            };
            const blob = isChartFullScreen
                ? await printDomToImage(chartCanvasRef.current, '')
                : await printDomToImage(
                      canvasRef.current,
                      '',
                      undefined,
                      // height, trade charts header + chart height
                      (chartCanvasRef.current as HTMLDivElement).clientHeight +
                          (tradeChartHeaderRef.current as HTMLDivElement)
                              .clientHeight,
                      filter,
                  );

            if (blob) {
                copy(blob);
                openSnackbar('Chart image copied to clipboard', 'info');
            }
        }
    };

    const graphSettingsContent = (
        <FlexContainer justifyContent='flex-end' alignItems='center' gap={8}>
            {isFuta && (
                <DefaultTooltip
                    interactive
                    title={!showFutaCandles ? 'Candle Chart' : 'Line Chart'}
                    enterDelay={500}
                >
                    <HeaderButtons
                        isFuta={isFuta}
                        onClick={() => setShowFutaCandles(!showFutaCandles)}
                    >
                        <FutaHeaderButton isActive={!showFutaCandles}>
                            <>CANDLES</>
                        </FutaHeaderButton>
                    </HeaderButtons>
                </DefaultTooltip>
            )}

            <DefaultTooltip
                interactive
                title={
                    isCondensedModeEnabled
                        ? 'Show all candles'
                        : 'Hide empty candles'
                }
                enterDelay={500}
            >
                <HeaderButtons
                    onClick={() =>
                        setIsCondensedModeEnabled(!isCondensedModeEnabled)
                    }
                    mobileHide={activeMobileComponent !== 'chart'}
                    isActive={isCondensedModeEnabled}
                    isFuta={isFuta}
                >
                    <AiOutlineAreaChart
                        size={20}
                        id='trade_Condensed_Mode_button'
                        aria-label='Toggle condensed mode button'
                        style={{
                            color: isCondensedModeEnabled
                                ? 'var(--accent1)'
                                : undefined,
                        }}
                    />
                </HeaderButtons>
            </DefaultTooltip>
            <DefaultTooltip
                interactive
                title={
                    isTradeDollarizationEnabled
                        ? `Switch to prices in ${
                              isDenomBase ? quoteTokenSymbol : baseTokenSymbol
                          }`
                        : 'Switch to prices in USD'
                }
                enterDelay={500}
            >
                <HeaderButtons
                    onClick={() =>
                        setIsTradeDollarizationEnabled((prev) => !prev)
                    }
                    mobileHide={activeMobileComponent !== 'chart'}
                    isActive={isTradeDollarizationEnabled}
                    isFuta={isFuta}
                >
                    <AiOutlineDollarCircle
                        size={20}
                        id='trade_dollarized_prices_button'
                        aria-label='Toggle dollarized prices button'
                        style={{
                            color: isTradeDollarizationEnabled
                                ? 'var(--accent1)'
                                : undefined,
                        }}
                    />
                </HeaderButtons>
            </DefaultTooltip>
            {!isFuta && (
                <DefaultTooltip
                    interactive
                    title={
                        isChartFullScreen
                            ? 'Close full screen chart'
                            : 'Display full screen chart'
                    }
                    enterDelay={500}
                >
                    <HeaderButtons
                        mobileHide
                        onClick={() => {
                            setIsChartFullScreen(!isChartFullScreen);
                        }}
                    >
                        <BsFullscreen
                            size={16}
                            id='trade_chart_full_screen_button'
                            aria-label='Full screen chart button'
                        />
                    </HeaderButtons>
                </DefaultTooltip>
            )}
            {!isFuta && (
                <DefaultTooltip
                    interactive
                    title={'Copy image of chart to clipboard'}
                    enterDelay={500}
                >
                    <HeaderButtons
                        mobileHide
                        onClick={copyChartToClipboard}
                        isFuta={isFuta}
                    >
                        <RiScreenshot2Fill
                            size={20}
                            id='trade_chart_save_image'
                            aria-label='Copy chart image button'
                        />
                    </HeaderButtons>
                </DefaultTooltip>
            )}
            <DefaultTooltip
                interactive
                title={'Open chart settings'}
                enterDelay={500}
                id='chart_settings_tooltip'
            >
                <HeaderButtons
                    mobileHide
                    onClick={() => {
                        setContextmenu(!contextmenu);
                        setContextMenuPlacement(() => {
                            return {
                                top: 200,
                                left: window.innerWidth / 2 - 150,
                                isReversed: false,
                            };
                        });
                    }}
                    id='chart_settings_button'
                    isActive={contextmenu}
                    isFuta={isFuta}
                >
                    <IoSettingsOutline
                        size={20}
                        id='chart_settings_symbol'
                        aria-label='Chart settings button'
                    />
                </HeaderButtons>
            </DefaultTooltip>
        </FlexContainer>
    );

    return (
        <FlexContainer
            justifyContent='space-between'
            alignItems={
                useMediaQuery('(min-width: 2000px)') ? 'center' : 'flex-start'
            }
            padding={props.tradePage ? ' 8px' : '4px 4px 8px 4px'}
            style={{ background: isFuta ? 'var(--dark1)' : 'var(--dark2)' }}
            ref={tradeChartHeaderRef}
        >
            <TradeChartsTokenInfo />
            {tradeTableState === 'Expanded' || showNoChartData || tabletView
                ? null
                : graphSettingsContent}
        </FlexContainer>
    );
};
