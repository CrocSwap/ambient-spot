import { Tooltip, tooltipClasses, TooltipProps } from '@mui/material';
import { styled } from '@mui/material/styles';

const createStyledTooltip = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    styles: Record<string, any>,
    displayName: string,
) => {
    const BaseTooltip = (props: TooltipProps) => (
        <Tooltip {...props} classes={{ popper: props.className }} />
    );
    BaseTooltip.displayName = displayName;

    return styled(BaseTooltip)(() => styles);
};

export const DefaultTooltip = createStyledTooltip(
    {
        [`& .${tooltipClasses.tooltip}`]: {
            color: 'var(--text1)',
            backgroundColor: 'var(--dark2)',
            zIndex: 999,
        },
        [`& .${tooltipClasses.arrow}`]: {
            color: '#171d27',
            zIndex: 999,
        },
    },
    'DefaultTooltip',
);

export const TextOnlyTooltip = createStyledTooltip(
    {
        [`& .${tooltipClasses.tooltip}`]: {
            color: '#ffffff',
            backgroundColor: 'transparent',
            zIndex: 999,
        },
    },
    'TextOnlyTooltip',
);

export const NoColorTooltip = createStyledTooltip(
    {
        [`& .${tooltipClasses.tooltip}`]: {
            backgroundColor: 'transparent',
        },
    },
    'NoColorTooltip',
);

export const GreenTextTooltip = createStyledTooltip(
    {
        [`& .${tooltipClasses.tooltip}`]: {
            color: 'green',
            backgroundColor: 'transparent',
            fontSize: '.8rem',
        },
    },
    'GreenTextTooltip',
);

export const RedTextTooltip = createStyledTooltip(
    {
        [`& .${tooltipClasses.tooltip}`]: {
            color: 'red',
            backgroundColor: 'transparent',
            fontSize: '.8rem',
        },
    },
    'RedTextTooltip',
);
