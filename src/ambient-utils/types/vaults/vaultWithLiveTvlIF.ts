import { AllVaultsServerIF } from './allVaultsServerIF';

/* A vault record whose `tvlUsd` the app reads from the chain rather than taking
 * from the vaults API, which serves a figure it can no longer recompute for any
 * vault whose Tempest oracle has stalled.
 *
 * `undefined` means that read has not resolved yet. It is deliberately distinct
 * from a vault that resolved to nothing: the API's figure is the value being
 * replaced, so showing it while the real one loads is what made stale TVL flash
 * on screen at page load. */
export interface VaultWithLiveTvlIF extends Omit<AllVaultsServerIF, 'tvlUsd'> {
    tvlUsd: string | undefined;
}
