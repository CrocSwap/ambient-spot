import baseLogo from '../../assets/images/logos/Base_Wordmark_White.svg';
import blastLogo from '../../assets/images/logos/blast_logo.svg';
import monadLogo from '../../assets/images/logos/monad_full_logo.svg';
import swellLogo from '../../assets/images/logos/swell_dark_theme_logo.svg';
import large from '../images/logos/ambient_logo_large.svg';
import { brandIF } from './types';

export const ambientTestnetBrandAssets: brandIF = {
    networks: {
        // ethereum sepolia
        '0xaa36a7': {
            // first value in array is default color scheme
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
        },
        // monad testnet
        // '0x279f': {
        //     color: ['purple_dark', 'purple_light'],
        //     premiumColor: [],
        //     cobrandingLogo: monadLogo,
        // },
        // swell sepolia
        '0x784': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: swellLogo,
        },
        // base sepolia
        '0x14a34': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: baseLogo,
        },
        // blast sepolia
        '0xa0c71fd': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: blastLogo,
        },
    },
    platformName: 'ambient',
    fontSet: 'ambient',
    showPoints: false,
    showDexStats: true,
    headerImage: large as string,
    includeCanto: false,
};
