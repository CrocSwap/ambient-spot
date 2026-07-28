import { memo } from 'react';
import { FaCheck } from 'react-icons/fa6';
import { RiCloseFill } from 'react-icons/ri';
import Spinner from '../../../Global/Spinner/Spinner';
import { FlexContainer, Text } from '../../../../styled/Common';

export type ZapStepStatus = 'upcoming' | 'active' | 'complete' | 'error';

export interface ZapStep {
    label: string;
    status: ZapStepStatus;
}

interface propsIF {
    steps: ZapStep[];
}

const ICON_SIZE = 24;

// A step status has exactly one presentation, so the whole mapping lives here
// rather than in per-status branches. Adding a status forces filling all of it.
const STATUS_PRESENTATION: Record<
    ZapStepStatus,
    {
        statusLabel: string;
        statusColor: string;
        iconStyle: React.CSSProperties;
        icon: (stepNumber: number) => React.ReactNode;
        labelColor: 'text1' | 'text2';
        labelWeight: number;
        connectorColor: string;
    }
> = {
    upcoming: {
        statusLabel: 'Up next',
        statusColor: 'var(--text3)',
        iconStyle: {
            border: '1px solid var(--text3)',
            background: 'var(--dark1)',
        },
        icon: (stepNumber) => (
            <Text
                fontSize='mini'
                color='text2'
                style={{ fontWeight: 500, lineHeight: 1 }}
            >
                {stepNumber}
            </Text>
        ),
        labelColor: 'text2',
        labelWeight: 400,
        connectorColor: 'var(--dark3)',
    },
    active: {
        statusLabel: 'In progress',
        statusColor: 'var(--accent1)',
        iconStyle: {
            background: 'var(--dark1)',
            boxShadow: '0 0 0 1px var(--dark3)',
        },
        icon: () => <Spinner size={20} weight={2} bg='var(--dark1)' />,
        labelColor: 'text1',
        labelWeight: 500,
        connectorColor: 'var(--dark3)',
    },
    complete: {
        statusLabel: 'Done',
        statusColor: 'var(--positive)',
        iconStyle: {
            border: '1px solid var(--positive)',
            background: 'var(--positive)',
        },
        icon: () => <FaCheck size={11} color='var(--dark1)' />,
        labelColor: 'text1',
        labelWeight: 400,
        connectorColor: 'var(--positive)',
    },
    error: {
        statusLabel: 'Failed',
        statusColor: 'var(--negative)',
        iconStyle: {
            border: '1px solid var(--negative)',
            background: 'var(--negative)',
        },
        icon: () => <RiCloseFill size={14} color='var(--dark1)' />,
        labelColor: 'text1',
        labelWeight: 400,
        connectorColor: 'var(--dark3)',
    },
};

// Vertical two-step progress for the single-token ("zap") deposit: swap, then
// mint. Doubles as a plan preview before submission and a live progress
// indicator during the two transactions.
function ZapStepper(props: propsIF) {
    const { steps } = props;
    return (
        <FlexContainer
            fullWidth
            flexDirection='column'
            padding='16px'
            style={{
                boxSizing: 'border-box',
                border: '1px solid var(--dark3)',
                borderRadius: 'var(--border-radius)',
                backgroundColor: 'var(--dark2)',
            }}
            aria-label='Zap deposit progress'
        >
            {steps.map((step, i) => {
                const isLastStep = i === steps.length - 1;
                const presentation = STATUS_PRESENTATION[step.status];
                return (
                    <FlexContainer
                        key={i}
                        fullWidth
                        alignItems='stretch'
                        gap={12}
                    >
                        <div
                            style={{
                                position: 'relative',
                                width: ICON_SIZE,
                                display: 'flex',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}
                        >
                            <div
                                style={{
                                    width: ICON_SIZE,
                                    height: ICON_SIZE,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    zIndex: 1,
                                    ...presentation.iconStyle,
                                }}
                            >
                                {presentation.icon(i + 1)}
                            </div>
                            {!isLastStep && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: ICON_SIZE + 4,
                                        bottom: 4,
                                        width: 1,
                                        background: presentation.connectorColor,
                                    }}
                                />
                            )}
                        </div>
                        <FlexContainer
                            fullWidth
                            alignItems='center'
                            justifyContent='space-between'
                            gap={12}
                            padding={!isLastStep ? '2px 0 24px' : '2px 0'}
                        >
                            <Text
                                fontSize='body'
                                color={presentation.labelColor}
                                style={{ fontWeight: presentation.labelWeight }}
                            >
                                {step.label}
                            </Text>
                            <Text
                                fontSize='mini'
                                style={{
                                    color: presentation.statusColor,
                                    flexShrink: 0,
                                    fontWeight: 500,
                                }}
                            >
                                {presentation.statusLabel}
                            </Text>
                        </FlexContainer>
                    </FlexContainer>
                );
            })}
        </FlexContainer>
    );
}

export default memo(ZapStepper);
