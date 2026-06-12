import { useAppKitProvider } from '@reown/appkit/react';
import { ethers } from 'ethers';
import { useContext } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { getBlockExplorerUrl } from '../../../../../ambient-utils/dataLayer';
import { AppStateContext } from '../../../../../contexts/AppStateContext';
import Button from '../../../../Form/Button';
import addTokenToWallet from './addTokenToWallet';
import styles from './TransactionSubmitted.module.css';

interface PropsIF {
    type:
        | 'Swap'
        | 'Limit'
        | 'Range'
        | 'Reposition'
        | 'Remove'
        | 'Harvest'
        | 'Claim'
        | 'Reset';
    hash: string;

    chainId: string | number;
    isConfirmed: boolean;
    isTransactionFailed: boolean;
    noAnimation?: boolean;
    importTokenSymbol: string;
    importTokenAddress: string;
    importTokenDecimals: number;
    importTokenImage: string;
}

export default function TransactionSubmitted(props: PropsIF) {
    const {
        type,
        hash,
        noAnimation,
        isConfirmed,
        isTransactionFailed,
        importTokenSymbol,
        importTokenAddress,
        importTokenDecimals,
        importTokenImage,
    } = props;

    const {
        activeNetwork: {
            chainSpecForAppKit: { nativeCurrency },
            chainId,
        },
    } = useContext(AppStateContext);

    const blockExplorer = getBlockExplorerUrl(chainId);
    const txUrlOnBlockExplorer = `${blockExplorer}tx/${hash}`;
    const currentLocation = useLocation()?.pathname;

    const { walletProvider } = useAppKitProvider('eip155');
    const handleAddToMetaMask = async () => {
        await addTokenToWallet(
            importTokenAddress,
            importTokenSymbol,
            importTokenDecimals,
            importTokenImage,
            walletProvider as ethers.Eip1193Provider,
        );
    };

    const addToMetaMaskButton = (
        <Button
            idForDOM='import_token_B_into_wallet_button'
            flat
            title={`Import ${importTokenSymbol} into Connected Wallet`}
            action={handleAddToMetaMask}
            disabled={false}
        />
    );

    const etherscanButton = (
        <a
            href={txUrlOnBlockExplorer}
            target='_blank'
            rel='noreferrer'
            className={styles.view_etherscan}
            aria-label='view on block explorer'
            style={{ color: 'var(--text1)' }}
        >
            View on Block Explorer
            <FiExternalLink size={18} color='var(--text1)' />
        </a>
    );
    return (
        <div
            className={`${styles.transaction_submitted} ${
                noAnimation && styles.noAnimation_submitted
            }`}
        >
            <h2 style={{ marginBottom: '15px' }}>
                {type === 'Limit'
                    ? `Limit Order ${
                          isTransactionFailed
                              ? 'Failed'
                              : isConfirmed
                                ? 'Success!'
                                : 'Submitted'
                      }`
                    : type === 'Range'
                      ? `Pool ${
                            isTransactionFailed
                                ? 'Failed'
                                : isConfirmed
                                  ? 'Success!'
                                  : 'Submitted'
                        }`
                      : type === 'Reposition'
                        ? `Reposition ${
                              isTransactionFailed
                                  ? 'Failed'
                                  : isConfirmed
                                    ? 'Success!'
                                    : 'Submitted'
                          }`
                        : type === 'Harvest'
                          ? `Harvest ${
                                isTransactionFailed
                                    ? 'Failed'
                                    : isConfirmed
                                      ? 'Success!'
                                      : 'Submitted'
                            }`
                          : type === 'Reset'
                            ? `Reset ${
                                  isTransactionFailed
                                      ? 'Failed'
                                      : isConfirmed
                                        ? 'Success!'
                                        : 'Submitted'
                              }`
                            : type === 'Remove'
                              ? `Removal ${
                                    isTransactionFailed
                                        ? 'Failed'
                                        : isConfirmed
                                          ? 'Success!'
                                          : 'Submitted'
                                }`
                              : type === 'Claim'
                                ? `Claim ${
                                      isTransactionFailed
                                          ? 'Failed'
                                          : isConfirmed
                                            ? 'Success!'
                                            : 'Submitted'
                                  }`
                                : `Swap ${
                                      isTransactionFailed
                                          ? 'Failed'
                                          : isConfirmed
                                            ? 'Success!'
                                            : 'Submitted'
                                  }`}
            </h2>
            <div
                className={`${styles.action_buttons} ${
                    noAnimation && styles.bypass_buttons
                }`}
            >
                {txUrlOnBlockExplorer && etherscanButton}
                {importTokenSymbol.toLowerCase() ===
                    nativeCurrency.symbol.toLowerCase() ||
                currentLocation === '/trade/pool'
                    ? null
                    : addToMetaMaskButton}
            </div>
        </div>
    );
}
