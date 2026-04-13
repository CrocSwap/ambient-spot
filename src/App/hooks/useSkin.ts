// import{ useEffect, useMemo, useState } from 'react';
// import{ chainHexIds } from '../../ambient-utils/types';
// import{ chainColorScheme } from '../../assets/branding/types';
// import{ IS_LOCAL_ENV } from '../../ambient-utils/constants';

// !important:  please do not delete anything in this file, I've disabled
// !important:  ... it temporarily until I have time to track preferences
// !important:  ... across multiple deployments to the same URL as local
// !important:  ... storage is specific to a single URL domain

export type skins = 'purple_dark' | 'purple_light';

// export interface skinMethodsIF {
//     active: skins;
//     changeTo: (s: skins) => void;
// }

// export const useSkin = (
//     colorDefaults: chainColorScheme,
//     chainId: chainHexIds,
// ): skinMethodsIF => {
//     const LS_KEY = 'skin';

//     // fn to get current data object from local storage
//     function getFromLS(): Partial<chainColorScheme> | undefined {
//         // const fallback: chainColorScheme = colorDefaults;
//         const entry: string | null = localStorage.getItem(LS_KEY);
//         // process data retrieved from local storage
//         if (entry) {
//             try {
//                 // parse data from local storage and assign to output variable
//                 return JSON.parse(entry);
//             } catch {
//                 // clear data from local storage and warn user if unable to parse
//                 // assign `null` value to output variable
//                 IS_LOCAL_ENV &&
//                     console.debug(
//                         'localStorage token lists corrupt, clearing data for',
//                         LS_KEY,
//                     );
//                 localStorage.setItem(LS_KEY, JSON.stringify(colorDefaults));
//             }
//         }
//     }

//     // fn to sync current color setting into local storage
//     function updateLS(): void {
//         const persisted = getFromLS() ?? colorDefaults;
//         if (skin) persisted[chainId] = skin;
//         localStorage.setItem(LS_KEY, JSON.stringify(persisted));
//     }

//     // // fn to check for a color preference persisted in local storage
//     // function getColorScheme(chn: chainHexIds): skins | undefined {
//     //     const persisted: Partial<chainColorScheme> | undefined = getFromLS();
//     //     if (persisted && persisted[chn]) {
//     //         return persisted[chn];
//     //     }
//     // }

//     // name of the current skin in use by the app
//     // defaults to value in local storage, uses value from params as fallback
//     const [skin, setSkin] = useState<skins>(
//         // getColorScheme(chainId) ??
//         colorDefaults[chainId],
//     );

//     // hook to hold a single color set for the app to return
//     // updates local storage when needed as an accessory function
//     useEffect(() => {
//         updateLS();
//     }, [skin]);

//     return useMemo(
//         () => ({
//             active: skin,
//             changeTo: (s: skins) => setSkin(s),
//         }),
//         [skin],
//     );
// };
