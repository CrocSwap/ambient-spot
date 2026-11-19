import { useContext, useEffect, useMemo, useRef, useState } from 'react';

import InitPoolExtraInfo from '../../../components/InitPool/InitPoolExtraInfo/InitPoolExtraInfo';

import { ChainDataContext } from '../../../contexts/ChainDataContext';
import { CrocEnvContext } from '../../../contexts/CrocEnvContext';
import { linkGenMethodsIF, useLinkGen } from '../../../utils/hooks/useLinkGen';

import InitPoolTokenSelect from '../../../components/Global/InitPoolTokenSelect/InitPoolTokenSelect';
import { CachedDataContext } from '../../../contexts/CachedDataContext';

import { FiExternalLink, FiRefreshCw } from 'react-icons/fi';
import { LuPencil } from 'react-icons/lu';
import { useSendInit } from '../../../App/hooks/useSendInit';
import Toggle from '../../../components/Form/Toggle';
import RangeBounds from '../../../components/Global/RangeBounds/RangeBounds';
import { TextOnlyTooltip } from '../../../components/Global/StyledTooltip/StyledTooltip';
import { PoolContext } from '../../../contexts/PoolContext';
import { TokenContext } from '../../../contexts/TokenContext';
import { FlexContainer, Text } from '../../../styled/Common';
import { useUrlParams } from '../../../utils/hooks/useUrlParams';

import MultiContentComponent from '../../../components/Global/MultiStepTransaction/MultiContentComponent';
import Spinner from '../../../components/Global/Spinner/Spinner';
import { WarningBox } from '../../../components/RangeActionModal/WarningBox/WarningBox';
import AdvancedModeToggle from '../../../components/Trade/Range/AdvancedModeToggle/AdvancedModeToggle';
import { UserPreferenceContext } from '../../../contexts/UserPreferenceContext';
import InitConfirmation from './InitConfirmation';
import InitSkeleton from './InitSkeleton';

import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { useCreateRangePosition } from '../../../App/hooks/useCreateRangePosition';
import {
    exponentialNumRegEx,
    getFormattedNumber,
    getMoneynessRank,
    getPinnedPriceValuesFromDisplayPrices,
    getPinnedPriceValuesFromTicks,
    getUnicodeCharacter,
    roundDownTick,
    roundUpTick,
    truncateDecimals,
    waitForTransaction,
} from '../../../ambient-utils/dataLayer';
import RangeTokenInput from '../../../components/Trade/Range/RangeTokenInput/RangeTokenInput';
import { CurrencyQuantityInput } from '../../../styled/Components/TradeModules';
import {
    DEFAULT_MAX_PRICE_DIFF_PERCENTAGE,
    DEFAULT_MIN_PRICE_DIFF_PERCENTAGE,
} from '../Trade/Range/Range';

import {
    concDepositSkew,
    fromDisplayPrice,
    fromDisplayQty,
} from '@crocswap-libs/sdk';

import { useHandleRangeButtonMessage } from '../../../App/hooks/useHandleRangeButtonMessage';
import Button from '../../../components/Form/Button';
import TooltipComponent from '../../../components/Global/TooltipComponent/TooltipComponent';
import { TradeTokenContext } from '../../../contexts/TradeTokenContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import { useRangeInputDisable } from '../Trade/Range/useRangeInputDisable';
import InitButton from './InitButton';

