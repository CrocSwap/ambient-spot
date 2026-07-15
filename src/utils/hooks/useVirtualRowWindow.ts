import { useCallback, useLayoutEffect, useState, type RefObject } from 'react';

interface UseVirtualRowWindowOptions {
    /** The scrollable container holding the rows. */
    containerRef: RefObject<HTMLElement | null>;
    /** Total number of rows in the list. */
    rowCount: number;
    /** Fixed row height in CSS pixels — all rows must be exactly this tall. */
    rowHeightPx: number;
    /** Extra rows rendered above and below the visible range. */
    overscanRows?: number;
    /**
     * Re-attach listeners / re-measure when this value changes. Pass the
     * mount condition when the container renders conditionally, since the
     * ref itself changing doesn't re-run effects.
     */
    remeasureKey?: unknown;
}

interface VirtualRowWindow {
    /** First row index to render (inclusive). */
    startIndex: number;
    /** Last row index to render (exclusive). */
    endIndex: number;
    /** Height of the spacer standing in for the rows above the window. */
    topSpacerPx: number;
    /** Height of the spacer standing in for the rows below the window. */
    bottomSpacerPx: number;
    /**
     * Last measured container clientHeight. Stays 0 until the container is
     * actually laid out — scroll-positioning effects should bail (without
     * latching "done" flags) while this is 0 and re-run via this value as a
     * dependency once the ResizeObserver reports a real height.
     */
    viewportPx: number;
    /**
     * Re-read scrollTop/clientHeight from the container. Call this right
     * after setting `scrollTop` programmatically inside a layout effect so
     * the window re-renders around the new position before paint (the
     * native scroll event only fires after the frame is painted).
     */
    syncWindow: () => void;
}

/**
 * Fixed-row-height list windowing. Renders only the rows that intersect the
 * container's viewport (plus overscan), with spacer heights preserving the
 * full scroll range so absolute positions (offsetTop, scrollTop math) stay
 * identical to a fully-rendered list.
 */
export function useVirtualRowWindow({
    containerRef,
    rowCount,
    rowHeightPx,
    overscanRows = 10,
    remeasureKey,
}: UseVirtualRowWindowOptions): VirtualRowWindow {
    // Quantized to a row index so scroll events within the same row bail out
    // of the state update without re-rendering.
    const [scrollRow, setScrollRow] = useState(0);
    const [viewportPx, setViewportPx] = useState(0);

    const syncWindow = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        setScrollRow(Math.max(0, Math.floor(el.scrollTop / rowHeightPx)));
        setViewportPx(el.clientHeight);
    }, [containerRef, rowHeightPx]);

    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        syncWindow();
        const handleScroll = () => syncWindow();
        el.addEventListener('scroll', handleScroll, { passive: true });
        const resizeObserver = new ResizeObserver(syncWindow);
        resizeObserver.observe(el);
        return () => {
            el.removeEventListener('scroll', handleScroll);
            resizeObserver.disconnect();
        };
    }, [containerRef, syncWindow, remeasureKey]);

    const viewportRows = Math.ceil(viewportPx / rowHeightPx);
    const startIndex = Math.min(
        Math.max(0, scrollRow - overscanRows),
        Math.max(0, rowCount - 1),
    );
    const endIndex = Math.min(
        rowCount,
        scrollRow + viewportRows + overscanRows,
    );

    return {
        startIndex,
        endIndex,
        topSpacerPx: startIndex * rowHeightPx,
        bottomSpacerPx: Math.max(0, rowCount - endIndex) * rowHeightPx,
        viewportPx,
        syncWindow,
    };
}
