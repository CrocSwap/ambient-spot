import { memo, useRef } from 'react';
import { candleTimeIF } from '../../../../../App/hooks/useChartSettings';
import useMediaQuery from '../../../../../utils/hooks/useMediaQuery';
import styles from './TimeFrame.module.css';

interface propsIF {
    candleTime: candleTimeIF;
}

function TimeFrame(props: propsIF) {
    const { candleTime } = props;

    const mobileView = useMediaQuery('(max-width: 968px)');
    const tabletView = useMediaQuery(
        '(min-width: 768px) and (max-width: 1200px)',
    );

    const dropdownItemRef = useRef<HTMLDivElement>(null);

    const timeFrameMobile = (
        <div className={styles.dropdown_menu} ref={dropdownItemRef}>
            <div className={styles.mobile_container}>
                {candleTime.defaults.map((option, idx) => (
                    <div className={styles.main_time_frame_container} key={idx}>
                        <button
                            onClick={() => {
                                candleTime.changeTime(option.seconds);
                            }}
                            className={
                                option.seconds === candleTime.time
                                    ? styles.active_selected_button
                                    : styles.non_active_selected_button
                            }
                            tabIndex={0}
                            aria-label={`Set time frame to ${option.readable}.`}
                        >
                            {option.readable}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );

    if (mobileView || tabletView) return timeFrameMobile;

    return (
        <div className={styles.chart_overlay_container}>
            {candleTime.defaults.map((option, idx) => (
                <div className={styles.main_time_frame_container} key={idx}>
                    <button
                        onClick={() => candleTime.changeTime(option.seconds)}
                        className={
                            option.seconds === candleTime.time
                                ? styles.active_selected_button
                                : styles.non_active_selected_button
                        }
                        tabIndex={0}
                        aria-label={`Set time frame to ${option.readable}.`}
                    >
                        {option.readable}
                    </button>
                </div>
            ))}
        </div>
    );
}

export default memo(TimeFrame);
