import { useContext } from 'react';
import Hero from '../../../components/Home/Landing/Hero';
import LandingSections from '../../../components/Home/Landing/LandingSections';
import MobileLandingSections from '../../../components/Home/Landing/MobileLandingSections';
import Stats from '../../../components/Home/Stats/AmbientStats';
import TopPoolsHome from '../../../components/Home/TopPoolsHome/TopPoolsHome';
import { BrandContext } from '../../../contexts/BrandContext';
import { useMediaQuery } from '../../../utils/hooks/useMediaQuery';

export default function Home() {
    const showMobileVersion = useMediaQuery('(max-width: 600px)');
    // hook from web3modal to switch connected wallet in extension
    // hook from web3modal indicating if user is connected
    // hook to consume and alter search params on the index page

    const { showDexStats } = useContext(BrandContext);

    if (showMobileVersion) return <MobileLandingSections />;
    return (
        <section data-testid={'home'}>
            <div style={{ width: '100%', height: '480px' }}>
                <Hero />
            </div>
            <div>
                <TopPoolsHome />
                {showDexStats && <Stats />}
            </div>
            <LandingSections />
        </section>
    );
}
