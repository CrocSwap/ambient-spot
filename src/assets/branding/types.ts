import { chainHexIds } from '../../ambient-utils/types';
import { skins } from '../../App/hooks/useSkin';

export interface heroItem {
    content: string;
    processAs: 'text' | 'image' | 'separator';
}

export type fontSets = 'ambient';

export type networkPrefs = Partial<
    Record<
        chainHexIds,
        {
            color: skins[];
            premiumColor: skins[];
            cobrandingLogo?: string;
        }
    >
>;

export interface brandIF {
    networks: networkPrefs;
    fontSet: fontSets;
    platformName: string;
    showPoints: boolean;
    showDexStats: boolean;
    headerImage: string;
    includeCanto: boolean;
    cobrandingLogo?: string;
}
