import React, { ReactNode, useEffect, useState } from 'react';

const FADE_INTERVAL = 40; // Time interval between each character reveal in milliseconds
const HEX_CHARS = 'abcdef0123456789'; // Hexadecimal characters

// Function to hexify the content of any element (text, span, div, etc.)
const hexifyText = (text: string): string => {
    return text
        .split('')
        .map((char) => {
            if (char === ' ') return ' '; // Preserve spaces
            if (char === '\n') return '\n'; // Preserve line breaks
            return HEX_CHARS[Math.floor(Math.random() * 16)]; // Replace all other characters with random hex values
        })
        .join('');
};

interface HexRevealProps {
    children: ReactNode;
    interval?: number;
}

const HexReveal: React.FC<HexRevealProps> = ({
    children,
    interval = FADE_INTERVAL,
}) => {
    const [revealedTexts, setRevealedTexts] = useState<string[]>([]);

    useEffect(() => {
        const childTexts = React.Children.map(children, (child) =>
            typeof child === 'string'
                ? child
                : (child as React.ReactElement).props.children,
        ) as string[];

        const hexifiedTexts = childTexts.map((text) => hexifyText(text));
        setRevealedTexts(hexifiedTexts);

        const revealNextCharacter = (index: number, textIndex: number) => {
            setRevealedTexts((prevRevealedTexts) =>
                prevRevealedTexts.map((text, i) => {
                    if (i === textIndex) {
                        return text
                            .split('')
                            .map((char, charIndex) =>
                                charIndex <= index
                                    ? childTexts[textIndex][charIndex]
                                    : char,
                            )
                            .join('');
                    }
                    return text;
                }),
            );
        };

        let currentIndex = -1;
        let currentTextIndex = 0;

        const intervalId = setInterval(() => {
            currentIndex++;
            if (currentIndex >= childTexts[currentTextIndex].length) {
                currentTextIndex++;
                currentIndex = -1; // Reset the index for the next child
            }
            if (currentTextIndex >= childTexts.length) {
                clearInterval(intervalId); // Stop when all children are revealed
            } else {
                revealNextCharacter(currentIndex, currentTextIndex);
            }
        }, interval);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <>
            {React.Children.map(children, (child, index) => {
                if (typeof child === 'string') {
                    return <span>{revealedTexts[index]}</span>;
                } else {
                    return React.cloneElement(child as React.ReactElement, {
                        children: revealedTexts[index],
                    });
                }
            })}
        </>
    );
};

export default HexReveal;
