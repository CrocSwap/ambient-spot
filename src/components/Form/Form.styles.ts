import styled, { css } from 'styled-components';

export const ButtonBase = styled.button<{
    flat: boolean;
    warning?: boolean;
    width?: string;
    height?: string;
    style?: React.CSSProperties;
}>`
    width: ${({ width }) => width || '100%'};
    height: ${({ height }) => height || 'auto'};
    outline: none;
    padding: 12px 16px;
    font-size: var(--header-size);
    line-height: var(--header1-lh);
    display: block;
    cursor: pointer;
    text-align: center;
    background: transparent;
    text-transform: capitalize;
    border-radius: var(--border-radius);
    transition: var(--transition);
    border: 1px solid var(--accent1);

    // flat or gradient
    ${({ flat }) =>
        flat
            ? css`
                  background: var(--accent1);
                  color: var(--text1);

                  &:hover,
                  &:focus-visible {
                      background: var(--dark2);
                      color: var(--accent1);
                  }
              `
            : css`
                  color: var(--accent5);
                  background: var(--title-gradient);
                  background-position: 1% 50%;
                  background-size: 300% 300%;
                  text-decoration: none;

                  &:hover,
                  &:focus-visible {
                      color: var(--text1);
                      border: 1px solid rgba(223, 190, 106, 0);
                      background-position: 99% 50%;
                  }
              `}

    ${({ disabled }) =>
        disabled &&
        css`
            font-size: var(--header2-size);
            line-height: var(--header2-lh);
            color: var(--text2);
            border: none;
            transition: color var(--animation-speed) ease-in-out;
            border-radius: var(--border-radius);
            background-color: var(--dark2);
            pointer-events: none;
        `}
    ${({ warning }) =>
        warning &&
        css`
            background: var(--dark2);
            color: var(--accent1);
        `}
`;

export const ChipComponent = styled.button`
    outline: none;
    display: flex;
    justify-content: center;
    align-items: center;
    transition: var(--transition);
    white-space: nowrap;
    height: 23px;
    padding: 5px 8px;
    text-decoration: none;
    cursor: pointer;
    font-size: var(--body-size);
    /* line-height: var(--body-lh); */
    color: var(--text1);
    background: var(--dark1);
    border: 1px solid var(--dark3);
    border-radius: 50px;

    &:hover {
        border: 1px solid var(--accent1);
        color: var(--accent1);
    }

    &:hover svg {
        color: var(--accent1) !important;
    }
`;

export const ToggleComponent = styled.div<{ disabled: boolean }>`
    width: 36px;
    height: 20px;
    background: var(--dark3);
    display: flex;
    justify-content: flex-start;
    align-items: center;
    border-radius: 18px;
    border: 1px solid var(--accent1);
    cursor: pointer;

    &:focus-visible {
        box-shadow: var(--glow-light-box-shadow);
    }

    &[data-isOn='true'] {
        justify-content: flex-end;
        background-color: var(--accent1);
    }

    &[data-isOn='true'] .handle {
        background: var(--text1);
    }
    ${({ disabled }) =>
        disabled &&
        `
    pointer-events: none;
    opacity: 0.4;
    `}
`;

export const RangeSliderWrapper = styled.input<{
    grabbing: boolean;
    percentageInput?: boolean;
}>`
    width: 100%;
    height: 10px;
    border-radius: 10px;
    outline: none;
    box-shadow: var(--dark-box-shadow);
    background: var(--dark1);
    -webkit-appearance: none;
    ${({ grabbing }) => {
        if (grabbing) {
            return `
        &::-webkit-slider-thumb {
            cursor: grabbing;
          }
          &::-moz-range-thumb {
            cursor: grabbing;
          }`;
        } else {
            return `
            &::-webkit-slider-thumb {
                cursor: grab;
            }
            &::-moz-range-thumb {
                cursor: grab;
            }
`;
        }
    }}

    ${({ percentageInput }) => {
        if (percentageInput) {
            return `
            &:focus-visible {
                box-shadow: var(--glow-light-box-shadow);
            }
            `;
        }
    }}

    &::-webkit-slider-thumb {
        background: var(--dark2);
        width: 20px;
        height: 36px;
        margin-top: -14px;
        border: 1px solid var(--accent5);
        box-sizing: border-box;
        box-shadow: var(--dark-box-shadow);
        border-radius: 10px;
        -webkit-appearance: none;
    }
    &::-moz-range-thumb {
        background: var(--dark2);
        width: 20px;
        height: 36px;
        border: 1px solid var(--accent5);
        border-radius: 10px;
        box-shadow: var(--dark-box-shadow);
    }
    &::-webkit-slider-runnable-track {
        width: 100%;
        height: 8.4px;
        cursor: pointer;
        border: var(--dark-border);
        border-radius: 10px;
        background: var(--accent1);
        box-shadow: var(--dark-box-shadow);
    }
    &::-moz-range-track {
        width: 100%;
        height: 6px;
        cursor: pointer;
        border: var(--dark-border);
        border-radius: 10px;
        background: var(--accent1);
        box-shadow: var(--dark-box-shadow);
    }
    &:focus::-webkit-slider-runnable-track {
        background: var(--accent1);
        border-radius: 10px;
    }
`;
