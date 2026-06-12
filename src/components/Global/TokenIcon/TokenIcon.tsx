import { Suspense, memo, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IS_LOCAL_ENV, ZERO_ADDRESS } from '../../../ambient-utils/constants';
import fixCase, {
    letterCasings,
} from '../../../ambient-utils/functions/fixCase';
import { TokenIF } from '../../../ambient-utils/types';
import NoTokenIcon from '../NoTokenIcon/NoTokenIcon';
import { DefaultTooltip } from '../StyledTooltip/StyledTooltip';
import processLogoSrc from './processLogoSrc';
import styles from './TokenIcon.module.css';

type TokenIconSize = 'xxs' | 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl' | '3xl';

interface propsIF {
    token?: TokenIF;
    src?: string;
    alt?: string;
    size?: TokenIconSize;
    empty?: boolean;
}

function TokenIcon(props: propsIF) {
    const {
        token,
        src = '',
        alt = 'Token Icon',
        size = 'm',
        empty = false,
    } = props;

    // translate human-readable icon width to CSS value
    const getIconWidth = (size: TokenIconSize): string => {
        switch (size) {
            case '3xl':
                return '35px';
            case '2xl':
                return '30px';
            case 'xl':
                return '27px';
            case 'l':
                return '25px';
            case 'm':
                return '20px';
            case 's':
                return '18px';
            case 'xs':
                return '15px';
            case 'xxs':
                return '10px';
            default:
                return '20px';
        }
    };

    // return the element with no embedded image asset, this is for layouts where we want to
    // ... perserve the correct negative space in the DOM without actually showing anything
    if (empty) {
        return (
            <div
                style={{
                    width: getIconWidth(size),
                    height: getIconWidth(size),
                }}
            ></div>
        );
    }

    const { pathname } = useLocation();

    // bool to trigger fallback error handling
    const [fetchError, setFetchError] = useState<boolean>(false);

    const handleFetchError = (): void => {
        console.warn(
            `failed to fetch token icon from URI <<${src}>>, displaying fallback image, refer to file TokenIcon.tsx to troubleshoot`,
        );
        setFetchError(true);
    };

    // this fixes a bug when the app sometimes gets an empty string for URI src
    // sometimes this happens post-load for still undetermined reasons
    useEffect(() => {
        if (src) setFetchError(false);
    }, [src]);

    // fn to get a character to use in the `<NoTokenIcon />` element
    function getTokenCharacter(tkn: TokenIF | undefined, alt?: string): string {
        const DEFAULT_OUTPUT = '';
        // early return if no token data object is available
        if (!tkn && !alt) return DEFAULT_OUTPUT;
        // regex to identify whether a character is alphanumeric (case-insensitive)
        const alphanumericRegex = /[a-zA-Z0-9]/;
        // array of strings to use to isolate a character in order of preference
        const characterSources: string[] = tkn
            ? [tkn.symbol, tkn.name]
            : alt
              ? [alt]
              : [];
        // join sources into a string for easier processing
        const characterSourcesAsStr: string = characterSources.join('');
        // iterate over characters in string to find the first alphanumeric
        let outputCharacter = DEFAULT_OUTPUT;
        for (let i = 0; i < characterSourcesAsStr.length; i++) {
            const char: string = characterSourcesAsStr.charAt(i);
            if (alphanumericRegex.test(char)) {
                outputCharacter = char;
                break;
            }
        }

        // logic to specify overrides for casing rules on certain tokens
        type casingException = [string, string, letterCasings];
        const casingExceptionsMap = new Map();
        const casingExceptions: casingException[] = [
            ['0x1', ZERO_ADDRESS, 'upper'],
        ];
        function makeMapKey(c: string, a: string): string {
            const key: string = c + '_' + a;
            return key.toLowerCase();
        }
        casingExceptions.forEach((ex: casingException) => {
            const [chn, addr, casing]: casingException = ex;
            casingExceptionsMap.set(makeMapKey(chn, addr), casing);
        });

        // fn to determine whether the given token has a casing exception
        function checkForCasingException(
            t: TokenIF | undefined,
        ): letterCasings | undefined {
            if (!t) return;
            const lookupKey: string = makeMapKey(
                '0x' + t.chainId.toString(16),
                t.address,
            );
            const casingOverride: letterCasings | undefined =
                casingExceptionsMap.get(lookupKey);
            return casingOverride;
        }

        // default case to use if no override is found
        const DEFAULT_CASE: letterCasings = 'upper';

        // return the relevant character in the appropriate casing
        return fixCase(
            outputCharacter,
            checkForCasingException(token) ?? DEFAULT_CASE,
        );
    }

    const noTokenIcon: React.ReactNode = (
        <NoTokenIcon
            tokenInitial={getTokenCharacter(token, alt) || ''}
            width={getIconWidth(size)}
        />
    );

    // TODO: not great practice to use the same item for both loader and error fallback
    // TODO: ... makes it difficult to tell where the error is when seeing the fallback
    // TODO: ... best practice we should change this up in the future

    // logic to create a tooltip text based on pathway
    // if supplied an empty string tooltip will not render
    const makeTooltipText = (): string =>
        pathname.startsWith('/explore') ? `${token?.name ?? '[unknown]'}` : '';

    return (
        <DefaultTooltip title={makeTooltipText()}>
            {/* without this wrapper below the tooltip breaks */}
            <div className={styles.token_logo_wrapper}>
                <Suspense fallback={noTokenIcon}>
                    {!fetchError
                        ? (() => {
                              const logoSrc = processLogoSrc({
                                  token: token,
                                  symbol: alt,
                                  sourceURI: src,
                              });
                              // If processLogoSrc returns an empty string, show the noTokenIcon fallback
                              if (logoSrc === '') {
                                  return noTokenIcon;
                              }
                              return (
                                  <img
                                      className={styles.token_icon}
                                      style={{
                                          width: getIconWidth(size),
                                          height: getIconWidth(size),
                                      }}
                                      src={logoSrc}
                                      alt={alt}
                                      onError={handleFetchError}
                                  />
                              );
                          })()
                        : noTokenIcon}
                </Suspense>
            </div>
        </DefaultTooltip>
    );
}

export default memo(TokenIcon);
