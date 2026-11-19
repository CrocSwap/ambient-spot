import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { tokenListURIs, ZERO_ADDRESS } from '../../ambient-utils/constants';
import {
    isETHorStakedEthToken,
    isPriorityEthEquivalent,
    isPriorityUsdEquivalent,
    isUsdcToken,
    isUSDQtoken,
    isUsdStableToken,
    removeWrappedNative,
} from '../../ambient-utils/dataLayer';
import { TokenIF } from '../../ambient-utils/types';
import { tokenMethodsIF } from './useTokens';

export const useTokenSearch = (
    chainId: string,
    tokens: tokenMethodsIF,
    walletTokens: TokenIF[],
    getRecentTokens: () => TokenIF[],
): [TokenIF[], string, Dispatch<SetStateAction<string>>, string, string] => {
    // TODO: debounce this input later
    // TODO: figure out if we need to update EVERYTHING to the debounced value
    // raw input from the user
    const [input, setInput] = useState<string>('');

    // search type ➜ '' or 'address' or 'nameOrAddress'
    const [searchAs, setSearchAs] = useState<string>('');

    // cleaned and validated version of raw user input
    const validatedInput = useMemo<string>(() => {
        // trim string and make it lower case
        const cleanInput = input.trim().toLowerCase();
        // action if input appears to be a contract address
        if (
            cleanInput.length === 42 ||
            (cleanInput.length === 40 && !cleanInput.startsWith('0x'))
        ) {
            setSearchAs('address');
            // if not an apparent token address, search name and symbol
            // if not an apparent token address, search name and symbol
        } else if (cleanInput.length) {
            setSearchAs('nameOrSymbol');
            return cleanInput;
            // otherwise treat as if there is no input entered
            // otherwise treat as if there is no input entered
        } else {
            setSearchAs('');
            return '';
        }
        // add '0x' to the front of the cleaned string if not present
        const fixedInput = cleanInput.startsWith('0x')
            ? cleanInput
            : '0x' + cleanInput;
        // declare an output variable
        let output = cleanInput;
        // check if string is a correctly-formed contract address
        if (
            // check if string has 42 characters
            fixedInput.length === 42 &&
            // check if string after '0x' is valid hexadecimal
            fixedInput.substring(2).match(/[0-9a-f]/g)
        ) {
            // if fixed string is valid, assign it to the output variable
            output = fixedInput;
        }
        // return output variable
        return output;
    }, [input]);

    // hook to track tokens to output and render in DOM
    const [outputTokens, setOutputTokens] = useState<TokenIF[]>([]);

    // list of addresses of tokens in connected wallet
    const walletTknAddresses = useMemo<string[]>(
        () => walletTokens.map((wTkn: TokenIF) => wTkn.address.toLowerCase()),
        [walletTokens.length],
    );

    // hook to update the value of outputTokens based on user input
    useEffect(() => {
        // fn to run a token search by contract address
        function searchAsAddress(): TokenIF[] {
            // determined whether a known token exists for user input as an address
            // this check is run against tokens listed in `allTokenLists`
            const tokenLookup: TokenIF | undefined =
                tokens.getTokenByAddress(validatedInput);
            return tokenLookup ? [tokenLookup] : [];
        }

        // fn to run a token search by name or symbol
        function searchAsNameOrSymbol(): TokenIF[] {
            // check tokens in `allTokenLists` for tokens that match validated input
            const foundTokens: TokenIF[] = tokens.getTokensByNameOrSymbol(
                validatedInput,
                chainId,
            );
            // return tokens with wrapped native from current chain removed
            return removeWrappedNative(chainId, foundTokens);
        }

        // fn to run if the app does not recognize input as an address or name or symbol
        function noSearch(): TokenIF[] {
            // fn to concatenate two token arrays with duplicate values removed
            const patchLists = (
                listA: TokenIF[],
                listB: TokenIF[],
                listC?: TokenIF[],
            ): TokenIF[] => {
                const addressesListA = listA.map((tkn: TokenIF) =>
                    tkn.address.toLowerCase(),
                );
                const dedupedListB: TokenIF[] = listB.filter(
                    (tkn: TokenIF) =>
                        !addressesListA.includes(tkn.address.toLowerCase()),
                );
                const combinedAandB = listA.concat(dedupedListB);
                const addressesListAandB = combinedAandB.map((tkn: TokenIF) =>
                    tkn.address.toLowerCase(),
                );
                const dedupedListC: TokenIF[] | undefined = listC
                    ? listC.filter(
                          (tkn: TokenIF) =>
                              !addressesListAandB.includes(
                                  tkn.address.toLowerCase(),
                              ),
                      )
                    : undefined;

                return dedupedListC
                    ? combinedAandB.concat(dedupedListC)
                    : combinedAandB;
            };
            // array of ambient and uniswap tokens, no dupes
            const baseTokenList: TokenIF[] =
                chainId === '0x1' // ethereum mainnet
                    ? patchLists(
                          tokens.getTokensFromList(tokenListURIs.ambient),
                          tokens.getTokensFromList(
                              tokenListURIs.ethereumCoingecko,
                          ),
                      )
                    : chainId === '0x82750' // scroll mainnet
                      ? patchLists(
                            tokens.getTokensFromList(tokenListURIs.ambient),
                            // tokens.getTokensFromList(tokenListURIs.scrollTech),
                            tokens.getTokensFromList(
                                tokenListURIs.scrollCoingecko,
                            ),
                        )
                      : chainId === '0x18232' // plume mainnet
                        ? patchLists(
                              tokens.getTokensFromList(tokenListURIs.ambient),
                              tokens.getTokensFromList(
                                  tokenListURIs.plumeNetwork,
                              ),
                          )
                        : patchLists(
                              tokens.getTokensFromList(tokenListURIs.ambient),
                              tokens.getTokensFromList(tokenListURIs.testnet),
                          );

            // ERC-20 tokens from connected wallet subject to universe verification
            const verifiedWalletTokens: TokenIF[] = walletTokens.filter(
                (tkn: TokenIF) => tokens.verify(tkn.address),
            );
            // array with tokens added to user's wallet (subject to verification)
            const withWalletTokens: TokenIF[] = patchLists(
                baseTokenList,
                verifiedWalletTokens,
            );
            // remove the wrapped native token (if present)
            const tknsNoWrappedNative = removeWrappedNative(
                chainId,
                withWalletTokens,
            );
            // combine the token lists
            // console.log({ tknsNoWrappedNative });
            return tknsNoWrappedNative;
        }

        // declare an output variable
        let foundTokens: TokenIF[];
        // logic router to assign search results to output based on input type
        switch (searchAs) {
            case 'address':
                foundTokens = searchAsAddress();
                break;
            case 'nameOrSymbol':
                foundTokens = searchAsNameOrSymbol();
                break;
            default:
                foundTokens = noSearch();
        }
        // sort to list tokens higher which are recognized by more authorities
        // keep tokens listed by Ambient at the top
        const sortedTokens: TokenIF[] = foundTokens
            .sort((a: TokenIF, b: TokenIF) => {
                // output value
                let rank: number;
                // decision tree to determine sort order
                // sort ambient-listed token higher if only one is listed by us
                // otherwise sort by number of lists featuring the token overall
                if (isOnAmbientList(a) && isOnAmbientList(b)) {
                    rank = comparePopularity();
                } else if (isOnAmbientList(a)) {
                    rank = -1;
                } else if (isOnAmbientList(b)) {
                    rank = 1;
                } else {
                    rank = comparePopularity();
                }
                // fn to determine if a given token is on the ambient list
                function isOnAmbientList(t: TokenIF): boolean {
                    return !!t.listedBy?.includes(tokenListURIs.ambient);
                }
                // fn to determine which of the two tokens is more popular
                function comparePopularity(): number {
                    const getPopularity = (tkn: TokenIF): number =>
                        tkn.listedBy?.length ?? 1;
                    return getPopularity(b) - getPopularity(a);
                }
                // return the output variable
                return rank;
            })
            // promote privileged tokens to the top of the list
            .sort((a: TokenIF, b: TokenIF) => {
                // fn to numerically prioritize a token (high = important)
                const getPriority = (tkn: TokenIF): number => {
                    const tknAddress: string = tkn.address.toLowerCase();
                    // declare an output variable
                    let priority: number;
                    // canonical token addresses to assign probability
                    if (tknAddress === ZERO_ADDRESS) {
                        priority = 100;
                    } else if (isPriorityUsdEquivalent(tknAddress)) {
                        priority = 97;
                    } else if (isUsdcToken(tknAddress)) {
                        priority = 96;
                    } else if (isPriorityEthEquivalent(tknAddress)) {
                        priority = 90;
                    } else if (isUsdStableToken(tknAddress)) {
                        priority = 89;
                    } else if (isETHorStakedEthToken(tknAddress, chainId)) {
                        priority = 89;
                    } else if (isUSDQtoken(tknAddress)) {
                        priority = 83;
                    } else if (
                        walletTknAddresses.includes(tkn.address.toLowerCase())
                    ) {
                        priority = 80;
                    } else if (tkn.listedBy) {
                        priority = tkn.listedBy.length;
                    } else {
                        priority = 0;
                    }
                    // return numerical priority of the token
                    return priority;
                };
                // token priority values (numeric)
                const priorityTknA: number = getPriority(a);
                const priorityTknB: number = getPriority(b);
                const priority123ABC: number = b.name < a.name ? 1 : -1;
                // sort tokens by relative priority level
                return priorityTknB - priorityTknA || priority123ABC;
            });
        setOutputTokens(sortedTokens);
        // run hook every time the validated input from the user changes
        // will ignore changes that do not pass validation (eg adding whitespace)
    }, [
        chainId,
        tokens.tokenUniv,
        walletTknAddresses,
        getRecentTokens().length,
        validatedInput,
    ]);

    // outputTokens ➜ tokens to display in DOM
    // validatedInput ➜ user input after validation mods
    // setInput ➜ function to update raw user input from the DOM
    // searchAs ➜ type of search the app is running
    return [outputTokens, validatedInput, setInput, searchAs, input];
};
