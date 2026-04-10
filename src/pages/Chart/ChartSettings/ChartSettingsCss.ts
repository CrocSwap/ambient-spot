import styled from 'styled-components';

const ChartSettingsContainer = styled.div<{
    top: number;
    left: number;
    isReversed: boolean;
}>`
    position: fixed;

    top: ${({ top }) => top + 'px'};
    left: ${({ left }) => left + 'px'};

    ${({ isReversed }) => {
        if (isReversed) {
            return `
            transform: translateY(-100%);
            `;
        }
    }}

    overflow: visible;

    z-index: 999999;
    font: var(--font-family);
`;

const ContextMenu = styled.div`
    width: 284px;

    padding: 8px 16px 8px 16px;

    border-radius: 4px;

    background: var(--dark1);

    border: 1px solid var(--accent1);

    box-shadow:
        0px 0px 20px 0px #7371fc66 inset,
        0px 0px 20px 0px #7371fc33;
`;

const ContextMenuHeader = styled.div`
    display: flex;

    flex-direction: row;

    justify-content: space-between;

    padding-bottom: 10px;
`;

const ContextMenuHeaderText = styled.div`
    font-family: var(--font-family);

    font-size: 16px;

    font-weight: 300;

    line-height: 20px;

    letter-spacing: -0.02em;

    text-align: left;

    color: #ffffff;
`;

const ContextMenuContextText = styled.div`
    font-family: var(--font-family);
    font-size: 12px;
    font-weight: 300;

    line-height: 15px;
    letter-spacing: -0.02em;
    text-align: left;

    color: var(--text1);
`;

const CloseButton = styled.div`
    width: 16px;

    height: 16px;

    &:hover {
        cursor: pointer;
    }
`;

const CheckListContainer = styled.div`
    gap: 16px;

    padding-top: 16px;
`;

const CheckList = styled.div`
    position: relative;

    display: flex;

    flex-direction: row;

    align-items: center;

    gap: 16px;

    height: 25px;
`;

const SelectionContainer = styled.div`
    gap: 16px;

    padding-top: 16px;
`;

const ColorPickerContainer = styled.div`
    padding-top: 16px;
`;

const ColorList = styled.div`
    height: 25px;

    display: grid;

    grid-template-columns: 50% 50%;
`;

const ColorOptions = styled.div`
    gap: 16px;

    display: flex;

    flex-direction: row;
`;

const OptionColor = styled.div<{
    backgroundColor: string | undefined;
}>`
    width: 16px;
    height: 16px;
    gap: 0px;

    border-radius: 2px;

    border: 1.5px solid var(--text3);

    background: ${({ backgroundColor }) =>
        backgroundColor !== null ? backgroundColor : 'transparent'};

    &:hover {
        cursor: pointer;
    }
`;

const ContextMenuFooter = styled.div`
    padding-top: 16px;

    display: grid;

    grid-template-columns: 50% 50%;
`;

const ActionButtonContainer = styled.div`
    display: grid;

    grid-template-columns: 60% 40%;
`;

const FooterButtons = styled.div<{
    backgroundColor: string;
    hoverColor: string;
    textColor: string;
    hoverTextColor: string;
    width: string;
}>`
    padding: 5px 8px 5px 8px;
    gap: 10px;
    border-radius: 50px;

    max-width: 110px;
    width: ${({ width }) => width};
    height: 27px;

    border: 1px solid var(--accent1);

    background: ${({ backgroundColor }) => backgroundColor};

    cursor: pointer;

    color: ${({ textColor }) => textColor};

    &:hover {
        background: ${({ hoverColor }) => hoverColor};
        color: ${({ hoverTextColor }) => hoverTextColor};
    }
`;

const FooterContextText = styled.div`
    font-size: var(--body-size);
    line-height: 15px;
    letter-spacing: -0.02em;
    text-align: center;
    text-wrap: nowrap;
`;

const Icon = styled.svg`
    fill: none;
    stroke: var(--accent1);
    stroke-width: 2px;
`;

const StyledCheckbox = styled.div<{
    checked: boolean | undefined;
}>`
    justify-content: center;
    align-items: center;
    display: flex;

    width: 16px;
    height: 16px;
    background: var(--dark1);

    border-radius: 2px;

    border: 1px solid
        ${({ checked }) => (checked ? 'var(--accent1)' : 'var(--text3)')};

    ${Icon} {
        opacity: ${({ checked }) => (checked ? 1 : 0)};
    }

    cursor: pointer;

    &:hover {
        filter: brightness(1.2);
    }
`;

const StyledSelectbox = styled.div`
    width: 90px;
    height: 23px;

    cursor: pointer;

    border-radius: 4px;

    border: 1px solid var(--text3);

    display: flex;
    justify-content: space-between;
    align-items: center;
`;

const ContextOptions = styled.div`
    width: 100%;

    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: start;
`;

const ContextOptionsSection = styled.div`
    width: 100%;

    display: grid;
    grid-template-columns: 50% 50%;
    align-items: center;

    font-size: var(--body-size);
    line-height: var(--body-lh);
    letter-spacing: -0.02em;
    text-align: center;
    text-wrap: nowrap;

    height: 30px;
`;

const OptionsHeader = styled.div`
    display: flex;
    justify-content: start;
    align-items: center;

    color: var(--text1);
`;

const OptionsContent = styled.div`
    display: flex;
    justify-content: end;

    padding-right: 4px;
`;

const MobileSettingsRow = styled.div`
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
`;

const SelectedButton = styled.button<{
    isActive: boolean | undefined;
}>`
    background: transparent;
    transition: var(--transition);
    cursor: pointer;
    font-size: var(--body-size);
    line-height: var(--body-lh);

    color: ${({ isActive }) => (isActive ? 'var(--text1)' : 'var(--text2)')};

    text-align: center;

    outline: none;
    border: none;
    padding: 1px 8px;
    position: relative;
`;

export {
    ActionButtonContainer,
    ChartSettingsContainer,
    CheckList,
    CheckListContainer,
    CloseButton,
    ColorList,
    ColorOptions,
    ColorPickerContainer,
    ContextMenu,
    ContextMenuContextText,
    ContextMenuFooter,
    ContextMenuHeader,
    ContextMenuHeaderText,
    ContextOptions,
    ContextOptionsSection,
    FooterButtons,
    FooterContextText,
    Icon,
    MobileSettingsRow,
    OptionColor,
    OptionsContent,
    OptionsHeader,
    SelectedButton,
    SelectionContainer,
    StyledCheckbox,
    StyledSelectbox,
};
