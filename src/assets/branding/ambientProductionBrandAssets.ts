import blastLogo from '../../assets/images/logos/blast_logo.svg';
import monadLogo from '../../assets/images/logos/monad_full_logo.svg';
import plumeLogo from '../../assets/images/logos/plume_brand_logo.svg';
import scrollLogo from '../../assets/images/logos/scroll_brand_logo.svg';
import swellLogo from '../../assets/images/logos/swell_dark_theme_logo.svg';
import large from '../images/logos/ambient_logo_large.svg';
import { brandIF } from './types';

export const ambientProductionBrandAssets: brandIF = {
    networks: {
        // ethereum mainnet
        '0x1': {
            // first value in array is default color scheme
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
        },
        // swell mainnet
        '0x783': {
            // first value in array is default color scheme
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: swellLogo,
        },
        // plume mainnet
        '0x18232': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: plumeLogo,
        },
        // scroll mainnet
        '0x82750': {
            // first value in array is default color scheme
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: scrollLogo,
        },
        // blast mainnet
        '0x13e31': {
            // first value in array is default color scheme
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: blastLogo,
        },
        // monad testnet
        // '0x279f': {
        //     color: ['purple_dark', 'purple_light'],
        //     premiumColor: [],
        //     cobrandingLogo: monadLogo,
        // },
    },
    platformName: 'ambient',
    fontSet: 'ambient',
    showPoints: false,
    showDexStats: true,
    headerImage: large as string,
    includeCanto: true,
};