import {
    GAS_DROPS_ESTIMATE_INIT_WITH_POOL,
    GAS_DROPS_ESTIMATE_INIT_WITHOUT_POOL,
    GAS_DROPS_ESTIMATE_POOL,
    IS_LOCAL_ENV,
    NUM_GWEI_IN_WEI,
    RANGE_BUFFER_MULTIPLIER_L2,
    RANGE_BUFFER_MULTIPLIER_MAINNET,
    ZERO_ADDRESS,
} from '../../../ambient-utils/constants';
import { AppStateContext } from '../../../contexts';
import { RangeContext } from '../../../contexts/RangeContext';
import { ReceiptContext } from '../../../contexts/ReceiptContext';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { isTransactionDeniedError } from '../../../utils/TransactionError';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
// react functional component
export default function InitPool() {
    const { crocEnv, provider } = useContext(CrocEnvContext);
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);
    const { cachedFetchTokenPrice } = useContext(CachedDataContext);
    const { dexBalRange } = useContext(UserPreferenceContext);
    const { gasPriceInGwei, nativeTokenUsdPrice } =
        useContext(ChainDataContext);
    const { poolPriceDisplay } = useContext(PoolContext);

    const { tokens } = useContext(TokenContext);
    const {
        tokenABalance,
        tokenBBalance,
        tokenADexBalance,
        tokenBDexBalance,
        tokenAAllowance,
        tokenBAllowance,
        isTokenABase,
    } = useContext(TradeTokenContext);

    const {
        addPendingTx,
        addReceipt,
        addTransactionByType,
        removePendingTx,
        updateTransactionHash,
        sessionReceipts,
    } = useContext(ReceiptContext);

    const {
        advancedMode,
        advancedHighTick,
        advancedLowTick,
        setAdvancedHighTick,
        setAdvancedLowTick,
    } = useContext(RangeContext);
    const {
        tokenA,
        tokenB,
        baseToken,
        quoteToken,
        setIsTokenAPrimary,
        setPrimaryQuantity,
        isTokenAPrimary,
    } = useContext(TradeDataContext);

    useEffect(() => {
        setIsWithdrawTokenAFromDexChecked(
            fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) > 0n,
        );
    }, [tokenADexBalance]);

    useEffect(() => {
        setIsWithdrawTokenBFromDexChecked(parseFloat(tokenBDexBalance) > 0);
    }, [tokenBDexBalance]);

    const { urlParamMap } = useUrlParams(tokens, chainId, provider);

    const tknA: string = urlParamMap.get('tokenA') as string;
    const tknB: string = urlParamMap.get('tokenB') as string;

    const tradeDataMatchesURLParams =
        tknA.toLowerCase() === tokenA.address.toLowerCase() &&
        tknB.toLowerCase() === tokenB.address.toLowerCase();

    const { isUserConnected, userAddress } = useContext(UserDataContext);

    const baseTokenDexBalance = isTokenABase
        ? tokenADexBalance
        : tokenBDexBalance;
    const quoteTokenDexBalance = isTokenABase
        ? tokenBDexBalance
        : tokenADexBalance;

    const isBaseTokenMoneynessGreaterOrEqual =
        baseToken.symbol && quoteToken.symbol
            ? getMoneynessRank(baseToken.symbol) -
                  getMoneynessRank(quoteToken.symbol) >=
              0
            : false;

    const [isDenomBase, setIsDenomBase] = useState(false);
    // DO NOT combine these hooks with useMemo()
    // the useMemo() hook does NOT respect asynchronicity
    const [poolExists, setPoolExists] = useState<boolean | null>(null);

    const [activeContent, setActiveContent] = useState<string>('main');
    const [showErrorMessage, setShowErrorMessage] = useState(false);
    const [isMintLiqEnabled, setIsMintLiqEnabled] = useState(true);
    // TODO: this could probably be refacted into a useMemo
    const [isWithdrawTokenAFromDexChecked, setIsWithdrawTokenAFromDexChecked] =
        useState<boolean>(dexBalRange.drawFromDexBal.isEnabled);
    const [isWithdrawTokenBFromDexChecked, setIsWithdrawTokenBFromDexChecked] =
        useState<boolean>(dexBalRange.drawFromDexBal.isEnabled);

    const [initialPriceDisplay, setInitialPriceDisplay] = useState<string>('');

    const [initialPriceInBaseDenom, setInitialPriceInBaseDenom] = useState<
        number | undefined
    >();

    const [estimatedInitialPriceDisplay, setEstimatedInitialPriceDisplay] =
        useState<string>('2000');

    const [isAmbient, setIsAmbient] = useState(false);

    const [rangeLowBoundNonDisplayPrice, setRangeLowBoundNonDisplayPrice] =
        useState(0);
    const [rangeHighBoundNonDisplayPrice, setRangeHighBoundNonDisplayPrice] =
        useState(0);
    const [connectButtonDelayElapsed, setConnectButtonDelayElapsed] =
        useState(false);
    const [initGasPriceinDollars, setInitGasPriceinDollars] = useState<
        string | undefined
    >();

    // eslint-disable-next-line
    const [tokenModalOpen, setTokenModalOpen] = useState(false);
    // eslint-disable-next-line
    const [tokenACollateral, setTokenACollateral] = useState<string>('');
    // eslint-disable-next-line
    const [tokenBCollateral, setTokenBCollateral] = useState<string>('');

    // See Range.tsx line 81
    const [rangeWidthPercentage, setRangeWidthPercentage] =
        useState<number>(10);
    const [
        // eslint-disable-next-line
        rescaleRangeBoundariesWithSlider,
        setRescaleRangeBoundariesWithSlider,
    ] = useState(false);

    // eslint-disable-next-line
    const [pinnedDisplayPrices, setPinnedDisplayPrices] = useState<
        | {
              pinnedMinPriceDisplay: string;
              pinnedMaxPriceDisplay: string;
              pinnedMinPriceDisplayTruncated: string;
              pinnedMaxPriceDisplayTruncated: string;
              pinnedMinPriceDisplayTruncatedWithCommas: string;
              pinnedMaxPriceDisplayTruncatedWithCommas: string;
              pinnedLowTick: number;
              pinnedHighTick: number;
              pinnedMinPriceNonDisplay: number;
              pinnedMaxPriceNonDisplay: number;
          }
        | undefined
    >();
    // eslint-disable-next-line
    // eslint-disable-next-line
    const [pinnedMinPriceDisplayTruncated, setPinnedMinPriceDisplayTruncated] =
        useState('');
    // eslint-disable-next-line
    const [pinnedMaxPriceDisplayTruncated, setPinnedMaxPriceDisplayTruncated] =
        useState('');

    // Min Max Price
    const [minPriceInputString, setMinPriceInputString] = useState<string>('');
    const [maxPriceInputString, setMaxPriceInputString] = useState<string>('');
    // eslint-disable-next-line
    const [minPriceDifferencePercentage, setMinPriceDifferencePercentage] =
        useState(-10);
    // eslint-disable-next-line
    const [maxPriceDifferencePercentage, setMaxPriceDifferencePercentage] =
        useState(10);
    // eslint-disable-next-line
    const [rangeLowBoundFieldBlurred, setRangeLowBoundFieldBlurred] =
        useState(false);
    // eslint-disable-next-line
    const [rangeHighBoundFieldBlurred, setRangeHighBoundFieldBlurred] =
        useState(false);
    const [minPrice, setMinPrice] = useState(10);
    const [maxPrice, setMaxPrice] = useState(100);

    const [isLoading, setIsLoading] = useState(false);
    const [isEditEnabled, setIsEditEnabled] = useState(false);

    const gridSize = lookupChain(chainId).gridSize;

    useEffect(() => {
        setIsDenomBase(!isBaseTokenMoneynessGreaterOrEqual);
    }, [isBaseTokenMoneynessGreaterOrEqual, tokenA.address + tokenB.address]);

    const isTokenPairDefault =
        baseToken.address === ZERO_ADDRESS && quoteToken.symbol === 'USDC';

    useEffect(() => {
        // make sure crocEnv exists (needs a moment to spin up)
        if (crocEnv) {
            // check if pool exists for token addresses from URL params
            const doesPoolExist = crocEnv
                .pool(baseToken.address, quoteToken.address)
                .isInit();
            // resolve the promise
            Promise.resolve(doesPoolExist)
                // update value of poolExists, use `null` for `undefined`
                .then((res) => setPoolExists(res ?? null));
        } else {
            // set value of poolExists as null if there is no crocEnv
            // this is handled as a pre-initialization condition, not a false
            setPoolExists(null);
        }
        // re-run hook if a new crocEnv is created
        // this will happen if the user switches chains
    }, [crocEnv, sessionReceipts.length, baseToken, quoteToken]);

    useEffect(() => {
        if (rangeHighBoundFieldBlurred) {
            const rangeHighBoundDisplayField = document.getElementById(
                'max-price-input-quantity',
            ) as HTMLInputElement;

            const targetMaxValue = maxPrice;
            const targetMinValue = minPrice;

            const pinnedDisplayPrices = getPinnedPriceValuesFromDisplayPrices(
                isDenomBase,
                baseToken.decimals,
                quoteToken.decimals,
                targetMinValue?.toString() ?? '0',
                targetMaxValue?.toString() ?? '0',
                gridSize,
            );

            isDenomBase
                ? setRangeLowBoundNonDisplayPrice(
                      pinnedDisplayPrices.pinnedMinPriceNonDisplay,
                  )
                : setRangeHighBoundNonDisplayPrice(
                      pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
                  );

            isDenomBase
                ? setMinPrice(
                      parseFloat(
                          pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
                      ),
                  )
                : setMaxPrice(
                      parseFloat(
                          pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
                      ),
                  );

            isDenomBase
                ? setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick)
                : setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);

            const highGeometricDifferencePercentage = parseFloat(
                truncateDecimals(
                    (pinnedDisplayPrices.pinnedHighTick -
                        selectedPoolPriceTick) /
                        100,
                    0,
                ),
            );
            const lowGeometricDifferencePercentage = parseFloat(
                truncateDecimals(
                    (pinnedDisplayPrices.pinnedLowTick -
                        selectedPoolPriceTick) /
                        100,
                    0,
                ),
            );
            isDenomBase
                ? setMaxPriceDifferencePercentage(
                      -lowGeometricDifferencePercentage,
                  )
                : setMaxPriceDifferencePercentage(
                      highGeometricDifferencePercentage,
                  );

            setPinnedMaxPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
            );

            if (rangeHighBoundDisplayField) {
                rangeHighBoundDisplayField.value =
                    pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated;
            } else {
                IS_LOCAL_ENV && console.debug('high bound field not found');
            }

            setRangeHighBoundFieldBlurred(false);
        }
    }, [rangeHighBoundFieldBlurred]);

    useEffect(() => {
        if (rangeLowBoundFieldBlurred) {
            const rangeLowBoundDisplayField = document.getElementById(
                'min-price-input-quantity',
            ) as HTMLInputElement;

            const targetMinValue = minPrice;
            const targetMaxValue = maxPrice;

            const pinnedDisplayPrices = getPinnedPriceValuesFromDisplayPrices(
                isDenomBase,
                baseToken.decimals,
                quoteToken.decimals,
                targetMinValue?.toString() ?? '0',
                targetMaxValue?.toString() ?? '0',
                gridSize,
            );

            !isDenomBase
                ? setRangeLowBoundNonDisplayPrice(
                      pinnedDisplayPrices.pinnedMinPriceNonDisplay,
                  )
                : setRangeHighBoundNonDisplayPrice(
                      pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
                  );

            !isDenomBase
                ? setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick)
                : setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);

            !isDenomBase
                ? setMinPrice(
                      parseFloat(
                          pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
                      ),
                  )
                : setMaxPrice(
                      parseFloat(
                          pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
                      ),
                  );

            const highGeometricDifferencePercentage = parseFloat(
                truncateDecimals(
                    (pinnedDisplayPrices.pinnedHighTick -
                        selectedPoolPriceTick) /
                        100,
                    0,
                ),
            );
            const lowGeometricDifferencePercentage = parseFloat(
                truncateDecimals(
                    (pinnedDisplayPrices.pinnedLowTick -
                        selectedPoolPriceTick) /
                        100,
                    0,
                ),
            );
            isDenomBase
                ? setMinPriceDifferencePercentage(
                      -highGeometricDifferencePercentage,
                  )
                : setMinPriceDifferencePercentage(
                      lowGeometricDifferencePercentage,
                  );

            setPinnedMinPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
            );

            if (rangeLowBoundDisplayField) {
                rangeLowBoundDisplayField.value =
                    pinnedDisplayPrices.pinnedMinPriceDisplayTruncated;
            } else {
                IS_LOCAL_ENV && console.debug('low bound field not found');
            }

            setRangeLowBoundFieldBlurred(false);
        }
    }, [rangeLowBoundFieldBlurred]);

    const erc20TokenWithDexBalance = useMemo(() => {
        if (baseToken?.address !== ZERO_ADDRESS) {
            if (baseTokenDexBalance && baseTokenDexBalance !== '0.0') {
                return baseToken;
            }
        }
        if (quoteTokenDexBalance && quoteTokenDexBalance !== '0.0') {
            return quoteToken;
        }
        return undefined;
    }, [baseToken, quoteToken, baseTokenDexBalance, quoteTokenDexBalance]);

    const dexBalanceToBeRemoved = useMemo(() => {
        if (baseToken?.address === erc20TokenWithDexBalance?.address) {
            return baseTokenDexBalance;
        } else if (quoteToken?.address === erc20TokenWithDexBalance?.address) {
            return quoteTokenDexBalance;
        }
        return undefined;
    }, [
        erc20TokenWithDexBalance,
        baseToken,
        quoteToken,
        baseTokenDexBalance,
        quoteTokenDexBalance,
    ]);

    const [isReferencePriceAvailable, setIsReferencePriceAvailable] =
        useState(false);

    const refreshReferencePrice = async () => {
        if (tradeDataMatchesURLParams) {
            const basePricePromise = cachedFetchTokenPrice(
                baseToken.address,
                chainId,
            );
            const quotePricePromise = cachedFetchTokenPrice(
                quoteToken.address,
                chainId,
            );

            const basePrice = await basePricePromise;
            const quotePrice = await quotePricePromise;

            const isReferencePriceFound =
                basePrice !== undefined && quotePrice !== undefined;

            setIsReferencePriceAvailable(isReferencePriceFound);

            const baseUsdPrice = basePrice?.usdPrice || 2000;
            const quoteUsdPrice = quotePrice?.usdPrice || 1;

            const defaultPriceNumInBase = baseUsdPrice / quoteUsdPrice;

            const defaultPriceTruncated =
                defaultPriceNumInBase < 0.0001
                    ? defaultPriceNumInBase.toExponential(2)
                    : defaultPriceNumInBase < 2
                      ? defaultPriceNumInBase.toPrecision(3)
                      : defaultPriceNumInBase.toFixed(2);

            if (
                isReferencePriceFound &&
                useReferencePrice &&
                initialPriceDisplay === ''
            ) {
                setInitialPriceInBaseDenom(defaultPriceNumInBase);
            }
            if (isDenomBase) {
                setEstimatedInitialPriceDisplay(defaultPriceTruncated);
                isReferencePriceFound &&
                initialPriceDisplay === '' &&
                useReferencePrice &&
                !isTokenPairDefault
                    ? setInitialPriceDisplay(defaultPriceTruncated)
                    : !initialPriceInBaseDenom
                      ? setInitialPriceDisplay('')
                      : undefined;
            } else {
                const invertedPriceNum = 1 / defaultPriceNumInBase;

                const invertedPriceTruncated =
                    invertedPriceNum < 0.0001
                        ? invertedPriceNum.toExponential(2)
                        : invertedPriceNum < 2
                          ? invertedPriceNum.toPrecision(3)
                          : invertedPriceNum.toFixed(2);
                setEstimatedInitialPriceDisplay(invertedPriceTruncated);

                isReferencePriceFound &&
                initialPriceDisplay === '' &&
                useReferencePrice &&
                !isTokenPairDefault
                    ? setInitialPriceDisplay(invertedPriceTruncated)
                    : !initialPriceInBaseDenom
                      ? setInitialPriceDisplay('')
                      : undefined;
            }
        }
    };

    useEffect(() => {
        refreshReferencePrice();
    }, [
        baseToken,
        quoteToken,
        isDenomBase,
        isTokenPairDefault,
        tradeDataMatchesURLParams,
        initialPriceDisplay === '',
    ]);

    useEffect(() => {
        handleDisplayUpdate();
    }, [isDenomBase]);

    const selectedPoolNonDisplayPrice = useMemo(
        () =>
            fromDisplayPrice(
                isDenomBase
                    ? 1 / parseFloat(initialPriceDisplay)
                    : parseFloat(initialPriceDisplay),
                baseToken.decimals,
                quoteToken.decimals,
            ),
        [initialPriceDisplay],
    );

    const selectedPoolPriceTick =
        Math.log(selectedPoolNonDisplayPrice) / Math.log(1.0001);

    const shouldResetAdvancedLowTick =
        advancedHighTick > selectedPoolPriceTick + 100000 ||
        advancedLowTick < selectedPoolPriceTick - 100000 ||
        advancedLowTick === advancedHighTick;
    const shouldResetAdvancedHighTick =
        advancedHighTick > selectedPoolPriceTick + 100000 ||
        advancedLowTick < selectedPoolPriceTick - 100000 ||
        advancedLowTick === advancedHighTick;

    const defaultLowTick = useMemo<number>(() => {
        const value: number = shouldResetAdvancedLowTick
            ? roundDownTick(
                  selectedPoolPriceTick +
                      DEFAULT_MIN_PRICE_DIFF_PERCENTAGE * 100,
                  gridSize,
              )
            : advancedLowTick;
        return value;
    }, [advancedLowTick, selectedPoolPriceTick, shouldResetAdvancedLowTick]);

    // default high tick to seed in the DOM (range upper value)
    const defaultHighTick = useMemo<number>(() => {
        const value: number = shouldResetAdvancedHighTick
            ? roundUpTick(
                  selectedPoolPriceTick +
                      DEFAULT_MAX_PRICE_DIFF_PERCENTAGE * 100,
                  gridSize,
              )
            : advancedHighTick;
        return value;
    }, [advancedHighTick, selectedPoolPriceTick, shouldResetAdvancedHighTick]);

    const pinnedMinPriceDisplayTruncatedInBase = useMemo(
        () =>
            getPinnedPriceValuesFromTicks(
                true,
                baseToken.decimals,
                quoteToken.decimals,
                defaultLowTick,
                defaultHighTick,
                gridSize,
            ).pinnedMinPriceDisplayTruncatedWithCommas,
        [
            baseToken.decimals,
            quoteToken.decimals,
            defaultLowTick,
            defaultHighTick,
        ],
    );
    const pinnedMinPriceDisplayTruncatedInQuote = useMemo(
        () =>
            getPinnedPriceValuesFromTicks(
                false,
                baseToken.decimals,
                quoteToken.decimals,
                defaultLowTick,
                defaultHighTick,
                gridSize,
            ).pinnedMinPriceDisplayTruncatedWithCommas,
        [
            baseToken.decimals,
            quoteToken.decimals,
            defaultLowTick,
            defaultHighTick,
        ],
    );
    const pinnedMaxPriceDisplayTruncatedInBase = useMemo(
        () =>
            getPinnedPriceValuesFromTicks(
                true,
                baseToken.decimals,
                quoteToken.decimals,
                defaultLowTick,
                defaultHighTick,
                gridSize,
            ).pinnedMaxPriceDisplayTruncatedWithCommas,
        [
            baseToken.decimals,
            quoteToken.decimals,
            defaultLowTick,
            defaultHighTick,
        ],
    );
    const pinnedMaxPriceDisplayTruncatedInQuote = useMemo(
        () =>
            getPinnedPriceValuesFromTicks(
                false,
                baseToken.decimals,
                quoteToken.decimals,
                defaultLowTick,
                defaultHighTick,
                gridSize,
            ).pinnedMaxPriceDisplayTruncatedWithCommas,
        [
            baseToken.decimals,
            quoteToken.decimals,
            defaultLowTick,
            defaultHighTick,
        ],
    );

    useEffect(() => {
        if (advancedMode) {
            const pinnedDisplayPrices = getPinnedPriceValuesFromTicks(
                isDenomBase,
                baseToken.decimals,
                quoteToken.decimals,
                defaultLowTick,
                defaultHighTick,
                gridSize,
            );
            setRangeLowBoundNonDisplayPrice(
                pinnedDisplayPrices.pinnedMinPriceNonDisplay,
            );
            setRangeHighBoundNonDisplayPrice(
                pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
            );

            setPinnedMinPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
            );
            setPinnedMaxPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
            );

            setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick);
            setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);

            const highTickDiff =
                pinnedDisplayPrices.pinnedHighTick - selectedPoolPriceTick;
            const lowTickDiff =
                pinnedDisplayPrices.pinnedLowTick - selectedPoolPriceTick;

            const highGeometricDifferencePercentage =
                Math.abs(highTickDiff) < 200
                    ? parseFloat(truncateDecimals(highTickDiff / 100, 2))
                    : parseFloat(truncateDecimals(highTickDiff / 100, 0));
            const lowGeometricDifferencePercentage =
                Math.abs(lowTickDiff) < 200
                    ? parseFloat(truncateDecimals(lowTickDiff / 100, 2))
                    : parseFloat(truncateDecimals(lowTickDiff / 100, 0));
            isDenomBase
                ? setMaxPriceDifferencePercentage(
                      -lowGeometricDifferencePercentage,
                  )
                : setMaxPriceDifferencePercentage(
                      highGeometricDifferencePercentage,
                  );

            isDenomBase
                ? setMinPriceDifferencePercentage(
                      -highGeometricDifferencePercentage,
                  )
                : setMinPriceDifferencePercentage(
                      lowGeometricDifferencePercentage,
                  );

            const rangeLowBoundDisplayField = document.getElementById(
                'min-price-input-quantity',
            ) as HTMLInputElement;

            if (rangeLowBoundDisplayField) {
                rangeLowBoundDisplayField.value =
                    pinnedDisplayPrices.pinnedMinPriceDisplayTruncated;
                const rangeHighBoundDisplayField = document.getElementById(
                    'max-price-input-quantity',
                ) as HTMLInputElement;

                if (rangeHighBoundDisplayField) {
                    rangeHighBoundDisplayField.value =
                        pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated;
                }
            }

            setMaxPrice(
                parseFloat(pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated),
            );
            setMinPrice(
                parseFloat(pinnedDisplayPrices.pinnedMinPriceDisplayTruncated),
            );
        }
    }, [
        selectedPoolPriceTick,
        defaultLowTick,
        defaultHighTick,
        isDenomBase,
        baseToken.decimals,
        quoteToken.decimals,
        advancedMode,
    ]);

    const handleDisplayUpdate = () => {
        if (initialPriceDisplay) {
            if (isDenomBase) {
                setInitialPriceDisplay(
                    initialPriceInBaseDenom?.toString() ?? '',
                );
            } else {
                const invertedPriceNum = 1 / (initialPriceInBaseDenom ?? 1);

                const invertedPriceTruncated =
                    invertedPriceNum < 0.0001
                        ? invertedPriceNum.toExponential(2)
                        : invertedPriceNum < 2
                          ? invertedPriceNum.toPrecision(3)
                          : invertedPriceNum.toFixed(2);
                setInitialPriceDisplay(invertedPriceTruncated);
            }
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            setConnectButtonDelayElapsed(true);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const [
        amountToReduceNativeTokenQtyMainnet,
        setAmountToReduceNativeTokenQtyMainnet,
    ] = useState<number>(0.01);
    const [amountToReduceNativeTokenQtyL2, setAmountToReduceNativeTokenQtyL2] =
        useState<number>(0.0007);

    const amountToReduceNativeTokenQty =
        chainId === '0x82750' || chainId === '0x8274f'
            ? amountToReduceNativeTokenQtyL2
            : amountToReduceNativeTokenQtyMainnet;

    const activeRangeTxHash = useRef<string>('none');

    // reset activeTxHash when the pair changes or user updates quantity
    useEffect(() => {
        activeRangeTxHash.current = '';
    }, [tokenA.address + tokenB.address]);

    // calculate price of gas for pool init
    useEffect(() => {
        if (gasPriceInGwei && nativeTokenUsdPrice) {
            const gasDropsEstimateInit = isMintLiqEnabled
                ? GAS_DROPS_ESTIMATE_INIT_WITH_POOL
                : GAS_DROPS_ESTIMATE_INIT_WITHOUT_POOL;

            const costOfMainnetPoolInETH =
                gasPriceInGwei * GAS_DROPS_ESTIMATE_POOL * NUM_GWEI_IN_WEI;

            setAmountToReduceNativeTokenQtyMainnet(
                costOfMainnetPoolInETH * RANGE_BUFFER_MULTIPLIER_MAINNET,
            );

            const costOfScrollPoolInETH =
                gasPriceInGwei * GAS_DROPS_ESTIMATE_POOL * NUM_GWEI_IN_WEI;

            setAmountToReduceNativeTokenQtyL2(
                costOfScrollPoolInETH * RANGE_BUFFER_MULTIPLIER_L2,
            );

            const gasPriceInDollarsNum =
                gasPriceInGwei *
                gasDropsEstimateInit *
                NUM_GWEI_IN_WEI *
                nativeTokenUsdPrice;

            setInitGasPriceinDollars(
                getFormattedNumber({
                    value: gasPriceInDollarsNum,
                    isUSD: true,
                }),
            );
        }
    }, [gasPriceInGwei, nativeTokenUsdPrice, isMintLiqEnabled]);

    const { isTokenAInputDisabled, isTokenBInputDisabled } =
        useRangeInputDisable(
            isAmbient,
            isTokenABase,
            selectedPoolPriceTick, // Took place of: selectedPoolPriceTick,
            defaultLowTick,
            defaultHighTick,
            isDenomBase,
            isMintLiqEnabled,
        );

    const tokenASurplusMinusTokenARemainderNum =
        fromDisplayQty(tokenADexBalance || '0', tokenA.decimals) -
        fromDisplayQty(tokenACollateral || '0', tokenA.decimals);
    const tokenBSurplusMinusTokenBRemainderNum =
        fromDisplayQty(tokenBDexBalance || '0', tokenB.decimals) -
        fromDisplayQty(tokenBCollateral || '0', tokenB.decimals);
    const tokenAQtyCoveredByWalletBalance = isWithdrawTokenAFromDexChecked
        ? tokenASurplusMinusTokenARemainderNum < 0 && !isTokenAInputDisabled
            ? tokenASurplusMinusTokenARemainderNum * -1n
            : 0n
        : !isTokenAInputDisabled
          ? fromDisplayQty(tokenACollateral || '0', tokenA.decimals)
          : 0n;

    const tokenBQtyCoveredByWalletBalance = isWithdrawTokenBFromDexChecked
        ? tokenBSurplusMinusTokenBRemainderNum < 0 && !isTokenBInputDisabled
            ? tokenBSurplusMinusTokenBRemainderNum * -1n
            : 0n
        : !isTokenBInputDisabled
          ? fromDisplayQty(tokenBCollateral || '0', tokenB.decimals)
          : 0n;

    // if liquidity miniting is enabled, then token allowance must be greater than the amount of tokens the user is depositing,
    // plus a small amount for the initialization transactions
    // if liquidity minting is disabled, then token allowance must be greater than 0.1 of the token
    const isTokenAAllowanceSufficient =
        tokenAAllowance === undefined
            ? true
            : isMintLiqEnabled && !isTokenAInputDisabled
              ? tokenAAllowance > tokenAQtyCoveredByWalletBalance
              : tokenAAllowance >= fromDisplayQty('0.1', tokenA.decimals);

    const isTokenBAllowanceSufficient =
        tokenBAllowance === undefined
            ? true
            : isMintLiqEnabled && !isTokenBInputDisabled
              ? tokenBAllowance > tokenBQtyCoveredByWalletBalance
              : tokenBAllowance >= fromDisplayQty('0.1', tokenB.decimals);

    const focusInput = () => {
        const inputField = document.getElementById(
            'initial-pool-price-quantity',
        ) as HTMLInputElement;

        const timer = setTimeout(() => {
            inputField.focus();
        }, 500);
        return () => clearTimeout(timer);
    };

    // hooks to generate navigation actions with pre-loaded paths
    const linkGenPool: linkGenMethodsIF = useLinkGen('pool');
    const linkGenInit: linkGenMethodsIF = useLinkGen('initpool');

    const handleNavigation = () =>
        linkGenPool.navigate({
            chain: chainId,
            tokenA: tokenA.address,
            tokenB: tokenB.address,
        });

    const placeholderText = `e.g. ${estimatedInitialPriceDisplay} (${
        isDenomBase ? baseToken.symbol : quoteToken.symbol
    }/${isDenomBase ? quoteToken.symbol : baseToken.symbol})`;

    const handleInitialPriceInputChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const isValid =
            event.target.value === '' ||
            event.target.value === '.' ||
            exponentialNumRegEx.test(event.target.value);
        const targetValue = event.target.value.replaceAll(',', '');
        const input = targetValue.startsWith('.')
            ? '0' + targetValue
            : targetValue;
        const targetValueNum = parseFloat(input);
        isValid && setInitialPriceDisplay(input);

        if (isValid && !isNaN(targetValueNum) && targetValueNum !== 0) {
            if (event.target.value === '') {
                setInitialPriceInBaseDenom(undefined);
            } else {
                if (isDenomBase) {
                    setInitialPriceInBaseDenom(targetValueNum);
                } else {
                    setInitialPriceInBaseDenom(1 / targetValueNum);
                }
            }
        }
    };

    // Begin Range Logic
    const { createRangePosition } = useCreateRangePosition();

    const depositSkew = useMemo(
        () =>
            concDepositSkew(
                selectedPoolNonDisplayPrice ?? 0,
                rangeLowBoundNonDisplayPrice,
                rangeHighBoundNonDisplayPrice,
            ),
        [
            selectedPoolNonDisplayPrice,
            rangeLowBoundNonDisplayPrice,
            rangeHighBoundNonDisplayPrice,
        ],
    );

    // Tick functions modified from normal range
    // default low tick to seed in the DOM (range lower value)
    // initialPriceInBaseDenom

    const [newInitTransactionHash, setNewInitTransactionHash] =
        useState<string>('');
    const [newRangeTransactionHash, setNewRangeTransactionHash] =
        useState<string>('');
    const [txError, setTxError] = useState<Error>();

    const [isInitPending, setIsInitPending] = useState(false);
    const [isTxCompletedInit, setIsTxCompletedInit] = useState(false);
    const [isTxCompletedRange, setIsTxCompletedRange] = useState(false);

    const transactionApprovedInit = newInitTransactionHash !== '';
    const transactionApprovedRange = newRangeTransactionHash !== '';
    const isTransactionDenied = isTransactionDeniedError(txError);
    const isTransactionException =
        txError !== undefined && !isTransactionDenied;

    const [activeConfirmationStep, setActiveConfirmationStep] = useState(0);

    const resetConfirmation = () => {
        setTxError(undefined);
        setNewRangeTransactionHash('');
        setNewInitTransactionHash('');
        setIsTxCompletedInit(false);
        setIsTxCompletedRange(false);
    };

    useEffect(() => {
        resetConfirmation();
        setInitialPriceDisplay('');
    }, [baseToken.address + quoteToken.address]);

    useEffect(() => {
        if (activeContent !== 'main') {
            setTokenACollateral('');
            setTokenBCollateral('');
            setActiveContent('main');
        }
    }, [tokenA.address + tokenB.address]);

    const { sendInit } = useSendInit(
        setNewInitTransactionHash,
        setIsInitPending,
        setIsTxCompletedInit,
        setTxError,
        resetConfirmation,
    );

    useEffect(() => {
        if (isTokenAInputDisabled) setIsTokenAPrimary(false);
        if (isTokenBInputDisabled) setIsTokenAPrimary(true);
    }, [isTokenAInputDisabled, isTokenBInputDisabled]);

    const isInitPage = true;

    const clearTokenInputs = () => {
        setTokenACollateral('');
        setTokenBCollateral('');
        setPrimaryQuantity('');
    };

    const {
        tokenAllowed: tokenAAllowed,
        rangeButtonErrorMessage: rangeButtonErrorMessageTokenA,
    } = useHandleRangeButtonMessage(
        tokenA,
        tokenACollateral,
        tokenABalance,
        tokenADexBalance,
        isTokenAInputDisabled,
        isWithdrawTokenAFromDexChecked,
        true, // hardcode pool initialized since we will be initializing it on confirm
        tokenAQtyCoveredByWalletBalance,
        amountToReduceNativeTokenQty,
        activeRangeTxHash,
        clearTokenInputs,
        isMintLiqEnabled,
        isInitPage,
    );
    const {
        tokenAllowed: tokenBAllowed,
        rangeButtonErrorMessage: rangeButtonErrorMessageTokenB,
    } = useHandleRangeButtonMessage(
        tokenB,
        tokenBCollateral,
        tokenBBalance,
        tokenBDexBalance,
        isTokenBInputDisabled,
        isWithdrawTokenBFromDexChecked,
        true, // hardcode pool initialized since we will be initializing it on confirm
        tokenBQtyCoveredByWalletBalance,
        amountToReduceNativeTokenQty,
        activeRangeTxHash,
        clearTokenInputs,
        isMintLiqEnabled,
        isInitPage,
    );

    // Next step - understand how sider affects these params
    const sendRangePosition = async () => {
        const params = {
            slippageTolerancePercentage: 3,
            isAmbient,
            tokenAInputQty: isTokenAInputDisabled ? '0' : tokenACollateral,
            tokenBInputQty: isTokenBInputDisabled ? '0' : tokenBCollateral,
            isWithdrawTokenAFromDexChecked,
            isWithdrawTokenBFromDexChecked,
            defaultLowTick,
            defaultHighTick,
            isAdd: false, // Always false for init
            setNewRangeTransactionHash,
            setTxError,
            resetConfirmation,
            poolPrice: selectedPoolNonDisplayPrice,
            setIsTxCompletedRange: setIsTxCompletedRange,
            activeRangeTxHash: activeRangeTxHash,
        };
        createRangePosition(params);
    };

    const sendTransaction = isMintLiqEnabled
        ? !isTxCompletedInit
            ? async () => {
                  sendInit(initialPriceInBaseDenom, sendRangePosition);
              }
            : async () => {
                  sendRangePosition();
              }
        : async () => {
              sendInit(initialPriceInBaseDenom);
          };

    const initButtonPropsIF = {
        tokenA,
        tokenB,
        tokenACollateral,
        tokenBCollateral,
        isTokenAInputDisabled,
        isWithdrawTokenAFromDexChecked,
        isMintLiqEnabled,
        tokenAAllowed,
        tokenBAllowed,
        erc20TokenWithDexBalance,
        rangeButtonErrorMessageTokenA,
        rangeButtonErrorMessageTokenB,
        setActiveContent,
        initialPriceInBaseDenom,
        sendRangePosition,
        sendInit,
        poolExists,
        isConnected: !!isUserConnected,
        connectButtonDelayElapsed,
        isTokenAAllowanceSufficient,
        isTokenBAllowanceSufficient,
        isInitPending,
        initialPriceDisplay,
        defaultLowTick,
        defaultHighTick,
        selectedPoolPriceTick,
        tokenAQtyCoveredByWalletBalance,
        tokenBQtyCoveredByWalletBalance,
        isTokenAPrimary,
        tokenABalance,
        tokenBBalance,
        tokenAAllowance,
        tokenBAllowance,
    };

    const minPriceDisplay = isAmbient ? '0' : pinnedMinPriceDisplayTruncated;
    const maxPriceDisplay = isAmbient
        ? 'Infinity'
        : pinnedMaxPriceDisplayTruncated;

    const displayPriceWithDenom =
        isDenomBase && poolPriceDisplay
            ? 1 / poolPriceDisplay
            : (poolPriceDisplay ?? 0);
    const poolPriceCharacter = isDenomBase
        ? isTokenABase
            ? getUnicodeCharacter(tokenB.symbol)
            : getUnicodeCharacter(tokenA.symbol)
        : !isTokenABase
          ? getUnicodeCharacter(tokenB.symbol)
          : getUnicodeCharacter(tokenA.symbol);

    useEffect(() => {
        if (rangeWidthPercentage === 100 && !advancedMode) {
            setIsAmbient(true);
            setRangeLowBoundNonDisplayPrice(0);
            setRangeHighBoundNonDisplayPrice(Infinity);
        } else if (advancedMode) {
            setIsAmbient(false);
        } else {
            setIsAmbient(false);
            if (Math.abs(selectedPoolPriceTick) === Infinity) return;
            const lowTick = selectedPoolPriceTick - rangeWidthPercentage * 100;
            const highTick = selectedPoolPriceTick + rangeWidthPercentage * 100;

            const pinnedDisplayPrices = getPinnedPriceValuesFromTicks(
                isDenomBase,
                baseToken.decimals,
                quoteToken.decimals,
                lowTick,
                highTick,
                gridSize,
            );

            setPinnedDisplayPrices(pinnedDisplayPrices);

            setRangeLowBoundNonDisplayPrice(
                pinnedDisplayPrices.pinnedMinPriceNonDisplay,
            );
            setRangeHighBoundNonDisplayPrice(
                pinnedDisplayPrices.pinnedMaxPriceNonDisplay,
            );

            setPinnedMinPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMinPriceDisplayTruncated,
            );
            setPinnedMaxPriceDisplayTruncated(
                pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated,
            );

            setAdvancedLowTick(pinnedDisplayPrices.pinnedLowTick);
            setAdvancedHighTick(pinnedDisplayPrices.pinnedHighTick);

            setMaxPrice(
                parseFloat(pinnedDisplayPrices.pinnedMaxPriceDisplayTruncated),
            );
            setMinPrice(
                parseFloat(pinnedDisplayPrices.pinnedMinPriceDisplayTruncated),
            );
        }
    }, [
        rangeWidthPercentage,
        advancedMode,
        isDenomBase,
        selectedPoolPriceTick,
        baseToken.address + quoteToken.address,
        baseToken.decimals,
        quoteToken.decimals,
    ]);

    const rangeWidthProps = {
        rangeWidthPercentage: rangeWidthPercentage,
        setRangeWidthPercentage: setRangeWidthPercentage,
        setRescaleRangeBoundariesWithSlider:
            setRescaleRangeBoundariesWithSlider,
        inputId: 'input-slider-range',
    };

    const rangePriceInfoProps = {
        pinnedDisplayPrices: pinnedDisplayPrices,
        spotPriceDisplay: getFormattedNumber({
            value: displayPriceWithDenom,
        }),
        maxPriceDisplay: maxPriceDisplay,
        minPriceDisplay: minPriceDisplay,
        aprPercentage: 10,
        daysInRange: 10,
        isTokenABase: false,
        poolPriceCharacter: poolPriceCharacter,
        isAmbient: isAmbient,
    };

    const minMaxPriceProps = {
        minPricePercentage: minPriceDifferencePercentage,
        maxPricePercentage: maxPriceDifferencePercentage,
        minPriceInputString: minPriceInputString,
        maxPriceInputString: maxPriceInputString,
        setMinPriceInputString: setMinPriceInputString,
        setMaxPriceInputString: setMaxPriceInputString,
        isDenomBase: isDenomBase,
        highBoundOnBlur: () => setRangeHighBoundFieldBlurred(true),
        lowBoundOnBlur: () => setRangeLowBoundFieldBlurred(true),
        rangeLowTick: defaultLowTick,
        rangeHighTick: defaultHighTick,
        disable: false,
        maxPrice: maxPrice,
        minPrice: minPrice,
        setMaxPrice: setMaxPrice,
        setMinPrice: setMinPrice,
    };

    function goToNewUrlParams(
        chain: string,
        addrTokenA: string,
        addrTokenB: string,
    ): void {
        linkGenPool.navigate({
            chain: chain,
            tokenA: addrTokenA,
            tokenB: addrTokenB,
        });
    }

    const newUrlTooltip = (
        <TextOnlyTooltip
            title={
                <Text
                    fontSize='body'
                    color='accent1'
                    align='left'
                    cursor='pointer'
                    onClick={() =>
                        goToNewUrlParams(
                            chainId,
                            tokenA.address,
                            tokenB.address,
                        )
                    }
                >
                    {` Trade ${tokenA.symbol} / ${tokenB.symbol}`}{' '}
                    <FiExternalLink color='var(--accent6)' />
                </Text>
            }
            placement={'right'}
            enterDelay={750}
            leaveDelay={0}
        >
            <Text fontSize='body' color='text2' style={{ width: '80px' }}>
                Select Tokens
            </Text>
        </TextOnlyTooltip>
    );

    function reverseTokens() {
        setTokenACollateral('');
        setTokenBCollateral('');
        linkGenInit.navigate({
            chain: chainId,
            tokenA: tokenB.address,
            tokenB: tokenA.address,
        });
    }

    const simpleTokenSelect = (
        <FlexContainer flexDirection='column' gap={8}>
            {newUrlTooltip}
            <InitPoolTokenSelect
                tokenAorB={'A'}
                token={tokenA}
                setTokenModalOpen={setTokenModalOpen}
                reverseTokens={reverseTokens}
            />
            <InitPoolTokenSelect
                tokenAorB={'B'}
                token={tokenB}
                setTokenModalOpen={setTokenModalOpen}
                reverseTokens={reverseTokens}
            />
        </FlexContainer>
    );

    const handleRefresh = () => {
        setIsLoading(true);
        (async () => {
            await refreshReferencePrice();
        })();

        setTimeout(() => {
            setIsLoading(false);
        }, 1000);
    };

    const [useReferencePrice, setUseReferencePrice] = useState(true);

    const openEditMode = () => {
        setIsEditEnabled(true);
        focusInput();
        if (
            initialPriceDisplay === '' &&
            (!isReferencePriceAvailable ||
                (isReferencePriceAvailable && useReferencePrice))
        ) {
            setInitialPriceDisplay(estimatedInitialPriceDisplay);
            const targetValue = estimatedInitialPriceDisplay.replaceAll(
                ',',
                '',
            );

            const targetValueNum = parseFloat(targetValue);

            if (targetValue === '') {
                setInitialPriceInBaseDenom(undefined);
            } else {
                if (isDenomBase) {
                    setInitialPriceInBaseDenom(targetValueNum);
                } else {
                    setInitialPriceInBaseDenom(1 / targetValueNum);
                }
            }
        }
        isReferencePriceAvailable && setUseReferencePrice(false);
    };

    function handleRefPriceToggle() {
        if (useReferencePrice) openEditMode();
        setUseReferencePrice(!useReferencePrice);
        if (estimatedInitialPriceDisplay !== undefined) {
            setInitialPriceDisplay(estimatedInitialPriceDisplay);
        } else setInitialPriceDisplay('');
    }
    // toggle to use reference price
    const refPriceToggle = (
        <FlexContainer flexDirection='row' alignItems='center' gap={8}>
            <Text fontSize='body' color='text2'>
                Use reference price
            </Text>
            {isReferencePriceAvailable && (
                <TooltipComponent title='Suggested initial pool prices are based on other decentralized exchanges.' />
            )}
            <Toggle
                id='toggle_ref_price'
                isOn={useReferencePrice}
                disabled={!isReferencePriceAvailable}
                handleToggle={handleRefPriceToggle}
            />
        </FlexContainer>
    );

    // pencil icon and refresh icon
    const initPriceEdit = (
        <FlexContainer gap={8}>
            {initialPriceDisplay === '' || !isReferencePriceAvailable ? (
                ''
            ) : (
                <FiRefreshCw size={20} onClick={handleRefresh} />
            )}
            <LuPencil size={20} onClick={() => openEditMode()} />
        </FlexContainer>
    );

    const initPriceContainer = (
        <FlexContainer
            flexDirection='column'
            gap={10}
            justifyContent='center'
            overlay={!!poolExists && 'blur'}
        >
            <FlexContainer flexDirection='row' justifyContent='space-between'>
                <FlexContainer flexDirection='row' gap={8} alignItems='center'>
                    <Text fontSize='body' color='text2'>
                        Initial Pool Price
                    </Text>
                </FlexContainer>
                {isReferencePriceAvailable ? refPriceToggle : initPriceEdit}
            </FlexContainer>{' '}
            <section
                style={{ width: '100%' }}
                onClick={() => {
                    if (!isEditEnabled) openEditMode();
                }}
            >
                {isLoading ? (
                    <FlexContainer
                        height='31px'
                        background='dark2'
                        alignItems='center'
                        padding='0 16px'
                    >
                        <Spinner size={24} bg='var(--dark2)' weight={2} />
                    </FlexContainer>
                ) : (
                    <CurrencyQuantityInput
                        readOnly={!isEditEnabled}
                        id='initial-pool-price-quantity'
                        placeholder={placeholderText}
                        type='string'
                        onChange={handleInitialPriceInputChange}
                        onBlur={() => setIsEditEnabled(false)}
                        value={initialPriceDisplay}
                        inputMode='decimal'
                        autoComplete='off'
                        autoCorrect='off'
                        min='0'
                        minLength={1}
                    />
                )}
            </section>
        </FlexContainer>
    );

    const toggleDexSelection = (tokenAorB: 'A' | 'B') => {
        if (tokenAorB === 'A') {
            setIsWithdrawTokenAFromDexChecked(!isWithdrawTokenAFromDexChecked);
        } else {
            setIsWithdrawTokenBFromDexChecked(!isWithdrawTokenBFromDexChecked);
        }
    };
    const showMobileVersion = useMediaQuery('(max-width: 768px)');

    const isRangeBoundsAndCollateralDisabled =
        poolExists || !isMintLiqEnabled || !selectedPoolNonDisplayPrice;

    const collateralContent = (
        <FlexContainer
            flexDirection='column'
            justifyContent='center'
            gap={10}
            overlay={isRangeBoundsAndCollateralDisabled && 'blur'}
        >
            <FlexContainer flexDirection='row' justifyContent='space-between'>
                <Text fontSize='body' color='text2'>
                    Collateral
                </Text>
            </FlexContainer>

            <RangeTokenInput
                hidePlus
                isAmbient={isAmbient}
                depositSkew={depositSkew}
                poolPriceNonDisplay={selectedPoolNonDisplayPrice}
                isWithdrawFromDexChecked={{
                    tokenA: isWithdrawTokenAFromDexChecked,
                    tokenB: isWithdrawTokenBFromDexChecked,
                }}
                isOutOfRange={false}
                tokenAInputQty={{
                    value: tokenACollateral,
                    set: setTokenACollateral,
                }}
                tokenBInputQty={{
                    value: tokenBCollateral,
                    set: setTokenBCollateral,
                }}
                toggleDexSelection={toggleDexSelection}
                isInputDisabled={{
                    tokenA: isTokenAInputDisabled,
                    tokenB: isTokenBInputDisabled,
                }}
                reverseTokens={reverseTokens}
                isMintLiqEnabled={isMintLiqEnabled}
                isInitPage
                amountToReduceNativeTokenQty={amountToReduceNativeTokenQty}
            />
        </FlexContainer>
    );

    const overlayIsBlur =
        (!!poolExists ||
            initialPriceDisplay === '' ||
            parseFloat(initialPriceDisplay) === 0) ??
        'blur';
    const mintInitialLiquidity = (
        <FlexContainer
            flexDirection='row'
            justifyContent='space-between'
            overlay={overlayIsBlur}
        >
            <Text fontSize='body' color='text2'>
                Mint Initial Liquidity
            </Text>
            <Toggle
                id='init_mint_liq'
                isOn={isMintLiqEnabled}
                disabled={poolExists === true}
                handleToggle={() => setIsMintLiqEnabled(!isMintLiqEnabled)}
            />
        </FlexContainer>
    );

    useEffect(() => {
        if (!isMintLiqEnabled) {
            setTokenACollateral('');
            setTokenBCollateral('');
        }
    }, [isMintLiqEnabled]);

    useEffect(() => {
        if (poolExists) {
            setShowErrorMessage(false);
        } else if (erc20TokenWithDexBalance) {
            setShowErrorMessage(true);
        } else {
            setShowErrorMessage(false);
        }
    }, [erc20TokenWithDexBalance, poolExists]);

    const handleSetActiveContent = (newActiveContent: string) => {
        setActiveContent(newActiveContent);
    };

    const [userClickedSendToMetamask, setUserClickedSendToMetamask] =
        useState(false);

    const handleGoBack = () => {
        if (activeContent === 'confirmation') {
            if (userClickedSendToMetamask) {
                setUserClickedSendToMetamask(false);
            } else {
                setActiveContent('main');
            }

            if (activeConfirmationStep === 4) {
                setActiveContent('main');
            }
        } else if (activeContent === 'settings') {
            setActiveContent('main');
        } else {
            handleNavigation();
        }
        resetConfirmation();
    };

    const hideContentOnMobile = !isMintLiqEnabled && showMobileVersion;

    const warningAndExtraInfo = showErrorMessage ? (
        <div
            style={{
                padding: hideContentOnMobile ? '20px 40px' : '0 40px',
            }}
        >
            <WarningBox
                details={`Due to a known issue, you currently need to completely withdraw your ${erc20TokenWithDexBalance?.symbol} exchange balance before proceeding with pool initialization.`}
            />
        </div>
    ) : (
        <FlexContainer overlay={!!poolExists && 'blur'} justifyContent='center'>
            <InitPoolExtraInfo
                initialPrice={parseFloat(
                    initialPriceDisplay.replaceAll(',', ''),
                )}
                isDenomBase={isDenomBase}
                initGasPriceinDollars={initGasPriceinDollars}
                baseToken={baseToken}
                quoteToken={quoteToken}
                setIsDenomBase={setIsDenomBase}
            />
        </FlexContainer>
    );

    const [isWithdrawPending, setIsWithdrawPending] = useState(false);

    const withdrawWalletBalanceButton = (
        <Button
            idForDOM='init_pool_primary_CTA'
            disabled={isWithdrawPending}
            title={
                isWithdrawPending
                    ? `${erc20TokenWithDexBalance?.symbol} Withdrawal Pending`
                    : `Withdraw ${erc20TokenWithDexBalance?.symbol}`
            }
            action={async () => {
                if (
                    !crocEnv ||
                    !erc20TokenWithDexBalance ||
                    !userAddress ||
                    !dexBalanceToBeRemoved
                )
                    return;

                setIsWithdrawPending(true);

                try {
                    const tx = await crocEnv
                        .token(erc20TokenWithDexBalance.address)
                        .withdraw(dexBalanceToBeRemoved, userAddress);

                    addPendingTx(tx?.hash);

                    if (tx?.hash) {
                        addTransactionByType({
                            chainId: chainId,
                            userAddress: userAddress || '',
                            txHash: tx.hash,
                            txType: 'Withdraw',
                            txDescription: `Withdrawal of ${erc20TokenWithDexBalance.symbol}`,
                        });
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
                            console.error({ e });
                        }

                        if (receipt) {
                            addReceipt(receipt);
                            removePendingTx(receipt.hash);
                        }
                    }
                } finally {
                    setIsWithdrawPending(false);
                }
            }}
            flat
        />
    );

    const mainContent = (
        <InitSkeleton
            isTokenModalOpen={tokenModalOpen}
            handleGoBack={handleGoBack}
            isConfirmation={false}
            activeContent={activeContent}
            setActiveContent={setActiveContent}
            title='Initialize Pool'
        >
            {/* Left */}
            <FlexContainer
                padding='0 8px'
                flexDirection='column'
                gap={8}
                justifyContent='space-between'
                height='99%'
            >
                {simpleTokenSelect}
                {initPriceContainer}
                {showMobileVersion && mintInitialLiquidity}
                {collateralContent}
            </FlexContainer>

            <FlexContainer
                padding='0 8px'
                flexDirection='column'
                justifyContent='space-between'
                height='99%'
            >
                <FlexContainer flexDirection='column' gap={8}>
                    {!showMobileVersion && mintInitialLiquidity}
                    <FlexContainer
                        overlay={isRangeBoundsAndCollateralDisabled && 'blur'}
                    >
                        <AdvancedModeToggle />
                    </FlexContainer>

                    {!hideContentOnMobile && (
                        <RangeBounds
                            isRangeBoundsDisabled={
                                isRangeBoundsAndCollateralDisabled
                            }
                            {...rangeWidthProps}
                            {...rangePriceInfoProps}
                            {...minMaxPriceProps}
                            customSwitch={true}
                        />
                    )}
                </FlexContainer>

                <FlexContainer flexDirection='column' gap={8}>
                    {warningAndExtraInfo}
                    {erc20TokenWithDexBalance?.symbol ? (
                        withdrawWalletBalanceButton
                    ) : (
                        <InitButton {...initButtonPropsIF} />
                    )}
                </FlexContainer>
            </FlexContainer>
        </InitSkeleton>
    );

    const initialPriceLocaleString = getFormattedNumber({
        value: parseFloat(initialPriceDisplay.replaceAll(',', '')),
    });

    const priceDisplayString = isDenomBase
        ? `1 ${baseToken.symbol} = ${initialPriceLocaleString} ${quoteToken.symbol}`
        : `1 ${quoteToken.symbol} = ${initialPriceLocaleString} ${baseToken.symbol}`;

    const priceDisplayDiv = (
        <div
            onClick={() => {
                setIsDenomBase(!isDenomBase);
            }}
            style={{ cursor: 'pointer' }}
        >
            {priceDisplayString}
        </div>
    );

    const initConfirmationProps = {
        activeContent,
        setActiveContent,
        sendTx: sendTransaction,
        transactionApprovedInit,
        transactionApprovedRange,
        isTransactionDenied,
        isTransactionException,
        tokenA,
        tokenB,
        isAmbient,
        isTokenABase,
        txError: txError,
        isTxCompletedInit,
        isTxCompletedRange,
        handleNavigation,
        pinnedMinPriceDisplayTruncatedInBase,
        pinnedMinPriceDisplayTruncatedInQuote,
        pinnedMaxPriceDisplayTruncatedInBase,
        pinnedMaxPriceDisplayTruncatedInQuote,
        tokenACollateral,
        tokenBCollateral,
        isDenomBase,
        setIsDenomBase,
        activeStep: activeConfirmationStep,
        setActiveStep: setActiveConfirmationStep,
        isConfirmed: userClickedSendToMetamask,
        setIsConfirmed: setUserClickedSendToMetamask,
        isMintLiqEnabled,

        initialPriceDisplay,
        priceDisplayString,
        priceDisplayDiv,
        initialPriceInBaseDenom,
    };

    const confirmationContent = (
        <InitSkeleton
            isTokenModalOpen={tokenModalOpen}
            handleGoBack={handleGoBack}
            isConfirmation={true}
            activeContent={activeContent}
            setActiveContent={setActiveContent}
            title='Initialize Pool'
        >
            <InitConfirmation {...initConfirmationProps} />
        </InitSkeleton>
    );

    const settingsContent = (
        <InitSkeleton
            isTokenModalOpen={tokenModalOpen}
            handleGoBack={handleGoBack}
            isConfirmation={true}
            activeContent={activeContent}
            setActiveContent={setActiveContent}
            title='Settings'
        >
            I AM SETTINGS
        </InitSkeleton>
    );

    return (
        <>
            <MultiContentComponent
                mainContent={mainContent}
                settingsContent={settingsContent}
                confirmationContent={confirmationContent}
                activeContent={activeContent}
                setActiveContent={handleSetActiveContent}
            />
        </>
    );
}
