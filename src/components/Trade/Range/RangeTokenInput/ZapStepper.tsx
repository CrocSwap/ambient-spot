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

const STATUS_COLOR: Record<ZapStepStatus, string> = {
    upcoming: 'var(--text3)',
    active: 'var(--accent1)',
    complete: 'var(--positive)',
    error: 'var(--negative)',
};

const STATUS_LABEL: Record<ZapStepStatus, string> = {
    upcoming: 'Up next',
    active: 'In progress',
    complete: 'Done',
    error: 'Failed',
};

const ICON_SIZE = 24;

function StepIcon({
    status,
    number,
}: {
    status: ZapStepStatus;
    number: number;
}) {
    if (status === 'active')
        return (
            <IconSlot
                style={{
                    background: 'var(--dark1)',
                    boxShadow: '0 0 0 1px var(--dark3)',
                }}
            >
                <Spinner size={20} weight={2} bg='var(--dark1)' />
            </IconSlot>
        );
    const color = STATUS_COLOR[status];
    const content =
        status === 'complete' ? (
            <FaCheck size={11} color='var(--dark1)' />
        ) : status === 'error' ? (
            <RiCloseFill size={14} color='var(--dark1)' />
        ) : (
            <Text
                fontSize='mini'
                color='text2'
                style={{ fontWeight: 500, lineHeight: 1 }}
            >
                {number}
            </Text>
        );
    return (
        <IconSlot
            style={{
                border: `1px solid ${status === 'upcoming' ? 'var(--text3)' : color}`,
                background: status === 'upcoming' ? 'var(--dark1)' : color,
            }}
        >
            {content}
        </IconSlot>
    );
}

function IconSlot({
    children,
    style,
}: {
    children?: React.ReactNode;
    style?: React.CSSProperties;
}) {
    return (
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
                ...style,
            }}
        >
            {children}
        </div>
    );
}

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
                const lineColor =
                    step.status === 'complete'
                        ? STATUS_COLOR.complete
                        : 'var(--dark3)';
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
                            <StepIcon status={step.status} number={i + 1} />
                            {!isLastStep && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: ICON_SIZE + 4,
                                        bottom: 4,
                                        width: 1,
                                        background: lineColor,
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
                                color={
                                    step.status === 'upcoming'
                                        ? 'text2'
                                        : 'text1'
                                }
                                style={{
                                    fontWeight:
                                        step.status === 'active' ? 500 : 400,
                                }}
                            >
                                {step.label}
                            </Text>
                            <Text
                                fontSize='mini'
                                style={{
                                    color: STATUS_COLOR[step.status],
                                    flexShrink: 0,
                                    fontWeight: 500,
                                }}
                            >
                                {STATUS_LABEL[step.status]}
                            </Text>
                        </FlexContainer>
                    </FlexContainer>
                );
            })}
        </FlexContainer>
    );
}

export default memo(ZapStepper);
