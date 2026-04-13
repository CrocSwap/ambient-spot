import {
    ChangeEvent,
    Dispatch,
    memo,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { RiArrowDownSLine } from 'react-icons/ri';

import { Link, useLocation } from 'react-router-dom';
import { uriToHttp } from '../../ambient-utils/dataLayer';
import { TokenIF } from '../../ambient-utils/types';
import { AppStateContext } from '../../contexts';
import { TradeDataContext } from '../../contexts/TradeDataContext';
import { linkGenMethodsIF, useLinkGen } from '../../utils/hooks/useLinkGen';
import { useModal } from '../Global/Modal/useModal';
import Spinner from '../Global/Spinner/Spinner';
import { DefaultTooltip } from '../Global/StyledTooltip/StyledTooltip';
import TokenIcon from '../Global/TokenIcon/TokenIcon';
import { SoloTokenSelect } from '../Global/TokenSelectContainer/SoloTokenSelect';
import { SoloTokenSelectModal } from '../Global/TokenSelectContainer/SoloTokenSelectModal';
import styles from './TokenInputQuantity.module.css';

interface propsIF {
    tokenAorB: 'A' | 'B' | null;
    token: TokenIF;
    value: string;
    handleTokenInputEvent: (val: string) => void;
    isPoolInitialized?: boolean;
    reverseTokens?: () => void;
    fieldId?: string;
    isLoading?: boolean;
    label?: string;
    includeWallet?: React.ReactNode;
    showPulseAnimation?: boolean;
    disable?: boolean;
    disabledContent?: React.ReactNode;
    setTokenModalOpen?: Dispatch<SetStateAction<boolean>>;
    onInitPage?: boolean;
    customBorderRadius?: string;
    noModals?: boolean;
    usdValue?: string | undefined;
    walletBalance?: string;
    handleBalanceClick?: () => void;
    percentDiffUsdValue?: number | undefined;
}

function TokenInputQuantity(props: propsIF) {
    const {
        fieldId,
        tokenAorB,
        token,
        value,
        isLoading,
        isPoolInitialized = true,
        label,
        includeWallet,
        showPulseAnimation,
        disable,
        disabledContent,
        handleTokenInputEvent,
        reverseTokens,
        setTokenModalOpen = () => null,
        customBorderRadius,
        noModals,
    } = props;

    const location = useLocation();

    const { tokenA, tokenB } = useContext(TradeDataContext);
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);

    const linkGenInitPool: linkGenMethodsIF = useLinkGen('initpool');

    const [isTokenSelectOpen, openTokenSelect, closeTokenSelect] = useModal();

    const onInitPage = location.pathname.startsWith('/initpool');

    // needed to not dismiss exchangebalance modal when closing the token select modal
    useEffect(() => {
        setTokenModalOpen(isTokenSelectOpen);
    }, [isTokenSelectOpen]);

    const [showSoloSelectTokenButtons, setShowSoloSelectTokenButtons] =
        useState(true);

    const [displayValue, setDisplayValue] = useState<string>('');
    // trigger useEffect to update display value if the parsed value is the same as existing (12 -> 0000012 -> 12)
    useEffect(() => {
        if (isLoading) {
            setDisplayValue('');
        } else {
            setDisplayValue(value);
        }
    }, [value, isLoading]);

    const precisionOfInput = (inputString: string) => {
        if (inputString.includes('.')) {
            return inputString.split('.')[1].length;
        }
        return 0;
    };

    const onChange = (event: ChangeEvent<HTMLInputElement>) => {
        let inputStringNoCommas = event.target.value
            .replace(/,/g, '.') // Replace commas with dots
            .replace(/\s+/g, ''); // Remove any spaces

        if (inputStringNoCommas === '.') {
            inputStringNoCommas = '0.';
        } else if (inputStringNoCommas === 'e') {
            inputStringNoCommas = '1e';
        } else if (inputStringNoCommas.startsWith('e')) {
            return;
        }

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
            setDisplayValue(inputStringNoCommas);
        }
    };

    const tokenSymbol =
        token?.symbol?.length > 4 ? (
            <DefaultTooltip
                title={token.symbol}
                placement={'top'}
                arrow
                enterDelay={700}
                leaveDelay={200}
            >
                <>{token.symbol}</>
            </DefaultTooltip>
        ) : (
            <>{token.symbol}</>
        );

    const tokenSelectRef = useRef(null);

    const poolNotInitializedContent = tokenSelectRef.current && (
        <div className={styles.inputDisabledText}>
            This pool has not been initialized.
            <span className={styles.text} style={{ color: 'var(--accent1)' }}>
                <Link
                    to={linkGenInitPool.getFullURL({
                        chain: chainId,
                        tokenA: tokenA.address,
                        tokenB: tokenB.address,
                    })}
                >
                    Click here to initialize the pool
                </Link>
            </span>
        </div>
    );

    const input = (
        <input
            className={styles.tokenQuantityInput}
            id={fieldId ? `${fieldId}_qty` : undefined}
            placeholder={isLoading ? '' : '0.0'}
            onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event)}
            value={displayValue}
            type='string'
            step='any'
            inputMode='decimal'
            autoComplete='off'
            autoCorrect='off'
            min='0'
            minLength={1}
            disabled={disable}
        />
    );

    const isInit = location.pathname.startsWith('/initpool');

    const modalOrNoModal = !setTokenModalOpen ? null : isInit ? (
        <SoloTokenSelect
            onClose={closeTokenSelect}
            showSoloSelectTokenButtons={showSoloSelectTokenButtons}
            setShowSoloSelectTokenButtons={setShowSoloSelectTokenButtons}
            isSingleToken={!tokenAorB}
            tokenAorB={tokenAorB}
            reverseTokens={reverseTokens}
        />
    ) : (
        <SoloTokenSelectModal
            onClose={closeTokenSelect}
            showSoloSelectTokenButtons={showSoloSelectTokenButtons}
            setShowSoloSelectTokenButtons={setShowSoloSelectTokenButtons}
            isSingleToken={!tokenAorB}
            tokenAorB={tokenAorB}
            reverseTokens={reverseTokens}
        />
    );
    const inputDisplay =
        isLoading && isPoolInitialized ? (
            <div
                className={`${styles.flexContainer}`}
                style={{ width: '100%', height: '100%' }}
            >
                <Spinner size={24} bg='var(--dark2)' weight={2} />
            </div>
        ) : !isPoolInitialized &&
          fieldId !== 'exchangeBalance' &&
          !onInitPage ? (
            poolNotInitializedContent
        ) : disabledContent !== undefined ? (
            disabledContent
        ) : (
            input
        );

    const tokenSelectButton = (
        <button
            className={`${styles.tokenSelectButton} ${
                noModals ? styles.justDisplay : ''
            } ${showPulseAnimation && styles.pulseAnimation}`}
            id={fieldId ? `${fieldId}_token_selector` : undefined}
            onClick={noModals ? undefined : openTokenSelect}
            tabIndex={0}
            aria-label='Open swap sell token modal.'
            ref={tokenSelectRef}
            style={{
                borderRadius: customBorderRadius ? customBorderRadius : '50px',
            }}
        >
            <TokenIcon
                token={token}
                src={uriToHttp(token.logoURI)}
                alt={token.symbol}
                size='2xl'
            />
            {tokenSymbol}
            {!noModals && <RiArrowDownSLine size={27} />}
        </button>
    );

    return (
        <div
            className={styles.flexContainer}
            id={fieldId}
            style={{
                borderRadius: customBorderRadius ? customBorderRadius : '1rem',
                minHeight: '81px',
            }}
        >
            {label && <span className={styles.text}>{label}</span>}
            <div
                className={styles.tokenQuantityContainer}
                style={{ marginBottom: !includeWallet ? '8px' : '0' }}
            >
                {inputDisplay}
                {tokenSelectButton}
            </div>
            {includeWallet && includeWallet}
            {isTokenSelectOpen && !noModals && modalOrNoModal}
        </div>
    );
}

export default memo(TokenInputQuantity);
