import {
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { chainHexIds } from '../ambient-utils/types';
import { skins } from '../App/hooks/useSkin';
import {
    ambientProductionBrandAssets,
    ambientTestnetBrandAssets,
    baseSepoliaBrandAssets,
    blastBrandAssets,
    defaultBrandAssets,
    monadTestnetBrandAssets,
    plumeBrandAssets,
    scrollBrandAssets,
} from '../assets/branding';
import { brandIF, fontSets } from '../assets/branding/types';
import { AppStateContext } from './AppStateContext';
import { UserDataContext } from './UserDataContext';

const PREMIUM_THEMES_IN_ENV = {
    theme1: 'VITE_THEME_1_ACCOUNTS',
    theme2: 'VITE_THEME_2_ACCOUNTS',
};

type premiumThemes = keyof typeof PREMIUM_THEMES_IN_ENV;

export interface BrandContextIF {
    skin: {
        active: skins;
        available: skins[];
        set: (s: skins) => void;
    };
    fontSet: fontSets;
    colorAndFont: string;
    platformName: string;
    networks: chainHexIds[];
    headerImage: string;
    showPoints: boolean;
    showDexStats: boolean;
    premium: Record<premiumThemes, boolean>;
    includeCanto: boolean;
    cobrandingLogo: string | undefined;
}

export const BrandContext = createContext({} as BrandContextIF);

export const BrandContextProvider = (props: { children: ReactNode }) => {
    const { userAddress } = useContext(UserDataContext);
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);

    // brand asset set to consume as specified in environmental variable
    // can also provide a fallback if a custom brand is missing values

    const premiumAccess = useMemo<Map<premiumThemes, boolean>>(() => {
        const hasPremium = new Map<premiumThemes, boolean>();
        Object.entries(PREMIUM_THEMES_IN_ENV).forEach((themeMeta) => {
            const [themeName, envKey] = themeMeta;
            const raw: string | undefined = process.env[envKey];
            if (raw) {
                const addresses: string[] = raw.split(',');
                hasPremium.set(
                    themeName as premiumThemes,
                    userAddress ? addresses.includes(userAddress) : false,
                );
            }
        });
        return hasPremium;
    }, [userAddress]);

    // TODO: add error handling if dev puts a value in `.env` not matching defined cases
    const brand: string = import.meta.env.VITE_BRAND_ASSET_SET ?? '';
    const brandAssets = useMemo<brandIF>(() => {
        // make the linter happy for sample file
        switch (brand) {
            case 'blast':
                return blastBrandAssets;
            case 'plume':
                return plumeBrandAssets;
            case 'scroll':
                return scrollBrandAssets;
            case 'ambientProduction':
                return ambientProductionBrandAssets;
            case 'ambientTestnet':
                return ambientTestnetBrandAssets;
            case 'monadTestnet':
                return monadTestnetBrandAssets;
            case 'baseSepolia':
                return baseSepoliaBrandAssets;
            default:
                return defaultBrandAssets;
        }
    }, [brand]);

    // this is for testing premium-access features
    const emilyAddr = '0x8a8b00B332c5eD50466e31FCCdd4dc2170b4F78f';
    const benAddr = '0xE09de95d2A8A73aA4bFa6f118Cd1dcb3c64910Dc';
    const premiumTheme1: string[] = [
        emilyAddr.toLowerCase(),
        benAddr.toLowerCase(),
    ];

    const [skin, setSkin] = useState<skins>(getDefaultSkin());

    function getAvailableSkins(): skins[] {
        const networkSettings = brandAssets.networks[chainId as chainHexIds];
        const available: skins[] = networkSettings?.color ?? ['purple_dark'];
        const premium: skins[] = networkSettings?.premiumColor ?? [];
        const hasPremium = !!(
            userAddress && premiumTheme1.includes(userAddress.toLowerCase())
        );
        return hasPremium ? available : available.concat(premium);
    }

    function getDefaultSkin(): skins {
        const defaultSkin: skins[] = getAvailableSkins();
        return defaultSkin[0];
    }

    useEffect(() => {
        const availableSkins = getAvailableSkins();
        if (!availableSkins.includes(skin)) {
            setSkin(availableSkins[0]);
        }
    }, [chainId, userAddress, brandAssets.platformName, skin]);

    // data to be returned to the app
    const brandData: BrandContextIF = {
        skin: {
            active: skin,
            available: getAvailableSkins(),
            set: (s: skins) => setSkin(s),
        },
        fontSet: brandAssets.fontSet,
        colorAndFont: getDefaultSkin() + '+' + brandAssets.fontSet,
        platformName: brandAssets.platformName,
        networks: Object.keys(brandAssets.networks) as chainHexIds[],
        headerImage: brandAssets.headerImage,
        showPoints: brandAssets.showPoints,
        showDexStats: brandAssets.showDexStats,
        premium: {
            theme1: premiumAccess.get('theme1') as boolean,
            theme2: premiumAccess.get('theme2') as boolean,
        },
        includeCanto: false, // marking false for now, as canto appears to be defunct
        // includeCanto: brandAssets.includeCanto,
        cobrandingLogo:
            brandAssets.networks[chainId as chainHexIds]?.cobrandingLogo,
    };

    return (
        <BrandContext.Provider value={brandData}>
            {props.children}
        </BrandContext.Provider>
    );
};
