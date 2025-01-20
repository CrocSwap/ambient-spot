import isValidProp from '@emotion/is-prop-valid';
import { createWeb3Modal, defaultConfig } from '@web3modal/ethers/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StyleSheetManager } from 'styled-components';
import App from './App/App';
import './i18n/config';
import './index.css';

import {
    brand,
    GLOBAL_MODAL_PORTAL_ID,
    LS_KEY_CHAIN_ID,
    supportedNetworks,
    WALLETCONNECT_PROJECT_ID,
} from './ambient-utils/constants';
import { getLocalStorageItem } from './ambient-utils/dataLayer';
// import baseLogo from './assets/images/networks/base_network_logo_with_margin.webp';
import baseSepoliaLogo from './assets/images/networks/base_sepolia.webp';
import blastLogo from './assets/images/networks/blast_logo.png';
import blastSepoliaLogo from './assets/images/networks/blast_sepolia.webp';
import ethLogo from './assets/images/networks/ethereum_logo.svg';
import sepoliaLogo from './assets/images/networks/ethereum_sepolia.webp';
import plumeLogo from './assets/images/networks/plume_mainnet_logo_small.webp';
import plumeSepoliaLogo from './assets/images/networks/plume_sepolia.webp';
import scrollLogo from './assets/images/networks/scroll_logo.webp';
import scrollSepoliaLogo from './assets/images/networks/scroll_sepolia.webp';
import swellLogo from './assets/images/networks/swell_logo.webp';
import swellSepoliaLogo from './assets/images/networks/swell_sepolia.webp';
import ErrorBoundary from './components/Error/ErrorBoundary';
import GlobalErrorFallback from './components/Error/GlobalErrorFallback';
import { GlobalContexts } from './contexts/GlobalContexts';

const metadata = {
    name: 'Ambient Finance',
    description:
        'Swap cryptocurrencies like a pro with Ambient. Decentralized trading is now better than ever',
    url: 'https://ambient.finance', // origin must match your domain & subdomain
    icons: [
        'https://ambient.finance/apple-touch-icon.png',
        'https://ambient.finance/favicon-32x32.png',
        'https://ambient.finance/favicon-16x16.png',
    ],
};

const defaultSupportedNetworkHexId = Object.keys(supportedNetworks)[0];

const defaultChainIdInteger = defaultSupportedNetworkHexId
    ? parseInt(defaultSupportedNetworkHexId)
    : 534352;

const ethersConfig = defaultConfig({
    metadata,
    defaultChainId: defaultChainIdInteger,
    enableEmail: false,
    rpcUrl: ' ',
    enableCoinbase: true,
});

const modal = createWeb3Modal({
    ethersConfig,
    chains: Object.values(supportedNetworks).map(
        (network) => network.chainSpecForWalletConnector,
    ),
    projectId: WALLETCONNECT_PROJECT_ID as string,
    chainImages: {
        1: ethLogo,
        81457: blastLogo,
        168587773: blastSepoliaLogo,
        534351: scrollSepoliaLogo,
        534352: scrollLogo,
        11155111: sepoliaLogo,
        98864: plumeSepoliaLogo,
        98865: plumeLogo,
        1923: swellLogo,
        1924: swellSepoliaLogo,
        84532: baseSepoliaLogo,
    },
    termsConditionsUrl: '/terms',
    privacyPolicyUrl: '/privacy',
    enableAnalytics: false,
    themeVariables: {
        '--w3m-color-mix': 'var(--dark2)',
        '--w3m-color-mix-strength': 10,
        '--w3m-font-family': 'var(--font-family)',
        '--w3m-accent': brand === 'futa' ? '#aacfd1' : 'var(--accent1)',
    },
    featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        'e7c4d26541a7fd84dbdfa9922d3ad21e936e13a7a0e44385d44f006139e44d3b', // WalletConnect
        '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4', // Binance
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    ],
});

modal.subscribeEvents(async (event) => {
    const networkIds = Object.values(supportedNetworks).map(
        (network) => network.chainSpecForWalletConnector.chainId,
    );

    if (event.data.event === 'CONNECT_SUCCESS') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const currentChainId = modal.getState().selectedNetworkId as number;

        const lastUsedNetworkIdString = getLocalStorageItem(
            LS_KEY_CHAIN_ID,
        ) as string;

        const desiredChainId = lastUsedNetworkIdString
            ? parseInt(lastUsedNetworkIdString)
            : defaultChainIdInteger;

        const currentNetworkIsSupported = networkIds.includes(
            modal.getState().selectedNetworkId as number,
        );

        // console.log({
        //     currentNetworkIsSupported,
        //     currentChainId,
        //     desiredChainId,
        //     lastUsedNetworkIdString,
        //     defaultChainIdInteger,
        //     connected: modal.getIsConnected(),
        // });
        if (currentChainId !== desiredChainId) {
            try {
                if (!currentNetworkIsSupported) return;
                await modal.switchNetwork(desiredChainId); // Pass the number directly

                // Wait for the switch to complete
                await new Promise((resolve) => setTimeout(resolve, 5000));

                const newChainId = modal.getState().selectedNetworkId as number;
                // console.log({
                //     newChainId,
                //     desiredChainId,
                //     state: modal.getState(),
                // });
                if (newChainId !== desiredChainId && modal.getState().open) {
                    //    console.log('returning')
                    return;
                } else if (
                    newChainId !== desiredChainId &&
                    !modal.getState().open
                ) {
                    try {
                        await modal.switchNetwork(desiredChainId);
                        await new Promise((resolve) =>
                            setTimeout(resolve, 1000),
                        );
                        const finalChainId = modal.getState()
                            .selectedNetworkId as number;
                        // console.log({ finalChainId, desiredChainId });
                        if (finalChainId !== desiredChainId) {
                            // console.log('disconnecting');
                            modal.disconnect();
                        }
                    } catch (retryError) {
                        // console.log('disconnecting');
                        modal.disconnect();
                    }
                } else if (
                    newChainId === desiredChainId &&
                    modal.getState().open &&
                    modal.getIsConnected()
                ) {
                    // console.log('closing modal');
                    modal.close();
                } else if (modal.getIsConnected()) {
                    // console.log('connected');
                }
            } catch (error) {
                // console.log('disconnecting');
                modal.disconnect();
            }
        } else if (
            currentChainId === desiredChainId &&
            modal.getState().open &&
            modal.getIsConnected()
        ) {
            // console.log('closing');
            modal.close();
        } else if (modal.getIsConnected()) {
            // console.log('connected');
        }
    }

    if (
        event.data.event === 'MODAL_CLOSE' &&
        event.data.properties.connected === true
    ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (
            !networkIds.includes(modal.getState().selectedNetworkId as number)
        ) {
            // console.log('disconnecting');
            modal.disconnect();
        }
    }
});

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement,
);

root.render(
    <React.StrictMode>
        <BrowserRouter>
            <GlobalContexts>
                <StyleSheetManager
                    shouldForwardProp={(propName) => isValidProp(propName)}
                >
                    <ErrorBoundary fallback={GlobalErrorFallback}>
                        <App />
                    </ErrorBoundary>
                </StyleSheetManager>

                <div id={GLOBAL_MODAL_PORTAL_ID} />
            </GlobalContexts>
        </BrowserRouter>
    </React.StrictMode>,
);
