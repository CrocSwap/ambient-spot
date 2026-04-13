import styled from 'styled-components';

const ToolbarContainer = styled.div<{
    isActive: boolean;
    isMobile: boolean;
    isFullScreen: boolean;
    isSmallScreen: boolean;
    backgroundColor: string;
    marginTopValue: number;
    height: number;
}>`
    ${({ isActive, marginTopValue, isMobile, isFullScreen }) => {
        const marginTop = isMobile ? '' : `${marginTopValue}px`;
        const marginLeft = isFullScreen ? 16 : 0;
        if (isActive) {
            return `
            width: 38px;
            padding-left:5px;
            margin-left:${marginLeft}px;
            margin-top: ${marginTop};
            &::-webkit-scrollbar {
                width: 0;
                display: none;
                color:'transparent transparent';
            }
        
            &::-webkit-scrollbar-thumb {
                background-color: transparent;
            }
        `;
        } else {
            return `
            width: 9px;
            margin-left:${marginLeft + 5}px;

            margin-left:5px;
            margin-top: ${marginTop}
            `;
        }
    }}

    background: ${({ backgroundColor }) => backgroundColor};
    height: ${({ height }) => height + 'px'};
    left: 0;
    display: flex;
    position: absolute;

    grid-column: 2;
    grid-row: 3;
    transition: all 600ms ease-in-out;
    z-index: 6;
    scrollbar-color: auto;

    @media (min-width: 768px) and (max-width: 1024px) {
        margin-left: 16px;
    }

    @media (max-width: 767px) {
        margin-left: 0;
    }
`;

const ScrollableDiv = styled.div<{ height: string; isHover: boolean }>`
    overflow-y: auto;
    overflow-x: hidden;

    ${({ isHover }) => {
        if (isHover) {
            return `
            margin-right: -150px;
            padding-right: 150px;
    `;
        }
    }}
    height: ${({ height }) => height};

    &::-webkit-scrollbar {
        width: 0;
        display: none;
    }

    &::-webkit-scrollbar-thumb {
        background-color: transparent;
    }
`;

const IconCard = styled.div`
    position: relative;

    overflow: visible;

    flex-direction: row-reverse;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const IconActiveContainer = styled.div`
    margin-bottom: 10px;
    display: flex;
    width: Fixed (24px);
    height: Fixed (24px);
    padding: 2px;
    border-radius: 4px;
    gap: 10px;

    &:hover {
        cursor: pointer;
        background: #242f3f;
    }
`;

// ? img
const IconFillContainer = styled.div<{ isActive: boolean; fill: string }>`
    ${({ isActive, fill }) => {
        if (isActive) {
            return (
                `
        background-color:` +
                fill +
                `;
        max-width : 23px;
    `
            );
        }
    }}

    margin-bottom: 10px;
    display: flex;
    width: Fixed (24px);
    height: Fixed (24px);
    padding-top: 2px;
    padding-bottom: 2px;
    border-radius: 4px;
    gap: 10px;

    &:hover {
        cursor: pointer;
        ${({ isActive }) => (!isActive ? 'background: #242f3f' : '')};
    }
`;

const ArrowContainerContainer = styled.div<{
    width: string;
    top?: string;
}>`
    position: absolute;
    display: flex;
    width: 45px;
    height: 25px;
    padding: 2px;
    border-radius: 4px;
    grid-gap: 10px;
    gap: 10px;
    cursor: pointer;
    z-index: 1;
    opacity: 0.9;
    left: -8px;
    align-items: center;
    background-color: #101626c2;

    width: ${({ width }) => width}

    left: -8
`;

const DividerContainer = styled.div`
    width: 100%;
    display: flex;
    flex-direction: row-reverse;
`;

const DrawlistContainer = styled.div<{
    isActive: boolean;
}>`
    ${({ isActive }) => {
        if (isActive) {
            return `
            @keyframes identifier {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }
        
            animation: identifier 600ms ease-in-out forwards;
            opacity: 0;
            width: 70%;
    `;
        } else {
            return `
            width: 0%;
        `;
        }
    }}

    display: flex;
`;

const Divider = styled.div`
    background: #242f3f;
    width: 1px;
`;

const IconActive = styled.img<{ isActive: boolean }>`
    ${({ isActive }) => {
        if (isActive) {
            return `
        filter: invert(45%) sepia(99%) saturate(2440%) hue-rotate(220deg)
        brightness(100%) contrast(98%);
`;
        } else {
            return `
        filter: invert(70%) sepia(14%) saturate(341%) hue-rotate(169deg)
        brightness(100%) contrast(100%);
    `;
        }
    }}
`;

const DividerButton = styled.div<{ isActive: boolean }>`
    position: relative;
    width: 8px;
    height: 30px;
    top: 70%;
    left: 5px;
    padding: 0px 2px 0px 2px;
    border-radius: 4px;
    border: 1px solid #242f3f;
    cursor: pointer;
    display: grid;
    align-items: center;
    z-index: 99;
    background: ${({ isActive }) =>
        isActive ? 'var(--dark1)' : 'var(--accent1)}'};
`;

const ArrowRight = styled.span<{ isActive: boolean }>`
    ${({ isActive }) => {
        if (isActive) {
            return `
                margin-left: 0px;
                transform: rotate(225deg);
            `;
        } else {
            return `
            margin-left: -2.5px;
            transform: rotate(45deg);
            `;
        }
    }}

    display: inline-block;
    width: 5px;
    height: 5px;
    border-top: ${({ isActive }) =>
        !isActive ? '1px solid var(--dark1)' : '1px solid #dbdbdb'};
    border-right: ${({ isActive }) =>
        !isActive ? '1px solid var(--dark1)' : '1px solid #dbdbdb'};
    transition: all 600ms;
`;

const UndoRedoButtonActive = styled.div<{ isActive: boolean }>`
    margin-bottom: 10px;
    display: flex;
    width: Fixed (24px);
    height: Fixed (24px);
    padding: 2px;
    border-radius: 4px;
    gap: 10px;
    cursor: pointer;

    justifyContent: 'center',
    alignItems: 'center',

    &:hover {
        ${({ isActive }) => (isActive ? 'background: #242f3f;' : '')};
    }
`;

const UndoButtonSvg = styled.img<{ isActive: boolean }>`
    filter: invert(39%) sepia(27%) saturate(240%) hue-rotate(171deg)
        brightness(${({ isActive }) => (isActive ? '100%' : '50%')})
        contrast(82%);
`;

export {
    ArrowContainerContainer,
    ArrowRight,
    Divider,
    DividerButton,
    DividerContainer,
    DrawlistContainer,
    IconActive,
    IconActiveContainer,
    IconCard,
    IconFillContainer,
    ScrollableDiv,
    ToolbarContainer,
    UndoButtonSvg,
    UndoRedoButtonActive,
};
