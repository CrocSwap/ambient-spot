import { useContext } from 'react';
import { motion } from 'framer-motion';
import { ChainDataContext } from '../../../contexts';
import {
    HomeContent,
    HomeTitle,
    StatCardContainer,
    StatContainer,
    StatValue,
} from '../../../styled/Components/Home';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';

interface StatCardProps {
    title: string;
    value: string | number;
}

function StatCard(props: StatCardProps) {
    const { title, value } = props;

    const ariaDescription = `${title} is ${value}`;
    return (
        <StatCardContainer
            flexDirection='column'
            justifyContent='center'
            gap={8}
            alignItems='center'
            background='dark2'
            aria-label={ariaDescription}
            tabIndex={0}
        >
            <HomeTitle style={{ fontWeight: '100' }}>{title}</HomeTitle>
            <StatValue
                fontWeight='300'
                fontSize='header2'
                color='text1'
                font='mono'
            >
                {value}
            </StatValue>
        </StatCardContainer>
    );
}

export default function Stats() {
    const { totalTvlString, totalVolumeString, totalFeesString } =
        useContext(ChainDataContext);

    const statCardData = [
        {
            title: 'Total Value Locked',
            value: totalTvlString ? totalTvlString : '…',
        },
        {
            title: 'Total Volume',
            value: totalVolumeString ? totalVolumeString : '…',
        },
        {
            title: 'Total Fees',
            value: totalFeesString ? totalFeesString : '…',
        },
    ];
    const showMobileVersion = useMediaQuery('(max-width: 600px)');

    const statsTitle = 'Ambient Finance Stats';

    const mobileWrapper = (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
            <HomeTitle aria-label={statsTitle} tabIndex={0}>
                {statsTitle}
            </HomeTitle>
            <HomeContent>
                {statCardData.map((card, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 * idx }}
                    >
                        <StatCard title={card.title} value={card.value} />
                    </motion.div>
                ))}
            </HomeContent>
        </motion.div>
    );
    const isHeightSmall = useMediaQuery('(max-height: 800px)');

    return (
        <StatContainer
            flexDirection='column'
            gap={isHeightSmall ? 8 : 16}
            padding={isHeightSmall ? '0' : '16px 0'}
        >
            {showMobileVersion ? (
                mobileWrapper
            ) : (
                <>
                    <HomeTitle aria-label={statsTitle} tabIndex={0}>
                        {statsTitle}
                    </HomeTitle>
                    <HomeContent>
                        {statCardData.map((card, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: 0.1 * idx }}
                            >
                                <StatCard
                                    title={card.title}
                                    value={card.value}
                                />
                            </motion.div>
                        ))}
                    </HomeContent>
                </>
            )}
        </StatContainer>
    );
}
