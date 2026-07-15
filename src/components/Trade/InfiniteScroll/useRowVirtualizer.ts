import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

interface propsIF {
    // Number of rows in the (flat) data list.
    count: number;
    // Estimated/measured height of a single row in px.
    rowHeight: number;
    // Extra rows rendered above and below the viewport to avoid blank flashes.
    overscan: number;
    // The scrollable ancestor that actually scrolls the rows.
    scrollElement: HTMLElement | null;
    // Wrapper element of the virtualized region (used to find how far down the
    // virtual rows begin inside the scroll container, e.g. below sticky
    // placeholder rows).
    wrapperRef: RefObject<HTMLDivElement | null>;
    // Fired when the user scrolls within `endThresholdPx` of the very bottom.
    onReachEnd: () => void;
    // Distance from the bottom (px) at which `onReachEnd` fires.
    endThresholdPx: number;
}

interface returnIF {
    startIndex: number;
    endIndex: number;
}

// Minimal fixed-height window virtualizer. Renders only the slice of rows that
// can be seen (plus overscan) and reports the slice bounds. The consuming
// component sizes a spacer to `count * rowHeight` and offsets the rendered slice
// by `startIndex * rowHeight`, so the native scrollbar behaves normally.
export default function useRowVirtualizer(props: propsIF): returnIF {
    const {
        count,
        rowHeight,
        overscan,
        scrollElement,
        wrapperRef,
        onReachEnd,
        endThresholdPx,
    } = props;

    const [range, setRange] = useState<returnIF>({
        startIndex: 0,
        endIndex: Math.min(count, overscan * 2 + 20),
    });
    const rangeRef = useRef(range);
    rangeRef.current = range;

    const onReachEndRef = useRef(onReachEnd);
    onReachEndRef.current = onReachEnd;

    const rafRef = useRef<number | null>(null);

    const measure = useCallback(() => {
        const scrollEl = scrollElement;
        const wrapper = wrapperRef.current;
        if (!scrollEl) return;

        const scrollTop = scrollEl.scrollTop;
        const viewportH = scrollEl.clientHeight;

        // Offset of the virtual region's top edge within the scroll content.
        let regionOffset = 0;
        if (wrapper) {
            const wrapperRect = wrapper.getBoundingClientRect();
            const scrollRect = scrollEl.getBoundingClientRect();
            regionOffset = wrapperRect.top - scrollRect.top + scrollTop;
        }

        const relativeTop = Math.max(0, scrollTop - regionOffset);
        const visibleRows = Math.ceil(viewportH / rowHeight);

        const startIndex = Math.max(
            0,
            Math.floor(relativeTop / rowHeight) - overscan,
        );
        const endIndex = Math.min(
            count,
            startIndex + visibleRows + overscan * 2,
        );

        const prev = rangeRef.current;
        if (prev.startIndex !== startIndex || prev.endIndex !== endIndex) {
            setRange({ startIndex, endIndex });
        }

        // Bottom-reached detection (relative to the whole scroll container so it
        // works regardless of placeholder rows above the virtual region).
        const distanceToBottom =
            scrollEl.scrollHeight - (scrollTop + viewportH);
        if (distanceToBottom <= endThresholdPx) {
            onReachEndRef.current();
        }
    }, [scrollElement, wrapperRef, count, rowHeight, overscan, endThresholdPx]);

    const scheduleMeasure = useCallback(() => {
        if (rafRef.current !== null) return;
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null;
            measure();
        });
    }, [measure]);

    // Attach scroll + resize listeners to the scroll container.
    useEffect(() => {
        const scrollEl = scrollElement;
        if (!scrollEl) return;

        scrollEl.addEventListener('scroll', scheduleMeasure, { passive: true });
        window.addEventListener('resize', scheduleMeasure);

        const resizeObserver =
            typeof ResizeObserver !== 'undefined'
                ? new ResizeObserver(scheduleMeasure)
                : null;
        resizeObserver?.observe(scrollEl);

        // Initial measure (and again next frame, once layout settles).
        measure();
        scheduleMeasure();

        return () => {
            scrollEl.removeEventListener('scroll', scheduleMeasure);
            window.removeEventListener('resize', scheduleMeasure);
            resizeObserver?.disconnect();
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [scrollElement, scheduleMeasure, measure]);

    // Recompute when the data length or row height changes.
    useEffect(() => {
        measure();
    }, [count, rowHeight, measure]);

    return range;
}
