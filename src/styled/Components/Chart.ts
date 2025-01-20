import styled from 'styled-components/macro';
import { FlexContainer, Text } from '../Common';

export const HeaderButtons = styled.button<{
    mobileHide?: boolean;
    isFuta?: boolean;
    isActive?: boolean;
}>`
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    outline: none;
    border: none;
    background: transparent;
    cursor: pointer;
    gap: 8px;
    padding: 4px;

    ${({ isFuta }) =>
        isFuta &&
        `
            border: 1px solid var(--dark2, #14161A);
            background: var(--dark2, #14161A);
            height: var(--buttonHeightSmall, 25px);
            padding: 0px 12px;
            gap: 10px;
        `}

    ${({ isFuta, isActive }) =>
        isFuta &&
        isActive &&
        `
            border: 1px solid var(--accent1);
        `}

    &:hover {
        ${({ isFuta }) =>
            isFuta ? 'transparent' : 'background-color: var(--dark3)'};
    }

    &:focus-visible {
        box-shadow: var(--glow-light-box-shadow);
    }

    @media (max-width: 680px) {
        ${({ mobileHide }) => mobileHide && 'display: none'};
    }
`;

export const HeaderText = styled(Text)`
    @media (max-width: 968px) {
        font-size: var(--header-size);
        line-height: var(--body-lh);
    }
`;

export const FutaHeaderButton = styled.div<{
    isActive?: boolean;
}>`
    display: flex;
    background: var(--dark2);
    transition: var(--transition);
    cursor: pointer;
    font-size: var(--body-size);
    line-height: var(--body-lh);
    text-align: center;
    outline: none;
    position: relative;

    height: 25px;
    padding: 4px 16px 4px 16px;

    padding: 1px 8px;
    position: relative;

    justify-content: center;
    align-items: center;

    &:hover {
        background-color: var(--dark3);
        color: var(--accent1);
    }

    color: ${({ isActive }) => (!isActive ? 'var(--accent1)' : 'var(--text2)')};
    border: ${({ isActive }) =>
        !isActive ? '1px solid var(--accent1)' : 'none'};
`;

export const MainContainer = styled(FlexContainer)`
    position: relative;

    @media only screen and (min-device-width: 320px) and (max-device-width: 1200px) and (-webkit-min-device-pixel-ratio: 2) {
        overflow: hidden;
    }
`;

export const ArrowContainer = styled.div<{ degree?: number }>`
    display: inline-block;
    width: 10px;
    height: 10px;
    cursor: pointer;
    font-size: var(--body-lh);
    line-height: var(--body-lh);
    color: var(--text2);
    border-top: 1px solid var(--text2);
    border-right: 1px solid var(--text2);
    transition: all 600ms;
    margin: auto;
    transform: ${({ degree }) => `rotate(${degree}deg)`};
`;

export const SwitchButton = styled.div<{ isActive: boolean }>`
    margin-top: 4px;

    border-radius: 4px;
    padding: 2px 5px 2px 5px;
    cursor: pointer;

    color: ${({ isActive }) => (isActive ? 'var(--text2)' : 'var(--text1)')};
`;
