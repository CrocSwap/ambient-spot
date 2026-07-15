# InfiniteScroll component

Guide for the virtualized, infinite-scrolling table used by the Transactions,
Orders, and Ranges tabs (visible on `/trade` and `/account`).

## Overview

`InfiniteScroll.tsx` is a single shared component injected into
`Transactions.tsx`, `Orders.tsx`, and `Ranges.tsx`. It renders the rows for a
potentially very long list while only mounting the handful that are actually on
screen (row virtualization), and transparently fetches older records as the
user scrolls toward the bottom.

It is intentionally thin and split into focused pieces:

```
                 ┌──────────────────┐ ┌────────────┐ ┌────────────┐
                 │ Transactions.tsx │ │ Orders.tsx │ │ Ranges.tsx │
                 └────────┬─────────┘ └─────┬──────┘ └──────┬─────┘
                          │                 │               │
                          └────────────┬────┴───────────────┘
                                       ▼
                            ┌────────────────────┐
                            │  InfiniteScroll.tsx │  orchestration + render
                            └──────┬──────┬───────┘
            ┌──────────────────────┘      └───────────────────────┐
            ▼                                                      ▼
 ┌────────────────────────┐                          ┌────────────────────────┐
 │ useInfiniteScrollData   │  data + pagination       │ useRowVirtualizer       │  windowing
 └──────┬─────────┬────────┘                          └────────────────────────┘
        │         │
        ▼         ▼
 ┌──────────────┐ ┌────────────────────────┐
 │useMergeWith  │ │useInfiniteScrollFetchers│
 │PendingTxs    │ │ (raw backend calls)     │
 └──────────────┘ └────────────────────────┘

 virtualTableHelpers.ts  → shared id/time/dedupe/scroll-parent utilities + TxFetchType
```

## Usage

The public props are unchanged from the previous implementation, so the three
parent components inject it the same way, e.g. on `Transactions.tsx`:

```tsx
<InfiniteScroll
    type='Transaction'
    data={sortedTransactions}
    tableView={tableView}
    isAccountView={isAccountView}
    sortBy={sortBy}
    reverseSort={reverseSort}
    showAllData={showAllData}
    dataPerPage={50}
    fetchCount={50}
    targetCount={30}
    sortTransactions={sortData}
    txFetchType={fetchType}
    txFetchAddress={addressToUse}
    componentLock={infiniteScrollLock}
/>
```

| prop                                                | meaning                                                                                                     | type                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `type`                                              | which table this is                                                                                         | `'Transaction' \| 'Order' \| 'Range'`               |
| `data`                                              | live "head" of the list (already sorted) sourced from the GraphData contexts; new/updated rows flow in here | `TransactionIF[] \| LimitOrderIF[] \| PositionIF[]` |
| `fetchCount`                                        | page size requested from the backend per call                                                               | `number`                                            |
| `targetCount`                                       | how many _new_ rows a single `loadMore` tries to collect before stopping                                    | `number`                                            |
| `sortTransactions` / `sortOrders` / `sortPositions` | sort fn for the relevant type; applied to the merged list                                                   | `(data: T[]) => T[]`                                |
| `txFetchType` / `txFetchAddress`                    | which fetcher endpoint + address to use (Transactions only)                                                 | `TxFetchType` / `string`                            |
| `componentLock`                                     | pauses fetching and resets pagination (e.g. while a candle is selected)                                     | `boolean`                                           |
| `dataPerPage` / `extraRequestCreditLimit`           | accepted for backwards compatibility; no longer used                                                        | `number`                                            |

## How it works

### Data (`useInfiniteScrollData`)

1. The live `data` prop and the `fetchedOlder` records (paginated in on scroll)
   are concatenated, de-duplicated by stable id (live data wins), and re-sorted
   with the provided sort fn.
2. The result is passed through `useMergeWithPendingTxs` to fold in optimistic
   pending positions (a no-op for plain transactions).
3. `loadMore()` computes the oldest timestamp currently shown, requests the next
   batch via `useInfiniteScrollFetchers`, drops anything already present, and
   appends the genuinely new rows. It stops when it has `targetCount` fresh rows,
   runs out of data, or hits the per-call round cap.
4. Pagination resets only when the underlying query changes (pool pair,
   `txFetchType`, `componentLock`, or `showAllData`) — never on routine live
   `data` updates.

### Rendering (`useRowVirtualizer`)

- A spacer `div` is sized to `rowCount * rowHeight`, so the native scrollbar
  reflects the full dataset.
- Only the visible slice (plus overscan) is rendered, absolutely positioned via
  `translateY(startIndex * rowHeight)`.
- `rowHeight` is measured from a real row after first paint, so it stays correct
  across the small / medium / large layouts.
- The virtualizer attaches scroll/resize listeners to the parent table's scroll
  container (located with `getScrollParent`) and fires `onReachEnd` near the
  bottom to trigger `loadMore`.
- When live rows are prepended while the user is scrolled down, the component
  nudges `scrollTop` so the viewport stays visually anchored.

This replaces the previous page-window + `scrollIntoView` + timeout-driven
`TableRowsInfiniteScroll` approach with a flat, always-sorted list and standard
fixed-height virtualization.
