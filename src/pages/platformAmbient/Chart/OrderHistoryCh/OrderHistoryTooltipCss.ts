import styled from 'styled-components';

const OrderHistoryHover = styled.div<{
    top: number;
    left: number;
    isOnLeftSide: boolean;
    pointerEvents: boolean;
}>`
    ${({ pointerEvents }) => {
        if (!pointerEvents) return 'pointer-events: none';
    }};

    position: absolute;
    text-align: center;

    padding: 0px 15px 0px 15px;
    transform: translateY(-50%);

    top: ${({ top }) => top + 'px'};
    left: ${({ left, isOnLeftSide }) => left + (isOnLeftSide ? 0 : -15) + 'px'};
`;

const OrderHistoryContainer = styled.div`
    background: var(--dark3);

    backdrop-filter: blur(4px);

    border-radius: 4px;
    box-shadow: 0 8px 32px 0 var(--dark1);

    padding: 3px 0 3px 0;

    min-width: 120px;

    line-height: 1.3;

    gap: 6px;
`;

const OrderHistoryHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-evenly;

    margin: 3px 10px 3px 10px;

    gap: 5px;
`;

const OrderHistoryBody = styled.div`
    diplay: flex;
    align-items: center;
    justify-content: space-evenly;
`;

const StyledHeader = styled.div<{ color: string; size: string }>`
    display: flex;
    align-items: center;

    justify-content: space-evenly;
    color: ${({ color }) => color};
    font-size: ${({ size }) => size};
`;

const StyledLink = styled.div<{ color: string; size: string }>`
    display: flex;
    align-items: center;
    cursor: pointer;

    justify-content: center;

    gap: 5px;

    color: ${({ color }) => color};
    font-size: ${({ size }) => size};

    &:hover {
        -webkit-mask: linear-gradient(
                -60deg,
                black 30%,
                rgba(119, 117, 117, 0.333),
                black 70%
            )
            right/300% 100%;

        background-repeat: no-repeat;
        animation: shimmer 2s infinite;

        @keyframes shimmer {
            100% {
                -webkit-mask-position: left;
            }
        }
    }
`;

const LinkContainer = styled.div<{ isHover: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;

    max-height: 100px;

    margin: 3px 0 3px 0;

    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar {
        width: 0;
        display: none;
    }

    &::-webkit-scrollbar-thumb {
        background-color: transparent;
    }
`;

const IdContainer = styled.div`
    display: flex;
    flex-direction: column;
`;

const ArrowHoverContainer = styled.div<{ isTop: boolean }>`
    position: absolute;
    cursor: pointer;

    border-radius: 4px;

    top: ${({ isTop }) => (isTop ? '32%' : '88%')};

    width: 100%;

    background: ${({ isTop }) =>
        isTop
            ? 'linear-gradient(rgba(27, 27, 27, 0.66), rgba(30, 30, 36, 0.33))'
            : 'linear-gradient(rgba(30, 30, 36, 0.66), rgba(27, 27, 27, 0.90))'};

    &:hover {
        -webkit-mask: linear-gradient(
                -60deg,
                black 30%,
                rgba(119, 117, 117, 0.333),
                black 70%
            )
            right/300% 100%;

        background-repeat: no-repeat;
        animation: shimmer 2s infinite;

        @keyframes shimmer {
            100% {
                -webkit-mask-position: left;
            }
        }
    }
`;

export {
    OrderHistoryBody,
    OrderHistoryContainer,
    OrderHistoryHeader,
    OrderHistoryHover,
    StyledHeader,
    StyledLink,
    LinkContainer,
    ArrowHoverContainer,
    IdContainer,
};
