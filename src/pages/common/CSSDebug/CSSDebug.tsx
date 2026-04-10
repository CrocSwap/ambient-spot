import { useContext, useState } from 'react';
import { skins } from '../../../App/hooks/useSkin';
import { BrandContext } from '../../../contexts/BrandContext';
import Swap from '../../platformAmbient/Swap/Swap';
import styles from './CSSDebug.module.css';
import ColorToggle from './ColorToggle';

export type colorFormats = 'text' | 'background' | 'border';

export interface cssColorIF {
    name: string;
    format: colorFormats;
}

const textColors: cssColorIF[] = [
    { name: '--text1', format: 'text' },
    { name: '--text2', format: 'text' },
    { name: '--text3', format: 'text' },
    { name: '--accent1', format: 'text' },
    { name: '--accent2', format: 'text' },
    { name: '--accent3', format: 'text' },
    { name: '--accent4', format: 'text' },
    { name: '--accent5', format: 'text' },
    { name: '--positive', format: 'text' },
    { name: '--negative', format: 'text' },
    { name: '--other-green', format: 'text' },
    { name: '--other-red', format: 'text' },
];

const backgroundColors: cssColorIF[] = [
    { name: '--dark1', format: 'background' },
    { name: '--dark2', format: 'background' },
    { name: '--dark3', format: 'background' },
    { name: '--dark4', format: 'background' },
];

const borderColors: cssColorIF[] = [
    { name: '--border', format: 'border' },
    { name: '--dark-border-color', format: 'border' },
];

export interface allColorsIF {
    text: cssColorIF[];
    background: cssColorIF[];
    border: cssColorIF[];
}

const allColors: allColorsIF = {
    text: textColors,
    background: backgroundColors,
    border: borderColors,
};

interface propsIF {
    noSwap?: boolean;
}

export default function CSSDebug(props: propsIF) {
    const { noSwap } = props;
    const { skin } = useContext(BrandContext);
    const SAMPLE_TEXT = 'Zero-to-One Decentralized Trading Protocol';
    const [sampleText, setSampleText] = useState<string>(SAMPLE_TEXT);

    return (
        <>
            {
                <select onChange={(e) => skin.set(e.target.value as skins)}>
                    {skin.available.map((s: skins) => {
                        const makeReadable = (str: string): string => {
                            switch (str) {
                                case 'purple_dark':
                                    return 'Purple Dark';
                                case 'purple_light':
                                    return 'Purple Light';
                                default:
                                    return str;
                            }
                        };
                        return (
                            <option key={s} value={s}>
                                {makeReadable(s)}
                            </option>
                        );
                    })}
                </select>
            }
            <label htmlFor='sample_text_changer'>Sample text:</label>
            <input
                type='text'
                name='sample_text_changer'
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
            />
            <section className={styles.css_debug}>
                {textColors.map((c: cssColorIF) => (
                    <ColorToggle
                        key={JSON.stringify(c)}
                        cssProperty={c}
                        sampleText={sampleText}
                        allColors={allColors}
                    />
                ))}
                {backgroundColors.map((c: cssColorIF) => (
                    <ColorToggle
                        key={JSON.stringify(c)}
                        cssProperty={c}
                        sampleText={sampleText}
                        allColors={allColors}
                    />
                ))}
                {borderColors.map((c: cssColorIF) => (
                    <ColorToggle
                        key={JSON.stringify(c)}
                        cssProperty={c}
                        sampleText={sampleText}
                        allColors={allColors}
                    />
                ))}
            </section>
            {noSwap || <Swap />}
        </>
    );
}
