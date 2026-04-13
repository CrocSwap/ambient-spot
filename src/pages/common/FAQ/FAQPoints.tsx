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
        {
            question: 'How is Blast Gold distribution determined?',
            answer: (
                <>
                    <div style={{ margin: '1rem 0' }}>
                        Gold distribution is based on, in rough order of
                        descending importance:
                    </div>
                    <ol style={{ paddingLeft: '2rem' }}>
                        <li>market depth of liquidity positions</li>
                        <li>TVL of in-range liquidity positions</li>
                        <li>swap volume</li>
                        <li>
                            small non-linear rewards for trying different
                            actions
                        </li>
                    </ol>
                    <div style={{ margin: '1rem 0' }}>
                        The relative weight of these components may change from
                        distribution to distribution, but the overall approach
                        will remain constant.
                    </div>
                </>
            ),
            slugs: ['how-to-earn-blast-gold'],
        },
        {
            question:
                "What's the difference between Ambient Points and Blast Points?",
            answer: [
                "If you have liquidity positions in pools on Blast you'll earn Ambient Points, Blast Points (which are based on TVL), and Blast Gold. Be aware that Blast Points are distributed directly based on the criteria Blast provides us (TVL) while Blast Gold is optimized for ecosystem metrics.",
                "The criteria for Gold will not be exactly the same as criteria for Ambient Points; our goal is to align with Blast's objectives such that they continue to send Ambient large amounts of Gold and ultimately that Ambient users earn more Gold. Blast Gold will be heavily based on 2% market depth, so keep orders tight and in-range. Obviously, users on Scroll or Ethereum will not get Blast rewards, but we are hearing things about Scroll incentives coming soon.",
            ],
            slugs: ['ambi-points-vs-blast-points'],
        },
        {
            question: 'Why is Gold distributed like this?',
            answer: "It's important to understand that Blast Gold are not rewards that are arbitrarily determined by Ambient. These rewards come from the Blast ecosystem, and our ability to continue distributing high amounts of Gold rewards to users depends on how much we align with the Blast ecosystem objectives. As part of that we communicate with the Blast team to understand what their objectives are, and this in turn influences how we distribute Gold rewards.",
            slugs: ['why-do-we-distribute-blast-gold-like-this'],
        },
        {
            question: 'When was the snapshot taken?',
            answer: 'The snapshot for the first Gold distribution was taken shortly after Blast announced the Gold distribution. This was on the afternoon of Friday, March 22. Liquidity provided after this snapshot will still receive Gold, but will be based on the next Blast Gold distribution. We anticipate this to be released in 2-3 weeks. In general, we will follow this policy of distributing each Gold drop based on the retroactive activity since the previous Gold release.',
            slugs: ['when-are-snapshots-taken'],
        },
        {
            question: 'I got [some amount of] Blast Gold, is that good or bad?',
            answer: 'With the caveat that no one will know how much Blast rewards are worth until the airdrop, keep in mind that Gold and Points will each make up 50% of the total airdrop and so far there are on the order of 1000× more Blast Points than Blast Gold.',
            slugs: ['is-my-blast-gold-distribution-good'],
        },
        {
            question:
                'What does market depth mean and how can I optimize for it?',
            answer: 'Market depth means the amount of liquidity your LP position is providing within +/- 2% of the current pool price. For the same size LP position, the tighter the range the more market depth. A 10% wide range order provides approximately 10× more depth per dollar of capital. That being said, when your order goes out of range it is no longer providing any market depth, and therefore is not accumulating rewards. So the best tradeoff is based on market volatility and how frequently you can manage the position. We will likely soon be putting market depth information directly into the app to help users make better decisions.',
            slugs: ['what-is-market-depth'],
        },
        {
            question: 'How is Gold distributed between pools?',
            answer: [
                'The relative distribution of Gold between pools is based on a set of metrics to normalize relative pool size (i.e. a combination of volume, TVL, liquidity, and some measures to prevent manipulation of these metrics). We may boost certain pools to help bootstrap liquidity as we did with YES/ETH and ORBIT/ETH in the initial distribution. Those pools ended up receiving about 5× more rewards.',
                'While there are currently no announced Gold boosts, you can generally expect Gold rewards in alt pools to be higher to the extent that our altcoin liquidity is weak relative to ETH/USDB. For example, most alt pools ended up receiving 5-10× boosted rewards in the first epoch, even those outside the announced boosting.',
            ],
            slugs: ['how-is-gold-distributed-between-pools'],
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
