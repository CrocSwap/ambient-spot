import { toDisplayQty } from '@crocswap-libs/sdk';
import { ethers } from 'ethers';
import {
    ChangeEvent,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { FaGasPump } from 'react-icons/fa';
import {
    GAS_DROPS_ESTIMATE_VAULT_DEPOSIT,
    NUM_GWEI_IN_WEI,
    VAULT_TX_L1_DATA_FEE_ESTIMATE,
} from '../../../../../ambient-utils/constants';
import {
    getFormattedNumber,
    precisionOfInput,
    uriToHttp,
    waitForTransaction,
} from '../../../../../ambient-utils/dataLayer';
import {
    TokenIF,
    VaultIF,
    VaultStrategy,
} from '../../../../../ambient-utils/types';
import { useApprove } from '../../../../../App/functions/approve';
import Button from '../../../../../components/Form/Button';
import WalletBalanceSubinfo from '../../../../../components/Form/WalletBalanceSubinfo';
import Modal from '../../../../../components/Global/Modal/Modal';
import ModalHeader from '../../../../../components/Global/ModalHeader/ModalHeader';
import { DefaultTooltip } from '../../../../../components/Global/StyledTooltip/StyledTooltip';
import TokenIcon from '../../../../../components/Global/TokenIcon/TokenIcon';
import {
    AppStateContext,
    CachedDataContext,
    ChainDataContext,
    CrocEnvContext,
    ReceiptContext,
    UserDataContext,
} from '../../../../../contexts';
import styles from './VaultDeposit.module.css';

interface Props {
    mainAsset: TokenIF;
    secondaryAsset: TokenIF;
    vault: VaultIF;
    onClose: () => void;
    strategy: VaultStrategy;
}
export default function VaultDeposit(props: Props) {
    const { mainAsset, secondaryAsset, onClose, vault, strategy } = props;
    const { approveVault, isApprovalPending } = useApprove();
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [showSubmitted, setShowSubmitted] = useState(false);
    const [depositGasPriceinDollars, setDepositGasPriceinDollars] = useState<
        string | undefined
    >();
    const [displayValue, setDisplayValue] = useState<string>('');
    const [depositBigint, setDepositBigint] = useState<bigint | undefined>();
    const [mainAssetPrice, setMainAssetPrice] = useState<number | undefined>();
    const [mainAssetBalanceBigint, setMainAssetBalanceBigint] = useState<
        bigint | undefined
    >();
    const [mainAssetBalance, setMainAssetBalance] = useState<
        string | undefined
    >();
    const [minDepositBigint, setMinDepositBigint] = useState<
        bigint | undefined
    >();
    const [mainAssetApprovalBigint, setMainAssetApprovalBigint] = useState<
        bigint | undefined
    >();
    const { sessionReceipts } = useContext(ReceiptContext);

    const {
        addPendingTx,
        addReceipt,
        addTransactionByType,
        removePendingTx,
        updateTransactionHash,
    } = useContext(ReceiptContext);
    const { isUserConnected } = useContext(UserDataContext);
    const { gasPriceInGwei, nativeTokenUsdPrice, isActiveNetworkPlume } =
        useContext(ChainDataContext);
    const { crocEnv, provider } = useContext(CrocEnvContext);
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);
    const { userAddress } = useContext(UserDataContext);
    const { cachedFetchTokenPrice } = useContext(CachedDataContext);

    const depositGreaterOrEqualToMinimum = useMemo(
        () =>
            depositBigint !== undefined &&
            minDepositBigint !== undefined &&
            depositBigint >= minDepositBigint,
        [minDepositBigint, depositBigint],
    );

    const depositGreaterThanWalletBalance = useMemo(
        () =>
            depositBigint !== undefined &&
            mainAssetBalanceBigint !== undefined &&
            depositBigint > mainAssetBalanceBigint,
        [mainAssetBalanceBigint, depositBigint],
    );

    const depositGreaterThanWalletAllowance = useMemo(
        () =>
            depositBigint !== undefined &&
            mainAssetApprovalBigint !== undefined &&
            depositBigint > mainAssetApprovalBigint,
        [mainAssetApprovalBigint, depositBigint],
    );

    // calculate price of gas for vault deposit
    useEffect(() => {
        (async () => {
            const mainAssetPrice =
                (await cachedFetchTokenPrice(mainAsset.address, chainId))
                    ?.usdPrice || 0.0;

            setMainAssetPrice(mainAssetPrice);
        })();
    }, [mainAsset.address, chainId]);

    // calculate price of gas for vault deposit
    useEffect(() => {
        if (crocEnv) {
            if (!userAddress) {
                setMainAssetBalance(undefined);
            } else {
                (async () => {
                    crocEnv
                        .token(mainAsset.address)
                        .wallet(userAddress)
                        .then((bal: bigint) => {
                            setMainAssetBalanceBigint(bal);
                            const displayBalance = toDisplayQty(
                                bal,
                                mainAsset.decimals,
                            );
                            setMainAssetBalance(displayBalance);
                        })
                        .catch(console.error);
                    crocEnv
                        .tempestVault(vault.address, vault.mainAsset, strategy)
                        .minDeposit()
                        .then((min: bigint) => {
                            setMinDepositBigint(min);
                        })
                        .catch(console.error);
                    crocEnv
                        .tempestVault(vault.address, vault.mainAsset, strategy)
                        .allowance(userAddress)
                        .then((allowance: bigint) => {
                            setMainAssetApprovalBigint(allowance);
                        })
                        .catch(console.error);
                })();
            }
        }
    }, [crocEnv, userAddress, vault, sessionReceipts.length]);

    // calculate price of gas for vault deposit
    useEffect(() => {
        if (gasPriceInGwei && nativeTokenUsdPrice) {
            const gasPriceInDollarsNum =
                gasPriceInGwei *
                Number(NUM_GWEI_IN_WEI) *
                nativeTokenUsdPrice *
                Number(GAS_DROPS_ESTIMATE_VAULT_DEPOSIT);
            setDepositGasPriceinDollars(
                getFormattedNumber({
                    value: gasPriceInDollarsNum + VAULT_TX_L1_DATA_FEE_ESTIMATE,
                    isUSD: true,
                }),
            );
        }
    }, [gasPriceInGwei, nativeTokenUsdPrice]);

    const submitDeposit = async () => {
        if (!crocEnv || !userAddress || !vault || !depositBigint) return;
        setShowSubmitted(true);

        const tx = await crocEnv
            .tempestVault(vault.address, vault.mainAsset, strategy)
            .depositZap(depositBigint)
            .catch(console.error);

        if (tx?.hash) {
            addPendingTx(tx?.hash);
            addTransactionByType({
                chainId: chainId,
                userAddress: userAddress || '',
                txHash: tx.hash,
                txType: 'Deposit',
                txDescription: `Deposit of ${mainAsset.symbol}`,
            });
        } else {
            setShowSubmitted(false);
        }

        if (tx) {
            let receipt;
            try {
                receipt = await waitForTransaction(
                    provider,
                    tx.hash,
                    removePendingTx,
                    addPendingTx,
                    updateTransactionHash,
                );
            } catch (e) {
                setShowSubmitted(false);
                console.error({ e });
            }

            if (receipt) {
                addReceipt(receipt);
                removePendingTx(receipt.hash);
                setShowSubmitted(false);
            }
        }
    };

    const usdValueForDom =
        mainAssetPrice && parseFloat(displayValue) > 0
            ? getFormattedNumber({
                  value: mainAssetPrice * parseFloat(displayValue),
                  prefix: '$',
              })
            : '';

    const walletBalanceDisplay = mainAssetBalance ? mainAssetBalance : '...';

    const balanceToDisplay = getFormattedNumber({
        value: parseFloat(walletBalanceDisplay) ?? undefined,
    });

    const walletContent = (
        <>
            <WalletBalanceSubinfo
                usdValueForDom={usdValueForDom ?? '…'}
                percentDiffUsdValue={123}
                showWallet={isUserConnected}
                isWithdraw={false}
                balance={balanceToDisplay}
                availableBalance={mainAssetBalanceBigint}
                useExchangeBalance={
                    // isDexSelected &&
                    // !!tokenDexBalance &&
                    // parseFloat(tokenDexBalance) > 0
                    false
                }
                isDexSelected={false}
                onToggleDex={() => console.log('handleToggleDex')}
                onMaxButtonClick={() =>
                    handleTokenInputEvent(walletBalanceDisplay)
                }
            />
        </>
    );
    const handleTokenInputEvent = (input: string) => {
        setDisplayValue(input);
        if (input === '') {
            setDepositBigint(undefined);
            return;
        }
        const inputBigint = BigInt(
            parseFloat(input) * 10 ** mainAsset.decimals,
        );
        setDepositBigint(inputBigint);
    };
    const token = mainAsset;

    const fieldId = 'vault_deposit_input';
    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        let inputStringNoCommas = event.target.value
            .replace(/,/g, '.') // Replace commas with dots
            .replace(/\s+/g, ''); // Remove any spaces

        if (inputStringNoCommas === '.') inputStringNoCommas = '0.';

        const inputStringNoUnfinishedExponent = isNaN(+inputStringNoCommas)
            ? inputStringNoCommas.replace(
                  /e[+-]?(?!\d)/gi, // Match 'e', 'e-' or 'e+' only if NOT followed by a number
                  '',
              )
            : inputStringNoCommas;

        const isPrecisionGreaterThanDecimals =
            precisionOfInput(inputStringNoCommas) > token.decimals;

        if (
            !isPrecisionGreaterThanDecimals &&
            !isNaN(+inputStringNoUnfinishedExponent)
        ) {
            handleTokenInputEvent(inputStringNoCommas);
        }
    };

    const input = (
        <input
            className={styles.tokenQuantityInput}
            id={fieldId ? `${fieldId}_qty` : undefined}
            placeholder={showConfirmation ? displayValue : '0.0'}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event)}
            value={displayValue}
            type='string'
            step='any'
            inputMode='decimal'
            autoComplete='off'
            autoCorrect='off'
            min='0'
            minLength={1}
            disabled={showConfirmation}
        />
    );

    const tokenSymbol =
        token?.symbol?.length > 4 ? (
            <DefaultTooltip
                title={token.symbol}
                placement={'top'}
                arrow
                enterDelay={700}
                leaveDelay={200}
            >
                <span>{token.symbol}</span>
            </DefaultTooltip>
        ) : (
            <>{token.symbol}</>
        );

    const tokenSelectRef = useRef(null);

    const tokenSelectButton = (
        <button
            className={`${styles.tokenSelectButton} ${styles.justDisplay}
            }`}
            id={fieldId ? `${fieldId}_token_selector` : undefined}
            onClick={undefined}
            tabIndex={0}
            aria-label='Open swap sell token modal.'
            ref={tokenSelectRef}
            style={{
                borderRadius: '50px',
            }}
        >
            <TokenIcon
                token={token}
                src={uriToHttp(token.logoURI)}
                alt={token.symbol}
                size='2xl'
            />
            {tokenSymbol}
        </button>
    );

    // const extraInfo = [
    //     {
    //         title: 'Expected Output',
    //         tooltipTitle:
    //             'Expected Conversion Rate After Price Impact and Provider Fee',
    //         data: '...',
    //         placement: 'bottom',
    //     },
    //     {
    //         title: 'Price Impact',
    //         tooltipTitle: 'Expected Pool Price After Swap',
    //         data: '...',
    //         placement: 'bottom',
    //     },
    //     {
    //         title: 'Slippage Tolerance',
    //         tooltipTitle: 'Expected Pool Price After Swap',
    //         data: '...',
    //         placement: 'bottom',
    //     },
    //     {
    //         title: 'Liquidity Provider Fee',
    //         tooltipTitle: 'Expected Pool Price After Swap',
    //         data: '...',
    //         placement: 'bottom',
    //     },
    // ];

    // const confirmationDetails = (
    //     <div className={styles.confContainer}>

    //     <div className={styles.confDetails}>
    //         <div className={styles.confRow}>
    //             <p>Current Price</p>
    //             <p>1,690</p>
    //         </div>
    //         <div className={styles.confRow}>
    //             <p>Price Limit</p>
    //             <p>1,690</p>
    //         </div>
    //         <div className={styles.confRow}>
    //             <p>Slippage</p>
    //             <p>0.3%</p>
    //         </div>
    //         </div>

    //         <p>Output is estimated. You will swap up to 1.00ETH for USDC. You may swap less than 1.00ETH if the price moves beyond the limit shown above. You can increase the likelihood of swapping the full amound by increasing your slippage tolerance in the settings.</p>
    //     </div>
    // );
    const submittedButtonTitle = (
        <div className={styles.loading}>
            Submitting
            <span className={styles.dots}></span>
        </div>
    );

    const displayMinDeposit = minDepositBigint
        ? toDisplayQty(minDepositBigint, mainAsset.decimals)
        : '…';

    const approveButton = (
        <Button
            idForDOM='approve_vault_button'
            style={{ textTransform: 'none' }}
            title={
                !isApprovalPending
                    ? `Approve ${mainAsset.symbol} / ${secondaryAsset.symbol}`
                    : `${mainAsset.symbol} / ${secondaryAsset.symbol} Approval Pending...`
            }
            disabled={isApprovalPending}
            action={async () => {
                await approveVault(
                    vault,
                    mainAsset,
                    secondaryAsset,
                    strategy,
                    undefined,
                    isActiveNetworkPlume ? depositBigint : ethers.MaxUint256,
                    // mainAssetBalanceBigint
                    //   ? mainAssetBalanceBigint
                    //   : undefined,
                );
            }}
            flat={true}
        />
    );

    const submitButton = (
        <Button
            idForDOM='vault_deposit_submit'
            style={{ textTransform: 'none' }}
            title={
                showSubmitted
                    ? submittedButtonTitle
                    : !depositBigint
                      ? 'Enter a Deposit Quantity'
                      : !depositGreaterOrEqualToMinimum
                        ? `Minimum Deposit is ${displayMinDeposit} ${mainAsset.symbol}`
                        : depositGreaterThanWalletBalance
                          ? 'Quantity Exceeds Wallet Balance'
                          : 'Submit'
            }
            disabled={
                showSubmitted ||
                !depositGreaterOrEqualToMinimum ||
                depositGreaterThanWalletBalance
            }
            action={() => submitDeposit()}
            flat
        />
    );

    const includeWallet = true;
    return (
        <Modal usingCustomHeader onClose={onClose}>
            <ModalHeader
                onClose={onClose}
                title={'Deposit'}
                onBackButton={() => setShowConfirmation(false)}
                showBackButton={showConfirmation}
            />
            <div className={styles.container}>
                <p
                    className={styles.disclaimer}
                >{`This deposit function uses "Zap Mode" to convert ${props.mainAsset.symbol} deposit into vault position which holds both ${props.mainAsset.symbol} and ${props.secondaryAsset.symbol}. The value of a vault deposit will fluctuate with the value of both these tokens and their exchange rate.`}</p>
                <div className={styles.content}>
                    <div
                        className={styles.tokenQuantityContainer}
                        style={{ marginBottom: !includeWallet ? '8px' : '0' }}
                    >
                        {input}
                        {tokenSelectButton}
                    </div>
                    {includeWallet && !showConfirmation && walletContent}
                </div>

                <div className={styles.gas_row}>
                    <FaGasPump size={15} /> {depositGasPriceinDollars ?? '…'}
                </div>

                <div className={styles.buttonContainer}>
                    {depositGreaterThanWalletAllowance
                        ? approveButton
                        : submitButton}
                </div>
            </div>
        </Modal>
    );
}
