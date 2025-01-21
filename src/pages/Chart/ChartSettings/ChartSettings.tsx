import * as d3 from 'd3';
import { useContext, useEffect, useRef, useState } from 'react';
import { VscClose } from 'react-icons/vsc';
import { ChartThemeIF } from '../../../contexts/ChartContext';
import {
    ChartSettingsContainer,
    CloseButton,
    ContextMenu,
    ContextMenuHeader,
    ContextMenuHeaderText,
} from './ChartSettingsCss';

import { BrandContext } from '../../../contexts/BrandContext';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import { chartItemStates } from '../../platformAmbient/Chart/ChartUtils/chartUtils';
import ChartSettingsContent from './ChartSettingsContent';
import { brand } from '../../../ambient-utils/constants';

interface ContextMenuIF {
    contextMenuPlacement?: { top: number; left: number; isReversed: boolean };
    setContextmenu: React.Dispatch<React.SetStateAction<boolean>>;
    chartItemStates: chartItemStates;
    chartThemeColors: ChartThemeIF;
    isCondensedModeEnabled: boolean;
    closeOutherChartSetting: boolean;
    setIsCondensedModeEnabled: React.Dispatch<React.SetStateAction<boolean>>;
    setCloseOutherChartSetting: React.Dispatch<React.SetStateAction<boolean>>;
    setShouldDisableChartSettings: React.Dispatch<
        React.SetStateAction<boolean>
    >;
    render: () => void;
}

export interface ColorObjIF {
    selectedColor: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    replaceSelector: string;
    index: number | undefined;
    placement: string;
}

export default function ChartSettings(props: ContextMenuIF) {
    const {
        contextMenuPlacement,
        chartThemeColors,
        isCondensedModeEnabled,
        setIsCondensedModeEnabled,
        setShouldDisableChartSettings,
        closeOutherChartSetting,
        setCloseOutherChartSetting,
    } = props;

    const contextMenuRef = useRef<HTMLInputElement | null>(null);

    const { platformName } = useContext(BrandContext);
    const isFuta = brand === 'futa';

    const [isSaving, setIsSaving] = useState(false);
    const [applyDefault, setApplyDefault] = useState(false);
    const [reverseColorObj, setReverseColorObj] = useState(false);

    const [isSettingsClosing, setIsSettingsClosing] = useState(false);

    const mobileView = useMediaQuery('(max-width: 500px)');

    useEffect(() => {
        d3.select(contextMenuRef.current).on(
            'contextmenu',
            (event: PointerEvent) => {
                event.preventDefault();
            },
        );
    }, []);

    useEffect(() => {
        const screenHeight = window.innerHeight;

        if (contextMenuPlacement) {
            const diff = screenHeight - contextMenuPlacement.top;

            setReverseColorObj(
                (contextMenuPlacement.isReversed && diff < 260) ||
                    (!contextMenuPlacement.isReversed && diff < 700),
            );
        }
    }, [contextMenuPlacement]);

    useEffect(() => {
        if (closeOutherChartSetting) {
            setIsSettingsClosing(true);
            setSelectedColorObj(undefined);
            setShouldDisableChartSettings(true);
            setCloseOutherChartSetting(false);
        }
    }, [closeOutherChartSetting]);

    const [selectedColorObj, setSelectedColorObj] = useState<
        ColorObjIF | undefined
    >(undefined);

    const [isSelecboxActive, setIsSelecboxActive] = useState(false);

    return (
        <ChartSettingsContainer
            ref={contextMenuRef}
            top={contextMenuPlacement ? contextMenuPlacement.top : 0}
            left={contextMenuPlacement ? contextMenuPlacement.left : 0}
            isReversed={
                contextMenuPlacement ? contextMenuPlacement.isReversed : false
            }
            onClick={() => {
                setShouldDisableChartSettings(true);
                setSelectedColorObj(undefined);
                setIsSelecboxActive(false);
            }}
        >
            <ContextMenu isFuta={isFuta}>
                <ContextMenuHeader>
                    <ContextMenuHeaderText>
                        {['futa'].includes(platformName)
                            ? 'CHART SETTINGS'
                            : 'Chart Settings'}
                    </ContextMenuHeaderText>
                    <CloseButton onClick={() => setIsSettingsClosing(true)}>
                        <VscClose size={24} />
                    </CloseButton>
                </ContextMenuHeader>

                <ChartSettingsContent
                    chartThemeColors={chartThemeColors}
                    isCondensedModeEnabled={isCondensedModeEnabled}
                    setIsCondensedModeEnabled={setIsCondensedModeEnabled}
                    setShouldDisableChartSettings={
                        setShouldDisableChartSettings
                    }
                    chartItemStates={props.chartItemStates}
                    isSelecboxActive={isSelecboxActive}
                    setIsSelecboxActive={setIsSelecboxActive}
                    selectedColorObj={selectedColorObj}
                    setSelectedColorObj={setSelectedColorObj}
                    reverseColorObj={reverseColorObj}
                    setApplyDefault={setApplyDefault}
                    applyDefault={applyDefault}
                    isSaving={isSaving}
                    setIsSaving={setIsSaving}
                    isMobile={mobileView}
                    isSettingsClosing={isSettingsClosing}
                />
            </ContextMenu>
        </ChartSettingsContainer>
    );
}
