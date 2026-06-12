import styles from './TutorialHelpModalContents.module.css';

export const DefaultHelpModalAmbient = () => {
    const steps = [
        'Faster, Easier, and Cheaper',
        'Deep, Diversified Liquidity',
        'Bridge the Gap Between Trading and LPing',
        'Better than CEX',
    ];

    return (
        <>
            <div className={styles.tuto_content_wrapper}>
                <span>Zero-to-One Decentralized Trading Protocol</span>
                <span>
                    Ambient runs the entire DEX inside a single smart contract,
                    allowing for low-fee transactions, greater liquidity
                    rewards, and a fairer trading experience.
                </span>
                <div className={styles.tuto_content_text_steps}>
                    {steps.map((step, index) => (
                        <span key={index}>
                            {index + 1}. {step}
                        </span>
                    ))}
                </div>
                <span>
                    No devs needed. No presale jeeted. And everyone gets in at
                    the same price.
                </span>
                <span>Are you ready, anon?</span>
            </div>
        </>
    );
};

export const ChatHelpModal = () => {
    return <div>ChatHelpModal</div>;
};
