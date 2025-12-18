import React, { useEffect, useId, useRef, useState } from 'react';
import styles from './Tooltip.module.css';

const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
    );
};

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    maxWidth?: string;
}

const Tooltip = ({
    content,
    children,
    position = 'top',
    className = '',
    maxWidth = '200px',
}: TooltipProps) => {
    const [isVisible, setIsVisible] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const isTouch = isTouchDevice();
    const tooltipId = useId();

    const calculatePosition = () => {
        if (!tooltipRef.current || !triggerRef.current) return {};

        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const triggerRect = triggerRef.current.getBoundingClientRect();

        let top = 0;
        let left = 0;

        switch (position) {
            case 'top':
                left = -(tooltipRect.width - triggerRect.width) / 2;
                top = -tooltipRect.height - 8;
                break;
            case 'bottom':
                left = -(tooltipRect.width - triggerRect.width) / 2;
                top = triggerRect.height + 8;
                break;
            case 'left':
                left = -tooltipRect.width - 8;
                top = -(tooltipRect.height - triggerRect.height) / 2;
                break;
            case 'right':
                left = triggerRect.width + 8;
                top = -(tooltipRect.height - triggerRect.height) / 2;
                break;
        }

        // Check if tooltip would go off screen
        const viewportPadding = 10;
        const tooltipLeft = triggerRect.left + left;
        const tooltipTop = triggerRect.top + top;

        if (tooltipLeft < viewportPadding) {
            left = left + (viewportPadding - tooltipLeft);
        } else if (
            tooltipLeft + tooltipRect.width >
            window.innerWidth - viewportPadding
        ) {
            left =
                left -
                (tooltipLeft +
                    tooltipRect.width -
                    window.innerWidth +
                    viewportPadding);
        }

        if (tooltipTop < viewportPadding) {
            top = triggerRect.height + 8; // Switch to bottom if would go off top
        } else if (
            tooltipTop + tooltipRect.height >
            window.innerHeight - viewportPadding
        ) {
            top = -tooltipRect.height - 8; // Switch to top if would go off bottom
        }

        return { top, left };
    };

    useEffect(() => {
        let rafId: number;

        if (isVisible) {
            const updatePosition = () => {
                const position = calculatePosition();
                if (tooltipRef.current) {
                    tooltipRef.current.style.top = `${position.top}px`;
                    tooltipRef.current.style.left = `${position.left}px`;
                }
                rafId = requestAnimationFrame(updatePosition);
            };

            rafId = requestAnimationFrame(updatePosition);

            return () => {
                if (rafId) cancelAnimationFrame(rafId);
            };
        }
    }, [isVisible, position]);

    const handleTrigger = (show: boolean) => {
        if (!isTouch) {
            setIsVisible(show);
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        if (isTouch) {
            e.preventDefault();
            setIsVisible(!isVisible);

            const handleOutsideClick = (e: MouseEvent) => {
                if (
                    triggerRef.current &&
                    !triggerRef.current.contains(e.target as Node)
                ) {
                    setIsVisible(false);
                    document.removeEventListener('click', handleOutsideClick);
                }
            };

            if (!isVisible) {
                setTimeout(() => {
                    document.addEventListener('click', handleOutsideClick);
                }, 0);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape' && isVisible) {
            setIsVisible(false);
        }
    };

    return (
        <div
            className={styles.tooltipWrapper}
            ref={triggerRef}
            onMouseEnter={() => handleTrigger(true)}
            onMouseLeave={() => handleTrigger(false)}
            onFocus={() => handleTrigger(true)}
            onBlur={() => handleTrigger(false)}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-describedby={isVisible && content ? tooltipId : undefined}
        >
            {children}

            {isVisible && content && (
                <div
                    ref={tooltipRef}
                    id={tooltipId}
                    role='tooltip'
                    style={{ maxWidth }}
                    className={`
            ${styles.tooltip}
            ${isTouch ? styles.mobileTooltip : ''}
            ${className}
          `}
                >
                    {content}
                </div>
            )}
        </div>
    );
};

export default Tooltip;
