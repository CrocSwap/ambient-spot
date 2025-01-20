import { Link } from 'react-router-dom';
import styled, { css } from 'styled-components/macro';
import { FlexContainer, GridContainer, Text } from '../Common';
import { AnimationProps, Animations } from '../Common/Animations';

interface TradeModuleLinkProps {
    isActive: boolean;
    isFuta?: boolean;
}

export const TradeModuleLink = styled(Link)<TradeModuleLinkProps>`
    display: flex;
    justify-content: center;
    align-items: center;
    width: 116px;
    height: ${({ isFuta }) => (isFuta ? '29px' : '25px')};
    font-size: 18px;
    border-radius: var(--border-radius);
    transition: all var(--animation-speed) ease-in-out;

    color: ${({ isFuta }) => (isFuta ? 'var(--text2)' : 'var(--text1)')};
    background: ${({ isFuta }) => (isFuta ? 'var(--dark2)' : 'var(--dark2)')};

    ${({ isFuta, isActive }) =>
        isFuta &&
        css`
            ${isActive &&
            css`
                color: var(--accent1);
                background: var(--base-dark2, #14161a);
                border: 0.5px solid var(--base-accent1, #62ebf1);
            `}

            &:hover {
                opacity: 0.5;
                border: 0.5px solid var(--base-accent1, #62ebf1);
            }
            border-radius: 0;
            width: 50%;
            transition: all var(--animation-speed) ease-in-out;
        `}

    ${({ isActive, isFuta }) =>
        !isFuta &&
        isActive &&
        css`
            background: var(--accent1);
        `}
    
    &:hover {
        ${({ isFuta }) =>
            !isFuta &&
            css`
                background: var(--accent1);
            `}
    }
`;

export const WarningContainer = styled(FlexContainer)`
    border: 1px solid var(--other-red);
    border-radius: var(--border-radius);
    text-transform: uppercase;

    & svg {
        color: var(--other-red) !important;
    }
`;

export const HoverableIcon = styled.svg`
    fill: var(--text2) !important;
    color: var(--text2) !important;
    height: 20px;
    width: 20px;

    &:hover {
        fill: var(--accent1) !important;
        color: var(--accent1) !important;
    }
`;

export const AdvancedModeSection = styled(FlexContainer)<{ disabled: boolean }>`
    ${({ disabled }) =>
        disabled &&
        `
        pointer-events: none;
        opacity: 0.2;
        filter: blur(2px);
    `}
`;

export const AcknowledgeText = styled(Text)`
    border: 1px var(--dark3);
    border-radius: var(--border-radius);
    border: 0.1px solid var(--text3);
    text-align: center;
    padding: 4px;
    margin-top: 8px;
`;

export const AcknowledgeLink = styled.a`
    border: 1px solid transparent;
    border-bottom: 1px solid var(--accent1);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    transition: var(--transition);
`;

export const SettingsContainer = styled(FlexContainer)`
    min-height: 305px;
    border-radius: var(--border-radius);
`;

export const ShareItem = styled.a`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 80px;
    width: 130px;
    color: var(--text2);
    margin-bottom: 12px;

    transition: var(--transition);

    &:hover,
    &:focus-visible {
        color: var(--text1);
        background: var(--dark2);
        border-radius: var(--border-radius);
    }

    &:focus-visible svg {
        color: var(--text2);
    }
`;

export const TokenArrowButton = styled.button<{
    onlyDisplay: boolean;
    disabled: boolean;
}>`
    display: flex;
    transition: var(--transition);
    border-radius: 50%;

    justify-content: center;
    align-items: center;

    height: 30px;
    width: 30px;

    outline: none;
    border: none;
    background: transparent;

    cursor: ${({ onlyDisplay }) => (onlyDisplay ? 'default' : 'pointer')};

    ${({ disabled }) => disabled && 'cursor: wait !important; '}

    @media only screen and (min-width: 768px) {
        &:hover {
            width: 30px;
            height: 30px;
            border-radius: 50%;

            svg {
                -webkit-transform: rotate(180deg);
                -moz-transform: rotate(180deg);
                -o-transform: rotate(180deg);
                -ms-transform: rotate(180deg);
                transform: rotate(180deg);

                ${({ onlyDisplay }) =>
                    onlyDisplay &&
                    `
                    transform: none;
                    cursor: unset !important;
                `}

                ${({ disabled }) =>
                    disabled &&
                    `
                    cursor: wait !important;
                `}
            }
        }
    }
`;

export const TokenArrow = styled.svg<{
    onlyDisplay: boolean;
    disabled: boolean;
}>`
    background-color: transparent;
    transition: 0.7s;
    -webkit-transition: 0.7s;
    -moz-transition: 0.7s;
    -ms-transition: 0.7s;
    -o-transition: 0.7s;

    ${({ disabled }) => disabled && 'cursor: wait !important; '}
`;

export const IconButton = styled.button`
    background: transparent;
    outline: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    color: var(--text2);
`;

export const ShareUrl = styled.input`
    flex: 1;
    outline: none;
    border: none;
    color: var(--text2);
    background: var(--dark2);
    padding: 8px;
    border-radius: var(--border-radius);
    text-overflow: ellipsis;
`;

export const InputDisabledText = styled(FlexContainer)`
    font-size: var(--mini-size);
    line-height: var(--body-lh);
    text-align: center;
    font-weight: 100;
`;

export const TokenQuantityInput = styled.input`
    font-weight: 300;
    font-size: var(--header1-size);
    line-height: var(--header1-lh);
    color: var(--text1);
    text-align: start;
    width: 95%;
    height: calc(1.5em + 0.75rem + 2px);
    padding: 0;
    max-height: 23px;
    margin: 8px 0;
    // margin-left: 32px;
    border: none;
    outline: 0;
    background-color: transparent;
    background-clip: padding-box;

    transition:
        border-color var(--animation-speed) ease-in-out,
        box-shadow var(--animation-speed) ease-in-out;

    font-family: var(--mono);

    &::placeholder {
        color: var(--text3);
    }
`;

export const TokenQuantityContainer = styled.div<AnimationProps>`
    min-height: 40px;

    display: grid;
    grid-template-columns: 1fr 145px;
    ${Animations};
`;

export const TokenSelectButton = styled.button<{ justDisplay?: boolean }>`
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;

    cursor: ${(props) => (props.justDisplay ? 'default' : 'pointer')};
    pointer-events: ${(props) => (props.justDisplay ? 'none' : 'auto')};
    transition: var(--transition);

    background: var(--dark1);
    outline: none;
    border: 0.5px solid transparent;
    padding: 0 4px;
    height: 40px;
    padding-right: ${(props) => (props.justDisplay ? '12px' : '')};

    font-size: var(--header2-size);
    line-height: var(--header2-lh);
    color: var(--text1);

    &:hover {
        border: 0.5px solid var(--accent1);
        color: var (--accent1);
        box-shadow: 0px 0px 20px 0px rgba(115, 113, 252, 0.25) inset;
        transition: var(--transition);
    }

    &:focus-visible {
        border: 1px solid var(--text1);
    }
`;

export const RefreshButton = styled(IconButton)`
    display: flex;

    justify-content: flex-end;
    padding: 0 24px;

    &:hover > svg {
        color: var(--accent1);
    }

    &:focus-visible {
        color: var(--text1);
        cursor: pointer;
    }
`;

export const RefreshButtonFuta = styled.button`
    display: flex;
    width: 82px;
    margin-left: auto;
    padding: 0px 12px;
    justify-content: center;
    align-items: center;
    gap: 10px;
    background: var(--dark2, #14161a);
    color: var(--text2, #939c9e);
    text-align: center;

    font-family: 'Fira Mono';
    font-size: 18px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    letter-spacing: -0.36px;

    border: none;
    cursor: pointer;
    transition: color 0.3s ease;

    &:hover {
        color: var(--text1);
    }

    &:focus-visible {
        color: var(--text1);
        cursor: pointer;
    }
`;

export const ExtraInfoContainer = styled(FlexContainer)<{
    active: boolean;
    isFuta?: boolean;
}>`
    border-radius: var(--border-radius);

    ${({ active }) =>
        active
            ? `
        & > div:not(:first-child) {
            &:hover {
                color: var(--accent1);
            }
        }
        &:hover {
            cursor: pointer;
            background: var(--dark2) !important;
        }
        &:focus-visible {
            border: 1px solid var(--text1);
        }
    `
            : `
        & > div:last-child {
            cursor: pointer;

            &:hover {
                color: var(--accent1);
            }
        }
        
        &:hover,
        &:focus-visible {
            border-radius: var(--border-radius);
            cursor: default;
            background: transparent;
        }
    `}

    ${({ isFuta }) =>
        isFuta
            ? `
        & {
          text-transform: uppercase !important;
        }
    `
            : ''}
`;

export const ExtraDetailsContainer = styled.div`
    border: 1px solid var(--dark3);
    border-radius: var(--border-radius);

    color: var(--text2);
    font-size: var(--body-size);
    line-height: var(--body-lh);
    padding: 8px 16px;
`;

export const ModalContainer = styled(FlexContainer)`
    width: 100%;
    border-radius: var(--border-radius);

    @media (min-width: 500px) {
        width: 400px;
    }
`;

export const ConfirmationDetailsContainer = styled(FlexContainer)`
    border: 1px solid var(--border);
    border-radius: var(--border-radius);
`;

export const ConfirmationQuantityContainer = styled.div`
    height: 40px;
    width: 100%;
    display: grid;
    grid-template-columns: auto 140px;
    align-items: center;
    background: var(--dark2);
    padding: 0 1rem 0 1rem;
    border-radius: var(--border-radius);
`;

export const SubmitTransactionButton = styled.button`
    height: auto;
    width: 100%;

    font-size: var(--body-size);
    line-height: var(--header1-lh);

    text-align: center;

    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border: none;
    outline: none;
    cursor: pointer;

    padding: 12px 8px;

    text-transform: capitalize;
    background: var(--dark2);
    color: var(--text1);

    border-radius: var(--border-radius);
`;

export const SubmitTransactionExtraButton = styled.button`
    background: transparent;
    outline: none;
    font-size: var(--body-size);
    line-height: var(--body-lh);
    color: var(--text1);
    cursor: pointer;
    border: 1px solid var(--dark3);
    transition: var(--transition);
    border-radius: 50px;
    padding: 4px 8px;

    &:hover {
        color: var(--accent5);
    }
`;

export const LimitRateButtonContainer = styled(FlexContainer)<{
    disabled: boolean;
}>`
    border-radius: var(--border-radius);

    ${({ disabled }) =>
        disabled &&
        `
        pointer-events: none;
        filter: blur(2px);
    `}
`;

export const LimitRateButton = styled.button`
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    outline: inherit;

    width: 20px;
    height: 20px;

    & button:hover > svg {
        color: var(--accent1);
    }
    & button:focus-visible {
        box-shadow: var(--glow-light-box-shadow);
    }
`;

export const FeeTierDisplay = styled.div`
    padding: 16px;

    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    background-color: var(--dark2);
`;

export const PriceInputContainer = styled.div`
    display: grid;
    grid-template-columns: 18px 1fr 18px;
    color: var(--text1);
    font-size: 20px;
    line-height: var(--header1-lh);

    text-align: center;

    background: var(--dark2);
    border-radius: var(--border-radius);
    padding: 0.8rem 5px;
`;

export const PriceInputButton = styled.button`
    cursor: pointer;

    outline: none;
    border: none;
    background: transparent;

    &:focus-visible {
        box-shadow: var(--glow-light-box-shadow);
    }
`;

export const PriceInput = styled.input`
    overflow: hidden;
    width: 100%;
    padding: 0;
    color: var(--text1);
    text-align: center;
    white-space: nowrap;
    text-overflow: ellipsis;
    border: none;
    outline: none;
    background-color: transparent;
    flex: 1 1 auto;
    -webkit-appearance: textfield;
    -moz-appearance: textfield;
    appearance: textfield;
`;

export const SelectedRangeContainer = styled(GridContainer)`
    @media only screen and (min-width: 768px) {
        grid-template-columns: 1fr 1fr;
    }
`;

// TODO: there exists a similarly named component in portfolio components
// Should determine whether two separate components are needed
export const CurrencyQuantityInput = styled.input`
    width: 100%;
    font-weight: 300;
    height: 31px;
    padding: 4px 16px;
    font-size: 18px;
    line-height: 22px;
    color: var(--text1);
    text-align: start;
    border: none;
    border-radius: var(--border-radius);
    outline: 0;
    background-color: var(--dark2);
    background-clip: padding-box;
    transition:
        border-color var(--animation-speed) ease-in-out,
        box-shadow var(--animation-speed) ease-in-out;
`;

export const LPButton = styled.button`
    background: transparent;
    outline: none;
    border: none;
    color: var(--accent1);
    text-align: center;
    font-family: 'Fira Mono';
    font-size: 18px;
    font-style: normal;
    font-weight: 400;
    line-height: normal;
    letter-spacing: -0.36px;
    text-decoration-line: underline;
    transition: color 0.3s ease;
    cursor: pointer !important;
    text-transform: uppercase;
    width: 150px;
    margin: 0 auto;

    &:hover {
        color: var(--accent2);
    }
`;
