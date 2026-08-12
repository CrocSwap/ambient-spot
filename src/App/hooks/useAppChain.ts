import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    baseSepolia,
    blastMainnet,
    blastSepolia,
    ethereumMainnet,
    ethereumSepolia,
    monadTestnet,
    plumeLegacy,
    plumeMainnet,
    scrollMainnet,
    scrollSepolia,
    supportedNetworks,
} from '../../ambient-utils/constants';
import {
    chainNumToString,
    checkEoaHexAddress,
    getDefaultChainId,
    lookupChainId,
    validateChainId,
} from '../../ambient-utils/dataLayer';
import { NetworkIF } from '../../ambient-utils/types';
import { linkGenMethodsIF, useLinkGen } from '../../utils/hooks/useLinkGen';

export const useAppChain = (): {
    activeNetwork: NetworkIF;
    chooseNetwork: (network: NetworkIF) => void;
} => {
    // metadata on chain authenticated in connected wallet
    const { chainId, switchNetwork } = useAppKitNetwork();
    const { isConnected } = useAppKitAccount();

    // hook to generate navigation actions with pre-loaded path
    const linkGenCurrent: linkGenMethodsIF = useLinkGen();
    const linkGenPool: linkGenMethodsIF = useLinkGen('pool');
    const linkGenSwap: linkGenMethodsIF = useLinkGen('swap');
    const [ignoreFirst, setIgnoreFirst] = useState<boolean>(true);

    const CHAIN_LS_KEY = 'CHAIN_ID';

    // fn to get a chain ID param from the current URL string
    // returns `undefined` if chain ID is not found or fails validation
    // due to where this code is instantiated we can't use param tools
    function getChainFromURL(): string | undefined {
        const { pathname } = window.location;
        let rawURL = pathname;
        let templateURL = '';
        if (rawURL.length && rawURL.includes('chain')) {
            while (!rawURL.startsWith('chain')) {
                rawURL = rawURL.substring(1);
            }
            rawURL = rawURL.substring(6);
            for (let i = 0; i < rawURL.length; i++) {
                const character: string = rawURL[i];
                if (character === '&') break;
                templateURL += character;
            }
        }
        let output: string | undefined =
            templateURL.length && lookupChainId(templateURL, 'string')
                ? lookupChainId(templateURL, 'string')
                : undefined;
        if (typeof output === 'string' && !validateChainId(output)) {
            output = undefined;
        }
        return output;
    }

    const isWalletConnectionUnfinished = useRef<boolean>(true);

    // fn to get a chain ID from the connected wallet
    // returns `null` if no wallet or if network fails validation
    function getChainFromWallet(): string | null {
        let output: string | null = null;
        if (chainId && isConnected) {
            const chainAsString: string =
                typeof chainId === 'string'
                    ? chainId
                    : chainNumToString(chainId);
            const isValid: boolean = validateChainId(chainAsString);
            if (isValid) output = chainAsString;
        } else {
            isWalletConnectionUnfinished.current = true;
        }
        return output;
    }

    // memoized and validated chain ID from the URL
    const chainInURLValidated: string | undefined = useMemo(
        () => getChainFromURL(),
        [window.location.pathname],
    );

    // memoized and validated chain ID from the connected wallet
    const chainInWalletValidated = useRef<string | null>(getChainFromWallet());

    // listen for the wallet to change in connected wallet and process that change in the app
    useEffect(() => {
        if (chainId) {
            // chain ID from wallet (current live value, not memoized in the app)
            const incomingChainFromWallet: string | null = getChainFromWallet();
            // if a wallet is connected, evaluate action to take
            // if none is connected, nullify memoized record of chain ID from wallet
            if (incomingChainFromWallet) {
                // check that the new incoming chain ID is supported by Ambient
                if (validateChainId(incomingChainFromWallet)) {
                    // if wallet chain is valid and does not match record in app, update
                    // without this gatekeeping the app refreshes itself endlessly
                    if (
                        chainInWalletValidated.current !==
                        incomingChainFromWallet
                    ) {
                        // update preserved chain ID in local storage
                        localStorage.setItem(
                            CHAIN_LS_KEY,
                            incomingChainFromWallet,
                        );
                        // determine if new chain ID from wallet matches URL
                        // if yes, no changes needed
                        // if no, navigate to index page
                        // first part seems unnecessary but appears to help stability
                        const { pathname } = window.location;

                        const isPathENS = pathname.slice(1)?.includes('.eth');
                        /*  check if path is 42 character hex string 
                            after removing the first character for /{hex} URLs 
                            or first 9 characters for /account/{hex} */
                        const isPathHexEoaAddress =
                            checkEoaHexAddress(pathname);
                        const isPathUserAddress =
                            isPathENS || isPathHexEoaAddress;

                        const isPathUserXpOrLeaderboard =
                            pathname.includes('/xp');
                        const isPathPointsTabOnAccount =
                            pathname.includes('/points');
                        const isPathOnAccount = pathname.includes('/account');
                        const isPathOnExplore = pathname.includes('/explore');
                        const isPathOnAuctions = pathname.includes('/auctions');

                        if (chainInURLValidated === incomingChainFromWallet) {
                            // generate params chain manually and navigate user
                            let templateURL = pathname;
                            while (templateURL.includes('/')) {
                                templateURL = templateURL.substring(1);
                            }
                            linkGenCurrent.navigate(templateURL);
                        } else {
                            if (
                                linkGenCurrent.currentPage === 'initpool' ||
                                linkGenCurrent.currentPage === 'reposition'
                            ) {
                                linkGenPool.navigate(
                                    `chain=${incomingChainFromWallet}`,
                                );
                            } else if (pathname.includes('chain')) {
                                if (!ignoreFirst) {
                                    linkGenCurrent.navigate(
                                        `chain=${incomingChainFromWallet}`,
                                    );
                                } else {
                                    setIgnoreFirst(false);
                                    if (chainInURLValidated && switchNetwork)
                                        switchNetwork(
                                            supportedNetworks[
                                                chainInURLValidated
                                            ].chainSpecForAppKit,
                                        );
                                    return;
                                }
                            } else if (
                                isPathUserAddress ||
                                isPathOnAccount ||
                                isPathPointsTabOnAccount ||
                                isPathOnAuctions ||
                                isPathUserXpOrLeaderboard ||
                                isPathOnExplore
                            ) {
                                // escape the `else` block at the end
                                null;
                            } else {
                                linkGenCurrent.navigate();
                            }
                        }
                        // wallet authenticated, different chain in active app
                        if (activeNetwork.chainId != incomingChainFromWallet) {
                            if (isWalletConnectionUnfinished.current) {
                                switchNetwork(
                                    supportedNetworks[activeNetwork.chainId]
                                        .chainSpecForAppKit,
                                );
                                isWalletConnectionUnfinished.current = false;
                            } else {
                                let nextNetwork: NetworkIF | undefined;
                                if (incomingChainFromWallet === '0x1') {
                                    nextNetwork = ethereumMainnet;
                                } else if (
                                    incomingChainFromWallet === '0x13e31'
                                ) {
                                    nextNetwork = blastMainnet;
                                } else if (
                                    incomingChainFromWallet === '0x18232'
                                ) {
                                    nextNetwork = plumeMainnet;
                                } else if (
                                    incomingChainFromWallet === '0x18231'
                                ) {
                                    nextNetwork = plumeLegacy;
                                } else if (
                                    incomingChainFromWallet === '0xaa36a7'
                                ) {
                                    nextNetwork = ethereumSepolia;
                                } else if (
                                    incomingChainFromWallet === '0xa0c71fd'
                                ) {
                                    nextNetwork = blastSepolia;
                                } else if (
                                    incomingChainFromWallet === '0x82750'
                                ) {
                                    nextNetwork = scrollMainnet;
                                } else if (
                                    incomingChainFromWallet === '0x8274f'
                                ) {
                                    nextNetwork = scrollSepolia;
                                } else if (
                                    incomingChainFromWallet === '0x279f'
                                ) {
                                    nextNetwork = monadTestnet;
                                } else if (
                                    incomingChainFromWallet === '0x14a34'
                                ) {
                                    nextNetwork = baseSepolia;
                                }
                                if (nextNetwork) {
                                    setActiveNetwork(nextNetwork);
                                } else {
                                    console.warn(
                                        'Chain ID from authenticated wallet not recognized. App will stay on the current chain. Current chain is: ',
                                        activeNetwork,
                                    );
                                }
                                // update state with new validated wallet network
                                chainInWalletValidated.current =
                                    incomingChainFromWallet;
                            }
                        } else {
                            setIgnoreFirst(false);
                        }
                    }
                }
            } else {
                // this should only ever be null
                chainInWalletValidated.current = incomingChainFromWallet;
            }
        }
    }, [chainId, chainInWalletValidated.current, isConnected]);

    const defaultChain = getDefaultChainId();

    // metadata about the active network in the app
    const [activeNetwork, setActiveNetwork] = useState<NetworkIF>(
        findNetworkData(
            chainInURLValidated
                ? chainInURLValidated
                : (localStorage.getItem(CHAIN_LS_KEY) ?? defaultChain),
        ) || findNetworkData(defaultChain),
    );

    function findNetworkData(chn: keyof typeof supportedNetworks): NetworkIF {
        const output = supportedNetworks[chn];
        return output;
    }
    // logic to update `activeNetwork` when the connected wallet changes networks
    // this doesn't kick in if the user does not have a connected wallet
    useEffect(() => {
        // see if there is a connected wallet with a valid network
        if (chainInWalletValidated.current) {
            // find network metaData for validated wallet
            const chainMetadata: NetworkIF =
                supportedNetworks[chainInWalletValidated.current];
            // if found, update local state with retrieved metadata
            chainMetadata && setActiveNetwork(chainMetadata);
        }
    }, [chainInWalletValidated.current !== null]);

    // fn to allow user to manually switch chains in the app because everything
    // ... else in this file responds to changes in the browser environment
    function chooseNetwork(network: NetworkIF): void {
        localStorage.setItem(CHAIN_LS_KEY, network.chainId);
        setActiveNetwork(network);

        const { pathname } = window.location;
        const isPathENS = pathname.slice(1)?.includes('.eth');
        const isPathHexEoaAddress = checkEoaHexAddress(pathname);
        const isPathUserAddress = isPathENS || isPathHexEoaAddress;
        const isPathUserXpOrLeaderboard = pathname.includes('/xp');
        const shouldStayOnCurrentExactPath =
            isPathUserAddress || isPathUserXpOrLeaderboard;

        if (
            linkGenCurrent.currentPage === 'initpool' ||
            linkGenCurrent.currentPage === 'reposition'
        ) {
            linkGenPool.navigate(`chain=${network.chainId}`);
        } else if (linkGenCurrent.currentPage === 'swap') {
            linkGenSwap.navigate(`chain=${network.chainId}`);
        } else if (pathname.includes('chain')) {
            linkGenCurrent.navigate(`chain=${network.chainId}`);
        } else if (shouldStayOnCurrentExactPath) {
            // do not navigate away from current path
        } else {
            linkGenCurrent.navigate();
        }
    }

    return {
        activeNetwork,
        chooseNetwork,
    };
};
