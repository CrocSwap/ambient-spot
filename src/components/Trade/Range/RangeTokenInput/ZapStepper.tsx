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
    complete: 'var(--accent5, var(--other-green))',
    error: 'var(--other-red)',
};

function StepIcon({ status }: { status: ZapStepStatus }) {
    if (status === 'active') return <Spinner size={18} bg='var(--dark2)' />;
    const color = STATUS_COLOR[status];
    const content =
        status === 'complete' ? (
            <FaCheck size={11} color='var(--dark1)' />
        ) : status === 'error' ? (
            <RiCloseFill size={14} color='var(--dark1)' />
        ) : null;
    return (
        <div
            style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border:
                    status === 'upcoming'
                        ? `2px solid ${color}`
                        : `2px solid transparent`,
                background: status === 'upcoming' ? 'transparent' : color,
                flexShrink: 0,
            }}
        >
            {content}
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
            flexDirection='column'
            gap={4}
            padding='8px 4px'
            aria-label='Zap deposit progress'
        >
            {steps.map((step, i) => (
                <FlexContainer
                    key={i}
                    alignItems='center'
                    gap={10}
                    padding='4px 0'
                >
                    <FlexContainer
                        flexDirection='column'
                        alignItems='center'
                        gap={2}
                    >
                        <StepIcon status={step.status} />
                        {i < steps.length - 1 && (
                            <div
                                style={{
                                    width: 2,
                                    height: 10,
                                    background: 'var(--text3)',
                                }}
                            />
                        )}
                    </FlexContainer>
                    <Text
                        fontSize='body'
                        color={step.status === 'upcoming' ? 'text2' : 'text1'}
                        style={{
                            fontWeight: step.status === 'active' ? 600 : 400,
                        }}
                    >
                        {`${i + 1}. ${step.label}`}
                    </Text>
                </FlexContainer>
            ))}
        </FlexContainer>
    );
}

export default memo(ZapStepper);
