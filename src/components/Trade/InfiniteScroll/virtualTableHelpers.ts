import { LimitOrderIF } from '../../../ambient-utils/types/limitOrder';
import { PositionIF } from '../../../ambient-utils/types/position';
import { TransactionIF } from '../../../ambient-utils/types/transaction';

export type TableType = 'Transaction' | 'Order' | 'Range';
export type TableRecord = TransactionIF | LimitOrderIF | PositionIF;

export enum TxFetchType {
    UserTxs,
    PoolTxs,
    UserPoolTxs,
    None,
}

// Stable identity for a record. Used to de-duplicate the merged list, keeping
// the first (freshest) occurrence. Live data coming from the contexts is placed
// at the head of the list so it always wins over older fetched copies.
export function recordId(type: TableType, record: TableRecord): string {
    switch (type) {
        case 'Transaction': {
            const tx = record as TransactionIF;
            return tx.txId || tx.txHash;
        }
        case 'Order':
            return (record as LimitOrderIF).limitOrderId;
        case 'Range':
            return (record as PositionIF).positionId;
    }
}

// Timestamp used for time-based pagination (`timeBefore` query param).
export function recordTime(type: TableType, record: TableRecord): number {
    switch (type) {
        case 'Transaction':
            return (record as TransactionIF).txTime;
        case 'Order':
            return (record as LimitOrderIF).latestUpdateTime;
        case 'Range':
            return (record as PositionIF).latestUpdateTime;
    }
}

// Oldest timestamp across a list, or Infinity when empty.
export function oldestTime(type: TableType, records: TableRecord[]): number {
    let oldest = Infinity;
    for (const record of records) {
        const t = recordTime(type, record);
        if (t < oldest) oldest = t;
    }
    return oldest;
}

// Concatenate lists and drop duplicates, keeping the first occurrence.
export function dedupeById(
    type: TableType,
    ...lists: TableRecord[][]
): TableRecord[] {
    const seen = new Set<string>();
    const result: TableRecord[] = [];
    for (const list of lists) {
        for (const record of list) {
            const id = recordId(type, record);
            if (seen.has(id)) continue;
            seen.add(id);
            result.push(record);
        }
    }
    return result;
}

// Walk up the DOM to find the closest scrollable ancestor. Falls back to the
// document scrolling element. The table components own their own scroll
// container (`.custom_scroll_ambient` on desktop, the surrounding scroll div on
// mobile), so the virtualizer attaches to whichever it finds first.
export function getScrollParent(node: HTMLElement | null): HTMLElement | null {
    let el: HTMLElement | null = node?.parentElement ?? null;
    while (el) {
        const overflowY = window.getComputedStyle(el).overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') return el;
        el = el.parentElement;
    }
    return (document.scrollingElement as HTMLElement) ?? null;
}
