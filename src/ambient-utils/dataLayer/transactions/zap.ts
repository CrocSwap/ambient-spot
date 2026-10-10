import {
    concDepositBalance,
    CrocEnv,
    fromDisplayQty,
    tickToPrice,
    toDisplayQty,
} from '@crocswap-libs/sdk';

// Default over-swap buffer (percent) so the minted counterpart side is fully
// covered despite swap fee/price impact; any excess returns as dust. Exported
// so the pre-flight display estimate can apply the same buffer and stay in
// sync with what the transaction actually does.
export const ZAP_BUFFER_PERCENT = 0.5;

export interface ZapSplitParams {
    crocEnv: CrocEnv;
    // the two pool tokens, in any order, used to resolve base/quote
    tokenA: string;
    tokenB: string;
    // the single token the user deposits and its display-unit quantity
    inputTokenAddress: string;
    inputTokenQty: string;
    isAmbient: boolean;
    tick: { low: number; high: number };
    // extra fraction to over-swap so the minted counterpart side is fully
    // covered (percent, e.g. 0.5 = 0.5%). Leftover counterpart returns as dust.
    bufferPercent?: number;
}

export interface ZapSplit {
    // display-unit amount of the input token to swap into the counterpart
    swapQty: string;
    // display-unit amount of the input token to keep and mint as the primary
    mintPrimaryQty: string;
    // the counterpart pool token the swap buys
    counterpartAddress: string;
    inputIsBase: boolean;
}

/**
 * Computes how to split a single-token ("zap") deposit into a swap + a
 * balanced mint, used by the two-transaction zap flow (swap the portion, then
 * mint the primary side while the pool pulls the balanced counterpart).
 *
 * The split targets the pool's base/quote deposit balance for the range
 * (concDepositBalance). We over-swap by `bufferPercent` so the minted
 * counterpart side is always fully covered; any excess returns as dust.
 */
export async function computeZapSplit(
    params: ZapSplitParams,
): Promise<ZapSplit> {
    const {
        crocEnv,
        tokenA,
        tokenB,
        inputTokenAddress,
        inputTokenQty,
        isAmbient,
        tick,
        bufferPercent = ZAP_BUFFER_PERCENT,
    } = params;

    const pool = crocEnv.pool(tokenA, tokenB);
    const inputIsBase =
        pool.baseToken.tokenAddr.toLowerCase() ===
        inputTokenAddress.toLowerCase();
    const counterpartAddress = inputIsBase
        ? pool.quoteToken.tokenAddr
        : pool.baseToken.tokenAddr;

    const spotPrice = await pool.spotPrice();
    const inputDecimals = inputIsBase
        ? await pool.baseDecimals
        : await pool.quoteDecimals;

    // fraction of the position's value that should be held as the base token
    const baseValueFraction = isAmbient
        ? 0.5
        : concDepositBalance(
              spotPrice,
              tickToPrice(tick.low),
              tickToPrice(tick.high),
          );
    // fraction of the input's value that must become the counterpart token
    const swapValueFraction = inputIsBase
        ? 1 - baseValueFraction
        : baseValueFraction;
    const swapFraction = Math.min(swapValueFraction + bufferPercent / 100, 1);

    // Do the proportional split in token base units to avoid float drift, then
    // format back to display strings for performSwap / the range mint.
    const inputQtyWei = fromDisplayQty(inputTokenQty || '0', inputDecimals);
    const swapQtyWei =
        (inputQtyWei * BigInt(Math.floor(swapFraction * 1_000_000))) /
        1_000_000n;
    const mintPrimaryQtyWei = inputQtyWei - swapQtyWei;

    return {
        swapQty: toDisplayQty(swapQtyWei, inputDecimals),
        mintPrimaryQty: toDisplayQty(mintPrimaryQtyWei, inputDecimals),
        counterpartAddress,
        inputIsBase,
    };
}
