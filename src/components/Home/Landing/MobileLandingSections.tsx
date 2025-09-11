import styles from './BackgroundImages.module.css';

import { motion, AnimatePresence } from 'framer-motion';
import liquidityImage from '../../../assets/images/home/liquidity.png';
import orderImage from '../../../assets/images/home/orders.png';
import Footer from '../../Footer/Footer';

import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandContext } from '../../../contexts/BrandContext';
import { ChainDataContext } from '../../../contexts/ChainDataContext';
import { FlexContainer, Text } from '../../../styled/Common';
import {
    MobileBg1,
    MobileBg2,
    MobileBg3,
    MobileBg4,
    MobileCard,
    MobileMainContainer,
    MobileMainLogo,
} from '../../../styled/Components/Home';
import Stats from '../Stats/AmbientStats';
import TopPools from '../TopPoolsHome/TopPoolsHome';
import Investors from './Investors';
import TradeNowButton from './TradeNowButton/TradeNowButton';

export default function MobileLandingSections() {
    const { isActiveNetworkL2 } = useContext(ChainDataContext);
    const { showPoints, cobrandingLogo, showDexStats } =
        useContext(BrandContext);

    const [isIPhone, setIsIPhone] = useState(false);
    useEffect(() => {
        const userAgent = window.navigator.userAgent;
        const isiPhone = /iPhone|iOS/i.test(userAgent);
        setIsIPhone(isiPhone);
        // reset the active tab to the default when returning to the home page
        localStorage.setItem('activeTradeTabOnMobile', 'Order');
    }, []);

    const heroSection = (
        <FlexContainer
            id='hero'
            flexDirection='column'
            alignItems='center'
            scrollSnapAlign='center'
            gap={16}
            padding='0 0 16px 0'
            fullHeight
        >
            <>
                {isActiveNetworkL2 ? (
                    <MobileMainLogo
                        justifyContent='center'
                        alignItems='center'
                        fullWidth
                        className={styles.home_wallpaper_mobile}
                    >
                        <FlexContainer
                            flexDirection={'column'}
                            alignItems='center'
                            gap={4}
                        >
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 0.5 }}
                            >
                                <p
                                    className={styles.ambient_blast_logo}
                                    style={{ fontSize: '30px' }}
                                >
                                    ambient
                                </p>
                            </motion.div>
                            <Text
                                fontWeight='100'
                                color='text1'
                                align='center'
                                style={{
                                    fontSize: '20px',
                                }}
                            >
                                X
                            </Text>
                            <img
                                src={cobrandingLogo}
                                alt=''
                                width='140px'
                                height='55px'
                            />
                        </FlexContainer>
                    </MobileMainLogo>
                ) : (
                    <MobileMainLogo
                        justifyContent='center'
                        alignItems='center'
                        fullWidth
                        className={styles.home_wallpaper_mobile}
                    >
                        <FlexContainer
                            flexDirection={'column'}
                            alignItems='center'
                            gap={4}
                        >
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 0.5 }}
                            >
                                <p
                                    className={styles.ambient_blast_logo}
                                    style={{ fontSize: '50px' }}
                                >
                                    ambient
                                </p>
                            </motion.div>
                        </FlexContainer>
                    </MobileMainLogo>
                )}

                {showPoints && (
                    <FlexContainer
                        justifyContent='center'
                        alignItems='center'
                        gap={8}
                    >
                        <Text fontSize='body' style={{ marginTop: '2.5px' }}>
                            Points system now live!{' '}
                        </Text>
                        <Link to='/xp-leaderboard'>
                            <Text
                                fontSize='body'
                                color='accent1'
                                style={{ textDecoration: 'underline' }}
                            >
                                View Leaderboard
                            </Text>
                        </Link>
                    </FlexContainer>
                )}

                <div style={{ padding: '20px' }}>
                    <TopPools noTitle gap='8px' />
                </div>
            </>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.9 }}
            >
                <TradeNowButton fieldId='trade_now_btn_in_mobile_hero' />
            </motion.div>
            <TradeNowButton fieldId='trade_now_btn_in_mobile_hero' />
        </FlexContainer>
    );

    const statsSection = showDexStats ? (
        <MobileCard
            flexDirection='column'
            fullWidth
            id='toppools'
            scrollSnapAlign='center'
        >
            <MobileBg4 className={styles.home4} />
            <Stats />
        </MobileCard>
    ) : null;

    const secondRow = (
        <MobileCard
            flexDirection='column'
            id='zerotoone'
            scrollSnapAlign='center'
        >
            <MobileBg1 className={styles.home2} />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <h1 tabIndex={0}>Zero-to-One Decentralized Trading Protocol</h1>
                <Text
                    tabIndex={0}
                    color='text2'
                    style={{ fontSize: '20px', lineHeight: '30px' }}
                >
                    Faster, Easier, and Cheaper
                </Text>
                <Text color='text2' fontWeight='100' tabIndex={0}>
                    Ambient runs the entire DEX inside a single smart contract,
                    allowing for low-fee transactions, greater liquidity
                    rewards, and a fairer trading experience.
                </Text>
            </motion.div>
        </MobileCard>
    );

    const thirdRow = (
        <MobileCard
            flexDirection='column'
            position='relative'
            id='deep'
            scrollSnapAlign='center'
        >
            <MobileBg2 className={styles.home2} />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <img
                    src={liquidityImage}
                    alt='concentrated and ambient liquidity'
                    width='260px'
                />
                <Text
                    tabIndex={0}
                    style={{ fontSize: '20px', lineHeight: '30px' }}
                >
                    Deep, Diversified Liquidity
                </Text>
                <Text color='text2' fontWeight='100' tabIndex={0}>
                    Ambient is built for diversified, sustainable liquidity that
                    fixes the broken LP economics of AMMs. It is also the only
                    DEX to support concentrated (‘V3’), ambient (‘V2’) and
                    knock-out liquidity in the same liquidity pool.
                </Text>
            </motion.div>
        </MobileCard>
    );

    const fourthRow = (
        <MobileCard
            flexDirection='column'
            position='relative'
            id='limitorders'
            scrollSnapAlign='center'
        >
            <MobileBg3 className={styles.home3} />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <img
                    src={orderImage}
                    alt='range and limit orders'
                    width='200px'
                />

                <Text
                    style={{ fontSize: '20px', lineHeight: '30px' }}
                    tabIndex={0}
                >
                    Bridge the Gap Between Trading and LP'ing
                </Text>
                <Text tabIndex={0} color='text2' fontWeight='100'>
                    Make your LP position a trading position – and vice versa –
                    using our range and limit orders.
                </Text>
                <Text tabIndex={0} color='text2' fontWeight='100'>
                    Ambient combines liquidity in a single pool, allowing for
                    greater rewards for liquidity providers, and less impact for
                    traders.
                </Text>
            </motion.div>
        </MobileCard>
    );

    const fifthRow = (
        <MobileCard
            flexDirection='column'
            position='relative'
            id='beeterthandex'
            scrollSnapAlign='center'
        >
            <MobileBg4 className={styles.home4} />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <Text
                    style={{ fontSize: '20px', lineHeight: '30px' }}
                    tabIndex={0}
                >
                    Better than CEX
                </Text>
                <Text tabIndex={0} color='text2' fontWeight='100'>
                    Built for traders and market makers of all kinds, Ambient
                    introduces novel DeFi-native features and an array of
                    quality-of-life improvements allowing for a best-in-class
                    user experience.
                </Text>
            </motion.div>
        </MobileCard>
    );

    const investorsSections = (
        <MobileCard
            flexDirection='column'
            position='relative'
            id='investors'
            scrollSnapAlign='center'
            style={{ paddingTop: '56px' }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <Text
                    color='text1'
                    fontWeight='400'
                    style={{ fontSize: '20px', lineHeight: '30px' }}
                    tabIndex={0}
                >
                    Investors
                </Text>
                <Investors />
            </motion.div>
        </MobileCard>
    );

    const footerSection = (
        <MobileCard
            flexDirection='column'
            fullWidth
            fullHeight
            scrollSnapAlign='center'
            background='dark1'
            id='footer'
        >
            <div className={styles.bg_footer} />
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
            >
                <Footer />
            </motion.div>
        </MobileCard>
    );

    return (
        <MobileMainContainer isIPhone={isIPhone} id='MainContainer'>
            {heroSection}
            {statsSection}
            {secondRow}
            {thirdRow}
            {fourthRow}
            {fifthRow}
            {investorsSections}
            {footerSection}
        </MobileMainContainer>
    );
}
