import monadLogo from '../../assets/images/logos/monad_full_logo.svg';
import large from '../images/logos/ambient_logo_large.svg';
import { brandIF } from './types';

export const monadTestnetBrandAssets: brandIF = {
    networks: {
        // monad testnet
        '0x279f': {
            // first value in array is default color scheme
            color: ['purple_dark', 'purple_light'],
            premiumColor: [],
            cobrandingLogo: monadLogo,
        },
    },
    platformName: 'monadTestnet',
    fontSet: 'ambient',
    showPoints: false,
    showDexStats: true,
    headerImage: large as string,
    includeCanto: false,
};
