/* eslint-disable @typescript-eslint/no-explicit-any  */
import { ChainSpec, CrocEnv } from '@crocswap-libs/sdk';
import { Chain } from '@reown/appkit/networks';
import { Provider, Signer } from 'ethers';
import { TopPool } from '../constants/networks/TopPool';
import { TokenIF } from './token/TokenIF';
import { GcgoProvider } from '../../utils/gcgoProvider';

export interface ChainSpecForWeb3Modal {
    chainId: number;
    name: string;
    currency: string;
    rpcUrl: string;
    explorerUrl: string;
}

export interface NetworkIF {
    chainId: string;
    gcgo: GcgoProvider;
    GCGO_URLS: string[];
    chainSpecForAppKit: Chain;
    evmRpcUrls: string[];
    poolIndex: number;
    gridSize: number;
    isTestnet: boolean;
    defaultPair: TokenIF[];
    topPools: TopPool[];
    priorityPool?: [TokenIF, TokenIF];
    blockExplorer: string;
    displayName: string;
    tokenPriceQueryAssetPlatform: string | undefined;
    vaultsEnabled: boolean;
    tempestApiNetworkName: string;
    chainSpec: ChainSpec;
    getGasPriceInGwei: (provider?: Provider) => Promise<number | undefined>;
    fastLaneProtectionEnabled: boolean;
    indexerTimeout?: number;
}

export interface NetworkSessionIF {
    tokenUniv: TokenIF[];
    infuraUrl: string;
    provider: Provider;
    chainId: string;
    signer?: Signer;
    gcUrl: string;
    crocEnv: CrocEnv;
}

export interface NetworkUserSessionIF {
    networkSession: NetworkSessionIF;
    userAddress: string;
}
