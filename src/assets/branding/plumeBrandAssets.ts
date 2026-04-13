import plumeLogo from '../../assets/images/logos/plume_brand_logo.svg';
import large from '../images/logos/ambient_logo_large.svg';
import { brandIF } from './types';

export const plumeBrandAssets: brandIF = {
    networks: {
        '0x18232': {
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: plumeLogo,
        },
    },
    platformName: 'plume',
    fontSet: 'ambient',
    showPoints: false,
    showDexStats: true,
    headerImage: large as string,
    includeCanto: false,
};
