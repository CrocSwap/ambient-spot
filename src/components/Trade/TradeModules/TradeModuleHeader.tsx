import { memo, useContext } from 'react';
import { AiOutlineShareAlt } from 'react-icons/ai';
import IconWithTooltip from '../../Global/IconWithTooltip/IconWithTooltip';
import ShareModal from '../../Global/ShareModal/ShareModal';
import TransactionSettingsModal, {
    TransactionModuleType,
} from '../../Global/TransactionSettingsModal/TransactionSettingsModal';

import { LuSettings } from 'react-icons/lu';
import { dexBalanceMethodsIF } from '../../../App/hooks/useExchangePrefs';
import { FastLaneProtectionIF } from '../../../App/hooks/useFastLaneProtection';
import { skipConfirmIF } from '../../../App/hooks/useSkipConfirm';
import { SlippageMethodsIF } from '../../../App/hooks/useSlippage';
import { AppStateContext } from '../../../contexts';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import { useModal } from '../../Global/Modal/useModal';
import TradeLinks from './TradeLinks';
import styles from './TradeModuleHeader.module.css';
interface propsIF {
    slippage: SlippageMethodsIF;
    dexBalSwap?: dexBalanceMethodsIF;
    bypassConfirm: skipConfirmIF;
    fastLaneProtection?: FastLaneProtectionIF;
    settingsTitle: TransactionModuleType;
    isSwapPage?: boolean;
}

function TradeModuleHeader(props: propsIF) {
    const {
        slippage,
        dexBalSwap,
        bypassConfirm,
        fastLaneProtection,
        settingsTitle,
        isSwapPage,
    } = props;

    const [isSettingsModalOpen, openSettingsModal, closeSettingsModal] =
        useModal();

    const [isShareModalOpen, openShareModal, closeShareModal] = useModal();

    const smallScreen = useMediaQuery('(max-width: 768px)');

    const {
        baseToken,
        quoteToken,
        isDenomBase,
        toggleDidUserFlipDenom,
        limitTick,
    } = useContext(TradeDataContext);
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);

    const baseTokenSymbol = baseToken.symbol;
    const quoteTokenSymbol = quoteToken.symbol;

    // TODO:    refactor this file to have only a single top-level return and remove
    // TODO:    ... the `<div>` wrapper around the `TradeModuleHeaderContainer` element

    if (smallScreen)
        return (
            <>
                <div className={styles.mobile_container}>
                    <div
                        style={{
                            width: '100%',
                        }}
                    >
                        <TradeLinks
                            chainId={chainId}
                            tokenA={baseToken}
                            tokenB={quoteToken}
                            limitTick={limitTick}
                        />
                    </div>

                    <button
                        onClick={openSettingsModal}
                        id='settings_button'
                        role='button'
                        tabIndex={0}
                        aria-label='Settings button'
                        className={styles.icon_container}
                    >
                        {smallScreen ? (
                            <LuSettings size={20} />
                        ) : (
                            <LuSettings size={22} />
                        )}
                    </button>
                </div>
                {isSettingsModalOpen && (
                    <TransactionSettingsModal
                        module={settingsTitle}
                        slippage={slippage}
                        dexBalSwap={dexBalSwap}
                        bypassConfirm={bypassConfirm}
                        fastLaneProtection={fastLaneProtection!}
                        onClose={closeSettingsModal}
                    />
                )}
            </>
        );

    return (
        <>
            <div style={{ paddingBottom: isSwapPage ? '16px' : '' }}>
                <header className={styles.main_container}>
                    <AiOutlineShareAlt
                        onClick={openShareModal}
                        id='share_button'
                        role='button'
                        tabIndex={0}
                        aria-label='Share button'
                    />

                    {isSwapPage ? (
                        <h4
                            id='swap_header_token_pair'
                            className={styles.swap_title}
                        >
                            Swap
                        </h4>
                    ) : (
                        <h4
                            className={styles.token_pair}
                            id='trade_header_token_pair'
                            role='button'
                            onClick={() => toggleDidUserFlipDenom()}
                        >
                            {isDenomBase ? baseTokenSymbol : quoteTokenSymbol} /{' '}
                            {isDenomBase ? quoteTokenSymbol : baseTokenSymbol}
                        </h4>
                    )}

                    <IconWithTooltip
                        title={settingsTitle + ' Settings'}
                        placement='left'
                    >
                        <div
                            onClick={openSettingsModal}
                            id='settings_button'
                            role='button'
                            tabIndex={0}
                            aria-label='Settings button'
                        >
                            <LuSettings />
                        </div>
                    </IconWithTooltip>
                </header>
            </div>
            {isSettingsModalOpen && (
                <TransactionSettingsModal
                    module={settingsTitle}
                    slippage={slippage}
                    dexBalSwap={dexBalSwap}
                    bypassConfirm={bypassConfirm}
                    fastLaneProtection={fastLaneProtection!}
                    onClose={closeSettingsModal}
                />
            )}
            {isShareModalOpen && <ShareModal onClose={closeShareModal} />}
        </>
    );
}

export default memo(TradeModuleHeader);
