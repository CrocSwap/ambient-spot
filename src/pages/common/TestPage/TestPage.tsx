import styles from './TestPage.module.css';
export default function TestPage() {
    // const [activeTab, setActiveTab] = useState(0);

    // const tabData = [
    //   { label: 'Trade', content: <div>Content for Trade</div> },
    //   { label: 'Explore', content: <div>Content for Explore</div> },
    //   { label: 'Account', content: <div>Content for Account</div> },
    //   { label: 'Chat', content: <div>Content for Chat</div> },
    // ];

    return (
        // <FlexContainer justifyContent='center' alignItems='center' style={{width: '100vw', height: '100vh'}}>

        //   <FadingTextGrid/>
        // </FlexContainer>

        // <FutaNewLanding />
        // <FutaLandingNav/>
        <div className={styles.container}>
            <div className={styles.topContainer}>
                <div className={styles.topLeftContainer}>
                    <span />
                    <span />
                </div>
                <div className={styles.topRightContainer} />
            </div>

            <div className={styles.bottomContainer}>
                <div className={styles.bottomLeftContainer}>
                    <span />
                    <span />
                </div>
                <div className={styles.bottomRightContainer}>
                    <span />
                    <span />
                </div>
            </div>
        </div>
    );
}
