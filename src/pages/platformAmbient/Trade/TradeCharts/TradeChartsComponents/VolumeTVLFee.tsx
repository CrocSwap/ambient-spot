import { Dispatch, SetStateAction, memo, useContext } from 'react';
import { LS_KEY_SUBCHART_SETTINGS } from '../../../../../ambient-utils/constants';
import styles from './VolumeTVLFee.module.css';
import { BrandContext } from '../../../../../contexts';

interface VolumeTVLFeePropsIF {
    setShowVolume: Dispatch<SetStateAction<boolean>>;
    setShowTvl: Dispatch<SetStateAction<boolean>>;
    setShowFeeRate: Dispatch<SetStateAction<boolean>>;
    showVolume: boolean;
    showTvl: boolean;
    showFeeRate: boolean;
}
function VolumeTVLFee(props: VolumeTVLFeePropsIF) {
    const { platformName } = useContext(BrandContext);

    const {
        setShowVolume,
        setShowTvl,
        setShowFeeRate,
        showVolume,
        showTvl,
        showFeeRate,
    } = props;

    const updateSubChartToggles = (newStatus: {
        isVolumeSubchartEnabled: boolean;
        isTvlSubchartEnabled: boolean;
        isFeeRateSubchartEnabled: boolean;
    }) => {
        localStorage.setItem(
            LS_KEY_SUBCHART_SETTINGS,
            JSON.stringify({ ...newStatus }),
        );
    };

    const handleVolumeToggle = () => {
        setShowVolume(!showVolume);
        updateSubChartToggles({
            isVolumeSubchartEnabled: !showVolume,
            isTvlSubchartEnabled: showTvl,
            isFeeRateSubchartEnabled: showFeeRate,
        });
    };

    const handleTvlToggle = () => {
        setShowTvl(!showTvl);
        updateSubChartToggles({
            isVolumeSubchartEnabled: showVolume,
            isTvlSubchartEnabled: !showTvl,
            isFeeRateSubchartEnabled: showFeeRate,
        });
    };
    const handleFeeRateToggle = () => {
        setShowFeeRate(!showFeeRate);
        updateSubChartToggles({
            isVolumeSubchartEnabled: showVolume,
            isTvlSubchartEnabled: showTvl,
            isFeeRateSubchartEnabled: !showFeeRate,
        });
    };

    const volumeTvlAndFeeData = [
        { name: 'Volume', selected: showVolume, action: handleVolumeToggle },
        { name: 'TVL', selected: showTvl, action: handleTvlToggle },
        {
            name: 'Fee Rate',
            selected: showFeeRate,
            action: handleFeeRateToggle,
        },
    ];

    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {volumeTvlAndFeeData.map((button, idx) => (
                <div className={styles.volume_tvl_container} key={idx}>
                    <button
                        onClick={button.action}
                        className={
                            ['futa'].includes(platformName)
                                ? button.selected
                                    ? styles.futa_active_selected_button
                                    : styles.futa_non_active_selected_button
                                : button.selected
                                  ? styles.active_selected_button
                                  : styles.non_active_selected_button
                        }
                        aria-label={`${button.selected ? 'hide' : 'show'} ${
                            button.name
                        }.`}
                    >
                        {button.name}
                    </button>
                </div>
            ))}
        </div>
    );
}

export default memo(VolumeTVLFee);
