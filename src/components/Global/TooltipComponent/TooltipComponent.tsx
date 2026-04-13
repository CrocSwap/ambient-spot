import { memo, useEffect, useRef, useState } from 'react';
import { AiOutlineQuestionCircle } from 'react-icons/ai';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import useOnClickOutside from '../../../utils/hooks/useOnClickOutside';
import {
    DefaultTooltip,
    TextOnlyTooltip,
} from '../StyledTooltip/StyledTooltip';
import styles from './TooltipComponent.module.css';

interface TooltipComponentProps {
    title: string | React.ReactNode;
    noBg?: boolean;
    usePopups?: boolean;
    icon?: React.ReactNode;
    svgColor?: string;
    placement?:
        | 'right'
        | 'bottom-end'
        | 'bottom-start'
        | 'bottom'
        | 'left-end'
        | 'left-start'
        | 'left'
        | 'right-end'
        | 'right-start'
        | 'top-end'
        | 'top-start'
        | 'top'
        | undefined;
    onClick?: () => void; // Added optional onClick handler
}

function TooltipComponent(props: TooltipComponentProps) {
    const [open, setOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width:600px)');
    const containerRef = useRef<HTMLDivElement>(null);

    // Clean up state when component unmounts
    useEffect(() => {
        return () => {
            setOpen(false);
        };
    }, []);

    const clickOutsideHandler = () => {
        setOpen(false);
    };

    useOnClickOutside(containerRef, clickOutsideHandler);

    // Handle click events properly
    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent event bubbling
        setOpen(!open);
        if (props.onClick) {
            props.onClick();
        }
    };

    const mobilePopup = (
        <div className={styles.mobilePopupContainer}>{props.title}</div>
    );

    // For no background style tooltip
    if (props.noBg) {
        return (
            <div ref={containerRef}>
                <TextOnlyTooltip
                    title={props.title}
                    placement={props.placement || 'right'}
                    arrow
                    enterDelay={400}
                    leaveDelay={200}
                    open={props.usePopups && isMobile ? open : undefined} // Control open state only for mobile popups
                >
                    <div
                        className={styles.icon}
                        onClick={handleIconClick}
                        role='button'
                        tabIndex={0}
                        aria-label='Show tooltip'
                    >
                        {props.icon ? (
                            props.icon
                        ) : (
                            <AiOutlineQuestionCircle
                                size={18}
                                color={props.svgColor ?? 'var(--text2)'}
                            />
                        )}
                    </div>
                </TextOnlyTooltip>
            </div>
        );
    }

    // For default tooltip style
    return (
        <div ref={containerRef}>
            {open && props.usePopups && isMobile && mobilePopup}
            <DefaultTooltip
                title={props.title}
                placement={props.placement || 'right'}
                arrow
                enterDelay={400}
                leaveDelay={200}
                open={props.usePopups && isMobile ? open : undefined} // Control open state only for mobile popups
            >
                <div
                    className={styles.icon}
                    onClick={handleIconClick}
                    role='button'
                    tabIndex={0}
                    aria-label='Show tooltip'
                >
                    {props.icon ? (
                        props.icon
                    ) : (
                        <AiOutlineQuestionCircle
                            size={15}
                            color={props.svgColor ?? 'var(--text2)'}
                        />
                    )}
                </div>
            </DefaultTooltip>
        </div>
    );
}

export default memo(TooltipComponent);
