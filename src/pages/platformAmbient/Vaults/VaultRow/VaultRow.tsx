import { toDisplayQty } from '@crocswap-libs/sdk';
import { useContext, useState } from 'react';
import { RiExternalLinkLine } from 'react-icons/ri';
import {
    getFormattedNumber,
    uriToHttp,
} from '../../../../ambient-utils/dataLayer';
import { VaultIF, VaultStrategy } from '../../../../ambient-utils/types';
import IconWithTooltip from '../../../../components/Global/IconWithTooltip/IconWithTooltip';
import { useModal } from '../../../../components/Global/Modal/useModal';
import { DefaultTooltip } from '../../../../components/Global/StyledTooltip/StyledTooltip';
import TokenIcon from '../../../../components/Global/TokenIcon/TokenIcon';
import TooltipComponent from '../../../../components/Global/TooltipComponent/TooltipComponent';
import {
    AppStateContext,
    ChainDataContext,
    TokenContext,
    UserDataContext,
} from '../../../../contexts';
import { useBottomSheet } from '../../../../contexts/BottomSheetContext';
import { FlexContainer } from '../../../../styled/Common';
import useMediaQuery from '../../../../utils/hooks/useMediaQuery';
import { formatDollarAmount } from '../../../../utils/numbers';
import VaultDeposit from '../VaultActionModal/VaultDeposit/VaultDeposit';
import VaultWithdraw from '../VaultActionModal/VaultWithdraw/VaultWithdraw';
import styles from './VaultRow.module.css';
import tempestLogoColor from './tempestLogoColor.svg';

interface propsIF {
    idForDOM: string;
    vault: VaultIF;
}

