import { VaultWithLiveTvlIF } from './vaultWithLiveTvlIF';

/* Extends the live-TVL record rather than the raw server one: by the time a
 * vault reaches the UI its `tvlUsd` comes from the chain, so it can still be
 * pending. */
export interface VaultIF extends VaultWithLiveTvlIF {
    balance: string | undefined;
    balanceAmount: string | undefined;
    balanceUsd: string | undefined;
}
