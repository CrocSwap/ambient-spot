import { MouseEvent, useContext, useEffect, useState } from 'react';
import { FaGasPump } from 'react-icons/fa';
import { RiArrowDownSLine, RiArrowUpSLine } from 'react-icons/ri';
import { FlexContainer } from '../../../../styled/Common';
import {
    ExtraDetailsContainer,
    ExtraInfoContainer,
} from '../../../../styled/Components/TradeModules';

import { TradeDataContext } from '../../../../contexts/TradeDataContext';
import TooltipComponent from '../../../Global/TooltipComponent/TooltipComponent';
import { brand } from '../../../../ambient-utils/constants';

interface PropsIF {
    extraInfo:
        | null
        | {
              title: string;
              tooltipTitle: string;
              data: React.ReactNode;
          }[];
    conversionRate: string;
    gasPrice: string | undefined;
    showDropdown: boolean;
    showWarning?: boolean;
    priceImpactExceedsThreshold?: boolean;
}

export const ExtraInfo = (props: PropsIF) => {
    const {
        extraInfo,
        showDropdown,
        conversionRate,
        gasPrice,
        showWarning,
        priceImpactExceedsThreshold,
    } = props;

    const isFuta = brand === 'futa';

    const { toggleDidUserFlipDenom } = useContext(TradeDataContext);

    const [showExtraInfo, setShowExtraInfo] = useState<boolean>(false);

    useEffect(() => {
        if (showWarning) {
            setShowExtraInfo(true);
        }
    }, [showWarning]);

    const arrowToRender = showDropdown ? (
        showExtraInfo ? (
            <RiArrowUpSLine size={22} />
        ) : (
            <RiArrowDownSLine size={22} />
        )
    ) : null;

    const staticDropdown = isFuta ? true : showExtraInfo && showDropdown;

    return (
        <>
            <ExtraInfoContainer
                style={{ display: isFuta ? 'none' : 'flex' }}
                role='button'
                justifyContent='space-between'
                alignItems='center'
                fullWidth
                color='text2'
                fontSize='body'
                padding='4px'
                active={showDropdown}
                isFuta={isFuta}
                onClick={
                    showDropdown
                        ? () => setShowExtraInfo(!showExtraInfo)
                        : () => setShowExtraInfo(false)
                }
                aria-label={`Gas cost is ${gasPrice}. Conversion rate is ${conversionRate}.`}
            >
                {
                    <FlexContainer
                        alignItems='center'
                        padding='0 0 0 4px'
                        gap={4}
                        style={{ pointerEvents: 'none' }}
                    >
                        <FaGasPump size={15} /> {gasPrice ?? '…'}
                    </FlexContainer>
                }

                <FlexContainer
                    alignItems='center'
                    onClick={(e: MouseEvent<HTMLDivElement>) => {
                        toggleDidUserFlipDenom();
                        e.stopPropagation();
                    }}
                    cursor='pointer'
                >
                    {conversionRate}
                </FlexContainer>
                <div style={{ height: '22px' }}>{arrowToRender}</div>
            </ExtraInfoContainer>
            {staticDropdown && (
                <ExtraDetailsContainer
                    style={{ textTransform: isFuta ? 'uppercase' : 'none' }}
                >
                    {extraInfo?.map((item, idx) => (
                        <FlexContainer
                            key={idx}
                            justifyContent='space-between'
                            alignItems='center'
                            padding='4px 0'
                            tabIndex={0}
                            aria-label={`${item.title} is ${item.data}`}
                            style={
                                item.title === 'Price Impact' &&
                                priceImpactExceedsThreshold
                                    ? {
                                          color: 'var(--other-red)',
                                      }
                                    : undefined
                            }
                        >
                            <FlexContainer gap={4}>
                                <div
                                    style={{
                                        color: isFuta ? 'var(--text3)' : '',
                                    }}
                                >
                                    {item.title}
                                </div>
                                <TooltipComponent
                                    title={item.tooltipTitle}
                                    svgColor='#4D5255'
                                />
                            </FlexContainer>
                            <div style={{ textAlign: 'end' }}>{item.data}</div>
                        </FlexContainer>
                    ))}
                </ExtraDetailsContainer>
            )}
        </>
    );
};
