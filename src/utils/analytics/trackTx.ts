import { track } from '@plausible-analytics/tracker';
import { TransactionReceipt } from 'ethers';
import { SHOULD_LOG_ANALYTICS } from '../../ambient-utils/constants';
import { isTransactionDeniedError } from '../TransactionError';

// How a submitted transaction ended:
//   confirmed — mined successfully
//   failed    — mined but reverted
//   rejected  — the user declined it in their wallet
//   error     — anything else (building, sending, or waiting threw)
export type TxOutcome = 'confirmed' | 'failed' | 'rejected' | 'error';

export const txOutcomeFromReceipt = (receipt: TransactionReceipt): TxOutcome =>
    receipt.status === 1 ? 'confirmed' : 'failed';

export const txOutcomeFromError = (error: unknown): TxOutcome =>
    isTransactionDeniedError(error) ? 'rejected' : 'error';

// How a liquidity mint was funded:
//   two-token              — both tokens deposited, range spans the price
//   one-sided-out-of-range — the range sits off the price, so it takes one token
//   one-sided-in-range     — range spans the price, user deposited ONE token
//                            and a swap balanced it (single-token deposit)
//   swap-difference        — two-token deposit whose shortfall a swap covered
export type MintDepositKind =
    | 'two-token'
    | 'one-sided-out-of-range'
    | 'one-sided-in-range'
    | 'swap-difference';

// Where a swap came from: the swap/market form, or the swap leg of a
// swap-assisted mint (same names as the mint's deposit kind).
export type SwapSource = 'swap-form' | 'one-sided-in-range' | 'swap-difference';

export function trackMint(props: {
    outcome: TxOutcome;
    deposit: MintDepositKind;
    positionType: 'ambient' | 'concentrated';
    action: 'create' | 'add';
    chain: string;
}) {
    if (!SHOULD_LOG_ANALYTICS) return;
    track('Mint', { props });
}

export function trackSwap(props: {
    outcome: TxOutcome;
    source: SwapSource;
    fastLane: boolean;
    fromExchangeBalance: boolean;
    toExchangeBalance: boolean;
    chain: string;
}) {
    if (!SHOULD_LOG_ANALYTICS) return;
    track('Swap', {
        props: {
            ...props,
            fastLane: String(props.fastLane),
            fromExchangeBalance: String(props.fromExchangeBalance),
            toExchangeBalance: String(props.toExchangeBalance),
        },
    });
}
