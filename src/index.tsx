import isValidProp from '@emotion/is-prop-valid';
import { init as initPlausible } from '@plausible-analytics/tracker';
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
    SHOULD_LOG_ANALYTICS,
    SPLIT_TEST_VERSION,
    supportedNetworks,
    WALLETCONNECT_PROJECT_ID,
} from './ambient-utils/constants';
import { getDefaultLanguage, getResolutionSegment } from './utils/analytics';
import packageJson from '../package.json';
// import baseLogo from './assets/images/networks/base_network_logo_with_margin.webp';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';

import { AppKitNetwork } from '@reown/appkit/networks';
import { createAppKit } from '@reown/appkit/react';
import baseSepoliaLogo from './assets/images/networks/base_sepolia.webp';
import blastLogo from './assets/images/networks/blast_logo.png';
import blastSepoliaLogo from './assets/images/networks/blast_sepolia.webp';
import ethLogo from './assets/images/networks/ethereum_logo.svg';
import sepoliaLogo from './assets/images/networks/ethereum_sepolia.webp';
import monadLogo from './assets/images/networks/monad_logo_small_with_margin.png';
import plumeLogo from './assets/images/networks/plume_mainnet_logo_small.webp';
import scrollLogo from './assets/images/networks/scroll_logo.webp';
import scrollSepoliaLogo from './assets/images/networks/scroll_sepolia.webp';
import swellLogo from './assets/images/networks/swell_logo.webp';
import swellSepoliaLogo from './assets/images/networks/swell_sepolia.webp';
import ErrorBoundary from './components/Error/ErrorBoundary';
import GlobalErrorFallback from './components/Error/GlobalErrorFallback';
import { GlobalContexts } from './contexts/GlobalContexts';

if (SHOULD_LOG_ANALYTICS) {
    const plausibleDomain =
        brand === 'ambientProduction'
            ? 'ambient.finance'
            : brand === 'ambientTestnet'
              ? 'testnet.ambient.finance'
              : brand === 'scroll'
                ? 'scroll.ambient.finance'
                : brand === 'swell'
                  ? 'swell.ambient.finance'
                  : brand === 'blast'
                    ? 'blast.ambient.finance'
                    : brand === 'plume'
                      ? 'plume.ambient.finance'
                      : 'ambient.finance';
    initPlausible({
        domain: plausibleDomain,
        endpoint: 'https://pls.embindexer.net/ev',
        captureOnLocalhost: false,
        outboundLinks: true,
        customProperties: {
            version: packageJson.version,
            splittestversion: SPLIT_TEST_VERSION,
            windowheight: getResolutionSegment(innerHeight),
            windowwidth: getResolutionSegment(innerWidth),
            defaultlanguage: getDefaultLanguage(),
            preferredlanguage: navigator.language,
        },
    });
}

const appKitNetworks = Object.values(supportedNetworks).map(
    ({ chainSpecForAppKit }) => {
        if (!chainSpecForAppKit) throw new Error('Missing chainSpecForAppKit.');
        return chainSpecForAppKit;
    },
) as [AppKitNetwork, ...AppKitNetwork[]];

const metadata = {
    name: 'Ambient Finance',
    description:
        'Swap cryptocurrencies like a pro with Ambient. Decentralized trading is now better than ever',
    url: 'https://ambient.finance', // origin must match your domain & subdomain
    icons: [
        'https://ambient.finance/icons/ambient_icon_x180.png',
        'https://ambient.finance/icons/ambient_icon_transparent_x16.png',
        'https://ambient.finance/icons/ambient_icon_transparent_x32.png',
    ],
};

let isBinance = false;

// 4. Create an AppKit instance
createAppKit({
    adapters: [new EthersAdapter()],
    defaultNetwork: appKitNetworks[0],
    networks: appKitNetworks,
    metadata,
    projectId: WALLETCONNECT_PROJECT_ID,
    features: {
        email: false,
        socials: false,
        // socials: ['google', 'x', 'github', 'discord', 'apple'],
        analytics: false,
        legalCheckbox: false,
        swaps: false,
        onramp: false,
        connectMethodsOrder: ['wallet'],
    },
    enableWalletGuide: false,
    chainImages: {
        1: ethLogo,
        81457: blastLogo,
        168587773: blastSepoliaLogo,
        534351: scrollSepoliaLogo,
        534352: scrollLogo,
        11155111: sepoliaLogo,
        98865: plumeLogo,
        98866: plumeLogo,
        1923: swellLogo,
        1924: swellSepoliaLogo,
        84532: baseSepoliaLogo,
        10143: monadLogo,
    },
    themeVariables: {
        '--w3m-color-mix': 'var(--dark2)',
        '--w3m-color-mix-strength': 10,
        '--w3m-font-family': 'var(--font-family)',
        '--w3m-accent': 'var(--accent1)',
    },
    featuredWalletIds: [
        'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
        'e7c4d26541a7fd84dbdfa9922d3ad21e936e13a7a0e44385d44f006139e44d3b', // WalletConnect
        isBinance
            ? '18388be9ac2d02726dbac9777c96efaac06d744b2f6d580fccdd4127a6d01fd1' // Rabby
            : '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4', // Binance
        '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    ],
    termsConditionsUrl: '/terms',
    privacyPolicyUrl: '/privacy',
});

try {
    if (window.ethereum) {
        isBinance = window.ethereum.isBinance as boolean;
    }
} catch (e) {
    console.error(e);
}

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
