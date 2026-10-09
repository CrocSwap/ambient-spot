import styled, { css } from 'styled-components';

import { Link } from 'react-router-dom';
import { FlexContainer, GridContainer, Text } from '../Common';
import { hideScrollbarCss } from '../Common/Container';

export const HomeTitle = styled.div`
    font-style: normal;
    font-size: var(--header1-size);
    line-height: 30px;
    text-align: center;
    letter-spacing: -0.02em;
    color: var(--text1);
    font-weight: 400;

    &:focus-visible {
        text-decoration: underline;
        text-decoration-color: var(--text1);
        border: none;
        outline: none;
    }
`;

export const HomeContent = styled(FlexContainer)<{ isFading?: boolean }>`
    max-width: 1500px;
    margin: 0 auto;
    list-style-type: none;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 1rem;

    /* Add fade animation */
    ${({ isFading }) =>
        isFading
            ? css`
                  opacity: 0;
                  transition: opacity 1s ease-in-out;
              `
            : css`
                  opacity: 1;
                  transition: opacity 1s ease-in-out;
              `}
`;

export const HeroContainer = styled(FlexContainer)`
    -webkit-background-size: cover;
    -moz-background-size: cover;
    -o-background-size: cover;
    background-size: cover;

    img {
        width: 250px;
        transition: var(--transition);
    }

    @media only screen and (min-width: 768px) {
        img {
            width: 500px;
        }
    }
`;

// Trade Now Buton

interface ButtonProps {
    inNav?: boolean;
    mobileVersion?: boolean;
}
export const StyledLink = styled(Link)<ButtonProps>`
    width: 100%;
    z-index: 1;
    border-radius: var(--border-radius);
    background: var(--title-gradient);
    max-width: 16rem;
    max-height: 3rem;
    padding: 1px;
    height: 54px;
    display: flex;
    justify-content: center;
    align-items: center;
    outline: none;
    border: none;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    border-radius: var(--border-radius);

    ${(props) =>
        props.inNav &&
        `
        max-width: 10rem;
        max-height: 2rem;
        height: 54px;
    `}

    &:hover, &:focus-visible {
        box-shadow: var(--glow-box-shadow);
    }
`;

export const TradeNowButtonText = styled(Text)<ButtonProps>`
    ${({ mobileVersion }) =>
        mobileVersion &&
        `
        font-size: var(--header-size);
        line-height: var(--header-size);
    `}

    ${(props) =>
        props.inNav &&
        `
        font-size: 20px;
        line-height: 28px;
    `}
`;

// Investors

export const InvestorsContainer = styled.div`
    border-bottom: 1px solid var(--border);
    padding: 1rem 0 3rem 0;
    text-align: center;
`;

export const InvestorsContent = styled(FlexContainer)`
    @media only screen and (max-width: 1020px) {
        justify-content: center;
        align-items: center;
        width: 100dvw;
    }

    @media only screen and (min-width: 1020px) {
        max-width: 1020px;
    }

    @media only screen and (max-width: 1020px) img {
        width: 80px;
    }
`;

export const InvestorRow = styled.div<{ row: number }>`
    display: flex;
    gap: 1rem;
    max-width: 100%;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    place-items: center;

    @media only screen and (min-width: 1020px) {
        ${({ row }) => {
            switch (row) {
                case 2:
                case 3:
                case 7:
                    return 'justify-content: space-around;';
                case 4:
                    return 'display: grid; grid-template-columns: repeat(4, 1fr);';
                case 5:
                    return 'display: grid; grid-template-columns: repeat(6, 1fr);';
                default:
                    return '';
            }
        }}
    }
`;

export const MobileContainer = styled(GridContainer)`
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    align-items: center;
    justify-items: center;
    align-content: center;
    padding: 1rem 2rem;

    img {
        max-width: 100%;
        height: auto;
    }

    span {
        text-align: center;
    }
`;

// Landing Sections

