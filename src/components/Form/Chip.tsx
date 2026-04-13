import styled from 'styled-components';

interface PropsIF {
    key?: string;
    ariaLabel?: string;
    selected?: boolean;
    onClick: () => void;
    variant?: 'outlined' | 'secondary' | 'filled'; // default is outlined
    disabled?: boolean;
}

const purpleOutlineHover = `                
&:hover {
    border: 1px solid var(--accent1);
    color: var(--accent1);
}
&:hover svg {
    color: var(--accent1) !important;
}`;
const greyOutlineHover = `                
&:hover {
    border: 1px solid var(--text2);
    color: var(--text2);
}
&:hover svg {
    color: var(--text2) !important;
}`;
export const Chip = styled.button<PropsIF>`
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

    border: 1px solid var(--dark3);
    border-radius: 50px;

    ${({ variant, disabled }) => {
        switch (variant) {
            case 'secondary':
                return `
                color: var(--text2);
                background-color: var(--dark2);
                ${disabled ? greyOutlineHover : purpleOutlineHover}
                `;
            case 'filled':
                return `
                background-color: var(--accent1);
                color: var(--text1);`;

            case 'outlined':
            default:
                return `
                color: var(--text1);
                background: var(--dark1);
                ${disabled ? greyOutlineHover : purpleOutlineHover}
                `;
        }
    }}

    ${({ selected }) =>
        selected &&
        `
        border: 1px solid var(--accent1);
        color: var(--accent1);
        
        &:hover {
            border: 1px solid var(--accent1);
            color: var(--accent1);
        }

        &:hover svg {
            color: var(--accent1) !important;
        }
    `}
`;