export default function VaultRow(props: propsIF) {
    const { idForDOM, vault } = props;

    const [isOpen, openModal, closeModal] = useModal();
    const [type, setType] = useState<'Deposit' | 'Withdraw'>('Deposit');

    const { tokens } = useContext(TokenContext);
    const { isUserConnected, userAddress } = useContext(UserDataContext);
    const { closeBottomSheet } = useBottomSheet();

    // const userAddress = '0xe09de95d2a8a73aa4bfa6f118cd1dcb3c64910dc'

    const {
        activeNetwork: { chainId, tempestApiNetworkName },
    } = useContext(AppStateContext);

    const { isActiveNetworkPlume } = useContext(ChainDataContext);

    const mainAsset = tokens.getTokenByAddress(vault.mainAsset);
    const secondaryAssetAddress =
        vault.token0Address.toLowerCase() === vault.mainAsset.toLowerCase()
            ? vault.token1Address
            : vault.token0Address;
    const secondaryAsset = tokens.getTokenByAddress(secondaryAssetAddress);

    const showMobileVersion = useMediaQuery('(max-width: 768px)');
    const showPhoneVersion = useMediaQuery('(max-width: 500px)');

    const strategy = vault.strategy as VaultStrategy;

    const scaledQtyNum =
        vault.balance && mainAsset && userAddress
            ? parseFloat(toDisplayQty(vault.balance, mainAsset.decimals))
            : 0;

    const balDisplayString = scaledQtyNum
        ? getFormattedNumber({
              value: scaledQtyNum,
          })
        : '...';

    if (
        Number(chainId) !== Number(vault.chainId) ||
        !mainAsset ||
        !secondaryAsset
    ) {
        return null;
    }

    const tokenIconsDisplay = (
        <FlexContainer
            alignItems='center'
            gap={5}
            style={{ flexShrink: 0 }}
            onClick={() => navigateExternal()}
        >
            <div className={styles.tempestDisplay}>
                <DefaultTooltip title={'Tempest Finance'}>
                    <img src={tempestLogoColor} alt='tempest' />
                </DefaultTooltip>
            </div>
            <IconWithTooltip title={mainAsset.symbol} placement='bottom'>
                <TokenIcon
                    token={mainAsset}
                    src={uriToHttp(mainAsset.logoURI)}
                    alt={mainAsset.symbol}
                    size={showMobileVersion ? 'm' : '2xl'}
                />
            </IconWithTooltip>
            <IconWithTooltip title={secondaryAsset.symbol} placement='bottom'>
                <TokenIcon
                    token={secondaryAsset}
                    src={uriToHttp(secondaryAsset.logoURI)}
                    alt={secondaryAsset.symbol}
                    size={showMobileVersion ? 'm' : '2xl'}
                />{' '}
            </IconWithTooltip>
            {showMobileVersion && <RiExternalLinkLine size={20} />}
        </FlexContainer>
    );

    const depositsDisplay = (
        <FlexContainer
            alignItems='flex-end'
            flexDirection='column'
            justifyContent='flex-end'
            gap={5}
            style={{ flexShrink: 0 }}
        >
            <FlexContainer flexDirection='row' alignItems='center' gap={4}>
                {balDisplayString}
                {!!vault.balance && !!userAddress && (
                    <>
                        <TokenIcon
                            token={mainAsset}
                            src={uriToHttp(mainAsset.logoURI)}
                            alt={mainAsset.symbol}
                            size={'m'}
                        />

                        <TooltipComponent
                            placement='top'
                            title='Vault positions can hold both tokens in a pair. Displayed position values represent estimated redeemable token positions for the primary token on withdrawal.'
                        />
                    </>
                )}
            </FlexContainer>
        </FlexContainer>
    );

    const isAprUnknown = !(parseFloat(vault.apr) > 0) || isActiveNetworkPlume;

    const formattedAPR = isAprUnknown
        ? '...'
        : getFormattedNumber({
              value: parseFloat(vault.apr) * 100,
              prefix: '',
              suffix: '%',
              minFracDigits: 2,
              maxFracDigits: 2,
              isPercentage: true,
          });
    function handleOpenWithdrawModal() {
        setType('Withdraw');
        openModal();
    }
    function handleOpenDepositModal() {
        setType('Deposit');
        openModal();
    }

    function handleModalClose() {
        closeModal();
        closeBottomSheet();
    }

    const modalToOpen =
        type === 'Deposit' ? (
            <VaultDeposit
                mainAsset={mainAsset}
                secondaryAsset={secondaryAsset}
                vault={vault}
                onClose={handleModalClose}
                strategy={strategy}
            />
        ) : (
            <VaultWithdraw
                mainAsset={mainAsset}
                vault={vault}
                balanceMainAsset={BigInt(vault.balance || '0')}
                mainAssetScaledQtyNum={scaledQtyNum}
                mainAssetBalanceDisplayString={balDisplayString}
                onClose={handleModalClose}
                strategy={strategy}
            />
        );
    function navigateExternal(): void {
        const goToExternal = (url: string) => window.open(url, '_blank');
        const destination = `https://app.tempestfinance.xyz/vaults/${tempestApiNetworkName}/${vault.address}`;
        goToExternal(destination);
    }

    return (
        <>
            <div id={idForDOM} className={styles.mainContainer}>
                <div className={styles.contentColumn}>
                    <div className={styles.mainContent}>
                        {tokenIconsDisplay}
                        <p
                            className={styles.poolName}
                            onClick={() => navigateExternal()}
                        >
                            <span>
                                {mainAsset.symbol} / {secondaryAsset.symbol}
                            </span>
                            <RiExternalLinkLine size={20} />
                        </p>
                        <p className={styles.tvlDisplay}>
                            {vault.tvlUsd === undefined
                                ? '...'
                                : formatDollarAmount(parseFloat(vault.tvlUsd))}
                        </p>
                        <p
                            className={`${styles.depositContainer} ${!isUserConnected && styles.hideDepositOnMobile}`}
                        >
                            {depositsDisplay}
                        </p>

                        <p
                            className={`${styles.aprDisplay} ${!isUserConnected && styles.showAprOnMobile}`}
                            style={{
                                color: isAprUnknown
                                    ? 'var(--text1'
                                    : 'var(--other-green',
                                paddingRight: isAprUnknown ? '0.5rem' : '',
                            }}
                        >
                            {formattedAPR}
                            {!isAprUnknown &&
                                (isUserConnected || !showPhoneVersion) && (
                                    <TooltipComponent
                                        placement='top-end'
                                        title='APR estimates provided by vault provider.'
                                    />
                                )}
                        </p>
                        <div className={styles.actionButtonContainer}>
                            <button
                                className={`${styles.actionButton} ${!isUserConnected ? styles.disabledButton : ''}`}
                                onClick={handleOpenDepositModal}
                            >
                                Deposit
                            </button>

                            {isUserConnected && !!vault.balance && (
                                <button
                                    className={styles.actionButton}
                                    onClick={handleOpenWithdrawModal}
                                >
                                    Withdraw
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {isOpen && modalToOpen}
        </>
    );
}