export const SlideContainer = styled.div<{
    tabletHeight: 'large' | 'medium' | 'small';
}>`
    padding-bottom: 1rem;

    @media only screen and (min-width: 768px) {
        padding-bottom: 0;
        padding: 2rem 0;
        justify-content: center;
        align-items: center;
        display: flex;
        ${({ tabletHeight }) => {
            switch (tabletHeight) {
                case 'large':
                    return 'min-height: 500px;';
                case 'medium':
                    return 'height: 400px;';
                case 'small':
                default:
                    return 'height: 300px;';
            }
        }}

    @media only screen and (max-width: 600px) {
        h2 {
            font-size: 20px;
        }
        a {
            display: none;
        }
    }
`;

export const RowContainer = styled(FlexContainer)`
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 2rem;

    @media only screen and (min-width: 768px) {
        flex-direction: row;
    }
`;

// TODO: use a constant for this max-width field
export const FasterSection = styled(FlexContainer)`
    max-width: 907px;
`;

export const BGImage = styled.img<{ height: number; top: number }>`
    position: absolute;
    width: 100%;
    height: ${({ height }) => height}px;
    top: ${({ top }) => top}px;
    pointer-events: none;

    @media only screen and (max-width: 600px) {
        display: none;
    }
`;

// Mobile Landing Sections
export const MobileMainLogo = styled(FlexContainer)`
    height: 130px;
    background-size: cover;
    background-position: center center;

    img {
        object-fit: contain;
    }
`;

const BgBase = styled.div`
    position: absolute;
    left: 0;
    width: 100%;
    background-size: cover;
    background-repeat: no-repeat;
    -webkit-background-size: cover;
    -moz-background-size: cover;
    -o-background-size: cover;
`;

export const MobileBg1 = styled(BgBase)`
    top: 200px;
    height: 900px;
`;

export const MobileBg2 = styled(BgBase)`
    background-position: right bottom;
    bottom: 0;
    height: 150px;
`;

export const MobileBg3 = styled(BgBase)`
    bottom: 0;
    height: 80px;
`;

export const MobileBg4 = styled(BgBase)`
    bottom: 0;
    height: 200px;
`;

export const MobileBgFooter = styled(BgBase)`
    top: 350px;
    height: 500px;
`;

export const MobileMainContainer = styled.div<{ isIPhone: boolean }>`
    position: relative;
    overflow-y: scroll;
    width: 100%;
    overflow-x: hidden;
    max-width: 100dvw;
    background: var(--dark1);
    ${hideScrollbarCss}

    ${({ isIPhone }) => `height: ${isIPhone ? '100dvh' : '100vh'};`}
    ${({ isIPhone }) =>
        `scroll-snap-type: ${isIPhone ? 'y mandatory' : 'none'};`}
`;

export const MobileCard = styled(FlexContainer)`
    height: 100%;
    padding: 20px;
    border-radius: 8px;
    justify-content: center;
    position: relative;
    scroll-snap-align: center;
    align-items: center;
    text-align: center;
    gap: 10px;
`;

// Top Pools

export const TopPoolContainer = styled(FlexContainer)`
    @media only screen and (min-width: 768px) {
        padding: 1rem 0;
    }
`;

export const TopPoolViewMore = styled.div`
    color: var(--accent1);
    font-size: var(--header2-size);
    line-height: var(--header2-lh);
    font-weight: 400;
    text-decoration: underline;
`;

// Stats

export const StatContainer = styled(FlexContainer)`
    @media only screen and (max-width: 600px) {
        width: 100%;
    }
`;

export const StatCardContainer = styled(FlexContainer)`
    width: 350px;
    height: 100px;
    border-radius: var(--border-radius);
    cursor: default;
    transition: var(--transition);

    &:hover {
        box-shadow: var(--glow-light-box-shadow);
    }

    @media only screen and (max-width: 600px) {
        width: 100%;
        height: 70px;
        padding: 8px;
        box-shadow: none;
    }
`;

export const StatValue = styled(Text)`
    line-height: 22px;
    letter-spacing: -0.02em;
`;
