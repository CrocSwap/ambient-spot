# Chart.tsx — Remaining Optimizations

Status notes for the ongoing `Chart.tsx` cleanup. Several cohesive units have
already been extracted into `ChartUtils/` (`shapeLocations.ts`,
`useChartScale.ts`, `useLimitNoGoZone.ts`, `useHoverStatus.ts`,
`useChartZoom.ts`, `useChartDrag.ts`) and three bugs were fixed (swipe-back
listener leak, drag `keydown` listener leak, `getCandleCount` `* 1000` unit
mismatch). `Chart.tsx` went from ~7,378 to ~5,659 lines.

Items 1–4 are **done**, and item 5 is done to the extent worthwhile (the
`diffHashSig` hoist; the two remaining bullets were investigated and
intentionally deferred — see item 5). Each item below records the outcome. Verify
every change with `npx tsc --noEmit -p tsconfig.json` and `npx prettier --check`
(the repo has no working ESLint flat config — do not rely on `npx eslint`).

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

## 2. Extract the drag setup effects — DONE

- **What:** the `dragRange` and `dragLimit` `useEffect`s (~400 and ~135 lines)
  that build d3 `.drag()` behaviors and attach them to the canvas.
- **Outcome:** The two `d3.drag()` constructions (including their shared mutable
  locals, the `cancelDragEvent` keydown handler, and the canvas/`rectCanvas`
  setup) were moved verbatim into `ChartUtils/useChartDrag.ts` as
  `createRangeDragBehavior(deps)` and `createLimitDragBehavior(deps)`. Each
  `useEffect` wrapper stays in `Chart.tsx` — keeping the `if (scaleData)` guard
  (range), the dependency arrays, and the `setDragRange`/`setDragLimit` calls —
  so React semantics are unchanged. The shared `filterDragEvent` helper remains
  in `Chart.tsx` and is threaded in as a dep. The
  `document.addEventListener/removeEventListener('keydown', cancelDragEvent)`
  pairing (bug fix #2) is preserved inside the factories. `scaleData` is typed
  non-optional in both deps (it is a non-optional prop). `tsc` + `prettier`
  clean.
- **Not runtime-verified:** there is still no test coverage; this is a pure
  mechanical relocation, but the drag / limit-drag interactions should be
  exercised manually in the app at some point.

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

## 4. Consolidate the candle helpers — DONE

- **What:** `minimum`, `snapForCandle`, `calculateVisibleCandles`,
  `calculateDiscontinuityRange`.
- **Outcome:** `minimum`, `snapForCandle` and `calculateVisibleCandles` were
  moved to `chartUtils.ts` as exported pure functions — `minimum`/`snapForCandle`
  now take `scaleData` as an explicit param, and `calculateVisibleCandles` takes
  `isCondensedModeEnabled` as an explicit param. Call sites in `Chart.tsx` pass
  these through. Two child canvases (`DrawCanvas`, `DragCanvas`) expect a
  2-arg `snapForCandle` prop, so a thin `snapForCandleData(point, filtered)`
  wrapper bound to the current `scaleData` is passed to them (matches the
  previous per-render closure identity, no extra churn). `minimum` returns `any`
  (the reduce uses an `any` accumulator), so `snapForCandle` keeps the original
  `minimum(...)[1]` indexing (no `?.`) to preserve exact behavior.
  `calculateDiscontinuityRange` was left in `Chart.tsx` — it is stateful (calls
  `setTimeGaps`, reads `timeGaps`), not a pure-function candidate. `tsc` +
  `prettier` clean.

## 5. Memoize hot derived values / reduce re-render churn — DONE (scoped)

The valuable, low-risk part (the `diffHashSig` hoisting) is done. The other two
bullets were investigated and intentionally left undone for the reasons below.

- **Done:** `diffHashSig*` results are now hoisted into plain once-per-render
  locals (`scaleDataHashX`, `scaleDataHash`, `visibleCandleDataHash`,
  `drawnShapeHistoryHash`) and reused across all the dependency arrays that
  previously recomputed them inline (~17 inline calls → 4). **Note:** these are
  intentionally plain consts, **not** `useMemo`d — the d3 scales mutate in place
  so object identity is unreliable; the hash must be recomputed every render
  (just once now, then reused) to keep the value-comparison semantics identical.
- **Investigated, intentionally NOT done — mousemove `useCallback`:** `mousemove`
  calls four sibling functions that are themselves recreated every render and are
  **not** memoized (`candleOrVolumeDataHoverStatus`, `setCrossHairDataFunc`,
  `orderHistoryHoverStatus`, `drawnShapesHoverStatus`). Wrapping `mousemove` in
  `useCallback` would freeze stale references to them (stale-closure bugs) unless
  its **entire call graph** is memoized first. That cascade is large, high-risk,
  and unverifiable without runtime tests, for negligible benefit (it would only
  avoid recreating one function object per render). Not worth it as-is. If
  revisited: memoize the hover-status helpers (return them as `useCallback`s from
  `useHoverStatus`) and `setCrossHairDataFunc` first, then `mousemove` last.
- **Investigated, N/A — child-canvas scale-object memo:** there is no
  `liquidityMouseMoveCoordinate` variable in the current code, so this bullet is
  stale. Any future pass here should first confirm the target child canvases are
  wrapped in `React.memo` (otherwise prop-object memoization yields no benefit).

## Recommended order

1. ~~Hover-status hook (item 1)~~ — DONE.
2. ~~Zoom effect (item 3)~~ — DONE.
3. ~~Drag effects (item 2)~~ — DONE (`createRangeDragBehavior` /
   `createLimitDragBehavior` in `useChartDrag.ts`). Still benefits from a manual
   runtime check of drag / limit-drag interactions (no test coverage).
4. ~~Candle helpers (item 4)~~ — DONE. ~~Render-churn passes (item 5)~~ — the
   `diffHashSig` hoist is DONE; the mousemove `useCallback` / child-canvas memo
   bullets were investigated and intentionally deferred (see item 5).

All planned items are now addressed. Remaining future work is optional and
documented inline (notably the memoization cascade under item 5, which needs
runtime verification).

## Guardrails

- Behavior must stay identical; these are mechanical relocations, not rewrites.
- Place new hook calls **after** their inputs are defined (e.g. after `render`)
  to avoid temporal-dead-zone / use-before-define issues.
- Run `tsc --noEmit` and `prettier --check` after **each** extraction, not at
  the end.
- No test coverage exists for this component, so keep diffs small and reviewable.
