/* eslint-disable quotes */
import { useContext, useEffect, useRef } from 'react';
import { FiLink } from 'react-icons/fi';
import { useParams } from 'react-router-dom';
import { IS_LOCAL_ENV } from '../../../ambient-utils/constants';
import { AppStateContext } from '../../../contexts/AppStateContext';
import useCopyToClipboard from '../../../utils/hooks/useCopyToClipboard';
import { linkGenMethodsIF, useLinkGen } from '../../../utils/hooks/useLinkGen';
import styles from './FAQ.module.css';
import ambientBg from '../../../assets/images/backgrounds/background.png';
import { ReactNode } from 'react';

interface questionIF {
    question: string;
    answer: string | string[] | ReactNode | ReactNode[];
    slugs: string[];
}

export default function FAQPoints() {
    const { params } = useParams();

    const {
        snackbar: { open: openSnackbar },
    } = useContext(AppStateContext);
    const elementRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    // Function to filter refs based on partial key match
    const filterRefsByPartialKey = (partialKey: string) => {
        return Object.keys(elementRefs.current)
            .filter((key) => key.includes(partialKey))
            .map((key) => elementRefs.current[key]);
    };

    // logic to scroll user to the question specified by params
    useEffect(() => {
        // only run logic if a param was provided in the URL
        setTimeout(() => {
            if (params) {
                const elem: HTMLDivElement | null =
                    filterRefsByPartialKey(params)[0];
                elem &&
                    elem.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                    });
            }
        }, 1500);
    }, [params]);

    const [_, copy] = useCopyToClipboard();

    // all questions as a string
    // all answers as a string (one paragraph) or array of strings (multiple paragraphs)
    const questions: questionIF[] = [
        {
            question: 'How do I earn Ambient Points?',
            answer: [
                'Ambient Points are earned by making swaps and providing liquidity. The more you swap and the more swaps use the liquidity you have provided, the more Points you earn.',
                'Points are distributed once per week.',
            ],
            slugs: ['how-to-earn-ambi-points'],
        },
    ];

    // hook needed to help build URL for link
    const linkGenCurrent: linkGenMethodsIF = useLinkGen();
    // fn to build a link and copy it to the clipboard
    function copyLink(s: (typeof questions)[number]['slugs'][0]): void {
        // domain to use, local vs deployed
        const domain: string = IS_LOCAL_ENV
            ? 'localhost:3000'
            : 'https://ambient.finance';
        // the rest of the URL
        const baseURL: string = linkGenCurrent.getFullURL(s);
        // send full navigable URL to clipboard
        copy(domain + baseURL);
        openSnackbar('Link copied to clipboard', 'info');
    }

    return (
        <div
            className={styles.background}
            style={{
                background: `url(${ambientBg}) no-repeat`,
            }}
        >
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.header_container}>
                        <span className={styles.header}>Points FAQ</span>
                        <span className={styles.sub_header}>
                            Last Updated: Apr 3, 2024
                        </span>
                    </div>

                    <ul
                        style={{
                            listStyleType: 'none',
                            marginLeft: '0',
                            marginTop: '10px',
                        }}
                        className='custom_scroll_ambient'
                    >
                        {questions.map((q: questionIF) => {
                            const answerAsArray: (string | ReactNode)[] = [
                                q.answer,
                            ].flat();
                            return (
                                <li key={q.question.toString()}>
                                    <div
                                        id={q.slugs[0]}
                                        className={styles.question}
                                        ref={(el) => {
                                            if (el) {
                                                elementRefs.current[
                                                    q.slugs.join('-')
                                                ] = el;
                                            }
                                        }}
                                        onClick={() => copyLink(q.slugs[0])}
                                    >
                                        {q.question}
                                        <FiLink
                                            size={20}
                                            className={styles.link_icon}
                                        />
                                    </div>
                                    {answerAsArray.map(
                                        (a: string | ReactNode) => (
                                            <div
                                                key={a?.toString() || ''}
                                                className={styles.answer}
                                            >
                                                {a}
                                            </div>
                                        ),
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
}
