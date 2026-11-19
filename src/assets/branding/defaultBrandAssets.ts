import baseLogo from '../../assets/images/logos/Base_Wordmark_White.svg';
import plumeLogo from '../../assets/images/logos/plume_brand_logo.svg';
import scrollLogo from '../../assets/images/logos/scroll_brand_logo.svg';
import large from '../images/logos/ambient_logo_large.svg';
import { brandIF } from './types';

export const defaultBrandAssets: brandIF = {
    networks: {
        // ethereum mainnet
        '0x1': {
            // first value in array is default color scheme
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
        },
        // scroll mainnet
        '0x82750': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: scrollLogo,
        },
        // plume mainnet
        '0x18232': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: plumeLogo,
        },
        // plume legacy
        '0x18231': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: plumeLogo,
        },
        // ethereum sepolia
        '0xaa36a7': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
        },
        // base sepolia
        '0x14a34': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: baseLogo,
        },
    },
    platformName: 'ambient',
    fontSet: 'ambient',
    showPoints: false,
    showDexStats: true,
    headerImage: large as string,
    includeCanto: true,
};
