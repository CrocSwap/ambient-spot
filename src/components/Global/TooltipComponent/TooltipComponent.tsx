import { memo, useRef, useState } from 'react';
import { AiOutlineQuestionCircle } from 'react-icons/ai';
import { useMediaQuery } from '../../../utils/hooks/useMediaQuery';
import useOnClickOutside from '../../../utils/hooks/useOnClickOutside';
import {
    DefaultTooltip,
    TextOnlyTooltip,
} from '../StyledTooltip/StyledTooltip';
import styles from './TooltipComponent.module.css';

interface TooltipComponentProps {
    title: string | JSX.Element;
    noBg?: boolean;
    usePopups?: boolean;
    icon?: JSX.Element;
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
}

function TooltipComponent(props: TooltipComponentProps) {
    const [open, setOpen] = useState(false);
    const isMobile = useMediaQuery('(max-width:600px)');
    const containerRef = useRef<HTMLDivElement>(null);

    const clickOutsideHandler = () => {
        setOpen(false);
    };

    useOnClickOutside(containerRef, clickOutsideHandler);

    const mobilePopup = (
        <div className={styles.mobilePopupContainer}>{props.title}</div>
    );
    if (props.noBg)
        return (
            <TextOnlyTooltip
                title={props.title}
                interactive
                placement={props.placement ? props.placement : 'right'}
                arrow
                enterDelay={400}
                leaveDelay={200}
            >
                <div className={styles.icon}>
                    {props.icon ? (
                        props.icon
                    ) : (
                        <AiOutlineQuestionCircle
                            size={18}
                            color={props.svgColor ?? 'var(--text2)'}
                            className='futaStyleSvg'
                        />
                    )}
                </div>
            </TextOnlyTooltip>
        );
    return (
        <>
            {open && props.usePopups && isMobile && mobilePopup}
            <DefaultTooltip
                title={props.title}
                interactive
                placement={props.placement ? props.placement : 'right'}
                arrow
                enterDelay={400}
                leaveDelay={200}
                ref={containerRef}
            >
                <div className={styles.icon}>
                    {props.icon ? (
                        props.icon
                    ) : (
                        <AiOutlineQuestionCircle
                            size={15}
                            onClick={() => setOpen(!open)}
                            color={props.svgColor ?? 'var(--text2)'}
                        />
                    )}
                </div>
            </DefaultTooltip>
        </>
    );
}

export default memo(TooltipComponent);
