import { KeyboardEventHandler, MouseEventHandler, useCallback } from 'react';
import { ToggleComponent } from './Form.styles';
interface TogglePropsIF {
    isOn: boolean;
    onColor?: string;
    Width?: boolean | number;
    id: string;
    handleToggle:
        | MouseEventHandler<HTMLDivElement>
        | KeyboardEventHandler<HTMLDivElement>
        | undefined
        // eslint-disable-next-line
        | any;
    buttonColor?: string;
    disabled?: boolean;
    ariaLabel?: string;
}

export default function Toggle(props: TogglePropsIF) {
    const { isOn, handleToggle, id, disabled, ariaLabel } = props;

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleToggle?.(event);
            }
        },
        [handleToggle],
    );

    return (
        <ToggleComponent
            data-ison={isOn}
            aria-checked={isOn}
            aria-label={ariaLabel}
            onClick={handleToggle}
            onKeyDown={handleKeyDown}
            id={`${id}switch`}
            tabIndex={disabled ? -1 : 0}
            role='switch'
            aria-disabled={disabled}
            disabled={!!disabled}
        >
            <div
                style={{
                    width: '18px',
                    height: '18px',
                    background: 'var(--text1)',
                    borderRadius: '40px',
                }}
            />
        </ToggleComponent>
    );
}
