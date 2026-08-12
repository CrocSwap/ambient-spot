import { TEMPEST_VAULT_ABI } from '@crocswap-libs/sdk/dist/abis/external/TempestVaultAbi';
import { Contract, formatUnits, Provider } from 'ethers';
import { AllVaultsServerIF } from '../types';
import { TokenPriceFn } from './fetchTokenPrice';

/* @notice Reads a vault's current USD value directly from the chain.
 *
 * The vaults API derives `tvlUsd` by calling `totalAssets()` on the vault, and
 * `totalAssets()` prices both legs through a Tempest oracle. Once that oracle's
 * feed stops updating it reverts, so the API can no longer recompute those
 * vaults and keeps serving the last figure it managed to build. `getPositions()`
 * reports the same token amounts without consulting the oracle, so pricing them
 * against the app's own price source keeps TVL live regardless of the oracle. */
export async function fetchVaultTvlUsd(
    vault: AllVaultsServerIF,
    chainId: string,
    provider: Provider,
    cachedFetchTokenPrice: TokenPriceFn,
): Promise<number | undefined> {
    const vaultContract = new Contract(
        vault.address,
        TEMPEST_VAULT_ABI,
        provider,
    );

    const [amount0Invested, amount1Invested, amount0Idle, amount1Idle]: [
        bigint,
        bigint,
        bigint,
        bigint,
    ] = await vaultContract.getPositions();

    const [price0, price1] = await Promise.all([
        cachedFetchTokenPrice(vault.token0Address, chainId),
        cachedFetchTokenPrice(vault.token1Address, chainId),
    ]);

    // Without a price for both legs there is no honest total to show, so defer
    // to the caller rather than reporting a partial vault as its full value.
    if (price0?.usdPrice === undefined || price1?.usdPrice === undefined) {
        return undefined;
    }

    const qty0 = Number(
        formatUnits(amount0Invested + amount0Idle, vault.token0Decimals),
    );
    const qty1 = Number(
        formatUnits(amount1Invested + amount1Idle, vault.token1Decimals),
    );

    return qty0 * price0.usdPrice + qty1 * price1.usdPrice;
}
