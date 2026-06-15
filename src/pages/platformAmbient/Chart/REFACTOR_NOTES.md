# Chart.tsx — Remaining Optimizations

Status notes for the ongoing `Chart.tsx` cleanup. Four cohesive units have
already been extracted into `ChartUtils/` (`shapeLocations.ts`,
`useChartScale.ts`, `useLimitNoGoZone.ts`, `useHoverStatus.ts`) and three bugs
were fixed (swipe-back listener leak, drag `keydown` listener leak,
`getCandleCount` `* 1000` unit mismatch). `Chart.tsx` went from ~7,378 to ~6,442
lines.

Items 1, 3, and the `diffHashSig` half of item 5 are now **done** (see each
section). Items 2, 4 and the rest of item 5 remain. Each item lists the rough
scope, the risk level, and the suggested approach. Verify every change with
`npx tsc --noEmit -p tsconfig.json` and `npx prettier --check` (the repo has no
working ESLint flat config — do not rely on `npx eslint`).

## 1. Extract hover-status logic — DONE

- **What:** `drawnShapesHoverStatus` and `orderHistoryHoverStatus` (~600 lines
  combined). Pure-ish: given a mouse `(x, y)` they walk `drawnShapeHistory` /
  order arrays and return the hovered element. They already lean on the
  extracted `shapeLocations.ts` checkers.
- **Outcome:** Moved into `ChartUtils/useHoverStatus.ts` as a hook returning
  `{ drawnShapesHoverStatus, orderHistoryHoverStatus }`. Read-only context and
  the relevant state setters (incl. tooltip placement) are threaded in via the
  args object; `handleCardClick` stays in `Chart.tsx` and is passed through.
  Behavior unchanged; `tsc` + `prettier` clean.

## 2. Extract the drag setup effects

- **What:** the `dragRange` and `dragLimit` `useEffect`s (each ~250–350 lines)
  that build d3 `.drag()` behaviors and attach them to the canvas.
- **Risk:** High. Deeply coupled: they mutate `ranges`, call `calculateLimit`,
  `setLimit`, `setMinTickForLimit`, URL helpers, `render`, and read live state
  via closures. Easy to introduce stale-closure bugs.
- **Approach:** Do this **after** items 1 and 3. Extract the inner d3 builder
  (`createRangeDragBehavior(...)`) into a module that takes an explicit deps
  object, and keep the `useEffect` wrapper (attach/detach + dep array) in
  `Chart.tsx` so React semantics are unchanged. Confirm the new
  `removeEventListener('keydown', …)` cleanup (bug fix #2) is preserved.

## 3. Extract the zoom setup effect — DONE

- **What:** the zoom `useEffect` (~360 lines) that wires `d3.zoom`, wheel
  handling, and `changeScale(true)` calls.
- **Outcome:** The `d3.zoom()` behavior construction (start/zoom/end/filter
  handlers plus the shared mutable touch-tracking locals) was moved verbatim
  into `ChartUtils/useChartZoom.ts` as `createChartZoom(deps)`. The `useEffect`
  wrapper stays in `Chart.tsx` — it keeps the wheel `.on('wheel')` attachment,
  the dependency array and the `setMainZoom(() => zoom)` call — so React
  semantics are unchanged. ~34 live values (incl. `scaleData`, `zoomBase`,
  `render`, `changeScale`, `setYaxisDomain`, the hover-status helpers and the
  relevant setters) are threaded in via the `deps` object at effect-execution
  time, preserving the exact closure behavior. `props.setShowTooltip` is passed
  as `setShowTooltip`. `tsc` + `prettier` clean.
- **Type note:** `scaleData` is typed non-optional in `ChartZoomDeps` because
  the call site sits inside the effect's `scaleData !== undefined` guard (the
  original code relied on that narrowing for the y-domain math in `.filter`).

## 4. Consolidate the candle helpers

- **What:** `minimum`, `snapForCandle`, `calculateVisibleCandles`,
  `calculateDiscontinuityRange`.
- **Risk:** Low, but low payoff (small functions, several call sites).
- **Approach:** Move `minimum`/`snapForCandle` to `chartUtils.ts` as pure
  functions taking `scaleData`; thread `isCondensedModeEnabled` into
  `calculateVisibleCandles`. Only worthwhile when touching this area anyway.

## 5. Memoize hot derived values / reduce re-render churn — PARTIALLY DONE

- **Done:** `diffHashSig*` results are now hoisted into plain once-per-render
  locals (`scaleDataHashX`, `scaleDataHash`, `visibleCandleDataHash`,
  `drawnShapeHistoryHash`) and reused across all the dependency arrays that
  previously recomputed them inline (~17 inline calls → 4). **Note:** these are
  intentionally plain consts, **not** `useMemo`d — the d3 scales mutate in place
  so object identity is unreliable; the hash must be recomputed every render
  (just once now, then reused) to keep the value-comparison semantics identical.
- **Still TODO:** the big mousemove `useEffect` recreates handlers on most
  renders. After the hover-status extraction (item 1), wrap the handler in
  `useCallback` with a tight dep list to cut redundant work on each pointer move.
- **Still TODO:** consider `useMemo` for the `liquidityMouseMoveCoordinate` /
  scale objects passed down to child canvases so they don't re-render every
  frame.

## Recommended order

1. ~~Hover-status hook (item 1)~~ — DONE.
2. ~~Zoom effect (item 3)~~ — DONE.
3. Drag effects (item 2) — highest risk; **still TODO**, do one drag handler at
   a time. Now low-mechanical-risk thanks to the `createChartZoom` factory
   pattern, but should be done in a session where drag / limit-drag interactions
   can be **runtime-verified** (no test coverage). Reuse the same approach:
   `createRangeDragBehavior(deps)` / `createLimitDragBehavior(deps)` in a new
   module, keep the `useEffect` wrapper + `setDragRange`/`setDragLimit` and the
   `document.removeEventListener('keydown', …)` cleanup in `Chart.tsx`. The
   shared `filterDragEvent` helper can be threaded in as a dep.
4. Candle helpers (item 4) + remaining render-churn passes (item 5) —
   opportunistic, **still TODO**.

## Guardrails

- Behavior must stay identical; these are mechanical relocations, not rewrites.
- Place new hook calls **after** their inputs are defined (e.g. after `render`)
  to avoid temporal-dead-zone / use-before-define issues.
- Run `tsc --noEmit` and `prettier --check` after **each** extraction, not at
  the end.
- No test coverage exists for this component, so keep diffs small and reviewable.
