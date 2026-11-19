import {
    AllVaultsServerIF,
    UserVaultsServerIF,
    VaultIF,
    VaultStrategy,
    VaultWithLiveTvlIF,
} from '../../../ambient-utils/types';

export class Vault implements VaultIF {
    id: string;
    createdAt: number;
    updatedAt: number;
    createdBy: string;
    updatedBy: string;
    protocol: string;
    feeRecipientAddress: string;
    chainId: string;
    address: `0x${string}`;
    strategy: VaultStrategy;
    token0Address: `0x${string}`;
    token1Address: `0x${string}`;
    token0Decimals: number;
    token1Decimals: number;
    vaultSymbol: string;
    vaultDecimals: number;
    vaultShow: boolean;
    mainAsset: `0x${string}`;
    aprUnitTokenAddress: string;
    aprShow: string;
    initTime: number;
    initBlockNumber: number;
    oracleAddress: string;
    oracleDecimals: number;
    oracleInitRate: string;
    aprUnitOracleAddress: string;
    aprUnitOracleDecimals: number;
    aprUnitOracleInitRate: string;
    poolFee: string;
    reverseChart: boolean;
    koSize: number;
    token0InitPriceUsd: string;
    token1InitPriceUsd: string;
    aprToken0: string;
    aprToken1: string;
    aprUnitTokenPriceUsd: string;
    aprRebaseUnitToken: string;
    // undefined while the on-chain TVL read is still in flight
    tvlUsd: string | undefined;
    apr: string;
    balance: string | undefined;
    balanceAmount: string | undefined;
    balanceUsd: string | undefined;
    constructor(
        v: VaultIF | AllVaultsServerIF | VaultWithLiveTvlIF,
        userVault: UserVaultsServerIF | null | undefined,
    ) {
        this.id = v.id;
        this.createdAt = v.createdAt;
        this.updatedAt = v.updatedAt;
        this.createdBy = v.createdBy;
        this.updatedBy = v.updatedBy;
        this.protocol = v.protocol;
        this.feeRecipientAddress = v.feeRecipientAddress;
        this.chainId = v.chainId;
        this.address = v.address;
        this.strategy = v.strategy;
        this.token0Address = v.token0Address;
        this.token1Address = v.token1Address;
        this.token0Decimals = v.token0Decimals;
        this.token1Decimals = v.token1Decimals;
        this.vaultSymbol = v.vaultSymbol;
        this.vaultDecimals = v.vaultDecimals;
        this.vaultShow = v.vaultShow;
        this.mainAsset = v.mainAsset;
        this.aprUnitTokenAddress = v.aprUnitTokenAddress;
        this.aprShow = v.aprShow;
        this.initTime = v.initTime;
        this.initBlockNumber = v.initBlockNumber;
        this.oracleAddress = v.oracleAddress;
        this.oracleDecimals = v.oracleDecimals;
        this.oracleInitRate = v.oracleInitRate;
        this.aprUnitOracleAddress = v.aprUnitOracleAddress;
        this.aprUnitOracleDecimals = v.aprUnitOracleDecimals;
        this.aprUnitOracleInitRate = v.aprUnitOracleInitRate;
        this.poolFee = v.poolFee;
        this.reverseChart = v.reverseChart;
        this.koSize = v.createdAt;
        this.token0InitPriceUsd = v.token0InitPriceUsd;
        this.token1InitPriceUsd = v.token1InitPriceUsd;
        this.aprToken0 = v.aprToken0;
        this.aprToken1 = v.aprToken1;
        this.aprUnitTokenPriceUsd = v.aprUnitTokenPriceUsd;
        this.aprRebaseUnitToken = v.aprRebaseUnitToken;
        this.tvlUsd = v.tvlUsd;
        this.apr = v.apr;

        type entryTuple = [string, string | undefined];

        const entries: entryTuple[] = Object.entries(v);
        const findVal = (
            k: 'balance' | 'balanceAmount' | 'balanceUsd',
        ): string | undefined => {
            const tuple: entryTuple | undefined = entries.find(
                (e) => e[0] === k,
            );
            let output: string | undefined;
            if (userVault) {
                output = userVault[k];
            } else if (tuple) {
                output = tuple[1];
            }
            return output;
        };

        this.balance = findVal('balance');
        this.balanceAmount = findVal('balanceAmount');
        this.balanceUsd = findVal('balanceUsd');
    }
}
