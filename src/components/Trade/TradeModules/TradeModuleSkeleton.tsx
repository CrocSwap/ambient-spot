import { motion } from 'framer-motion';
import { ReactNode, useContext, useMemo } from 'react';
import { FiExternalLink } from 'react-icons/fi';
import { AppStateContext } from '../../../contexts/AppStateContext';
import { TokenContext } from '../../../contexts/TokenContext';
import { FlexContainer, GridContainer } from '../../../styled/Common';
import {
    AcknowledgeLink,
    AcknowledgeText,
} from '../../../styled/Components/TradeModules';
import Button from '../../Form/Button';
import ContentContainer from '../../Global/ContentContainer/ContentContainer';

import { excludedTokenAddressesLowercase } from '../../../ambient-utils/constants';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import TradeLinks from './TradeLinks';

interface PropsIF {
    chainId: string;
    header: ReactNode;
    input: ReactNode;
    transactionDetails: ReactNode;
    modal: ReactNode | undefined;
    button: ReactNode;
    bypassConfirm: ReactNode | undefined;
    approveButton: ReactNode | undefined;
    warnings?: ReactNode | undefined;
    // eslint-disable-next-line
    isSwapPage?: boolean;
    inputOptions?: ReactNode;
}

export const TradeModuleSkeleton = (props: PropsIF) => {
    const {
        chainId,
        isSwapPage,
        header,
        input,
        inputOptions,
        transactionDetails,
        modal,
        button,
        bypassConfirm,
        approveButton,
        warnings,
    } = props;

    const {
        activeNetwork: { blockExplorer },
        walletModal: { open: openWalletModal },
    } = useContext(AppStateContext);

    const { tokens } = useContext(TokenContext);

    const { isUserConnected } = useContext(UserDataContext);

    const { tokenA, tokenB, limitTick, areDefaultTokensUpdatedForChain } =
        useContext(TradeDataContext);

    // values if either token needs to be confirmed before transacting
    const needConfirmTokenA = useMemo(() => {
        if (tokenA.chainId !== Number(chainId)) return false;
        return !tokens.verify(tokenA.address);
    }, [tokenA.address, tokens, chainId]);

    const needConfirmTokenB = useMemo(() => {
        if (tokenB.chainId !== Number(chainId)) return false;
        return !tokens.verify(tokenB.address);
    }, [tokenB.address, tokens, chainId]);

    const smallScreen = useMediaQuery('(max-width: 768px)');

    const tokenAIsExcludedToken = useMemo(() => {
        return excludedTokenAddressesLowercase.includes(
            tokenA.address.toLowerCase(),
        );
    }, [tokenA.address, excludedTokenAddressesLowercase]);

    const tokenBIsExcludedToken = useMemo(() => {
        return excludedTokenAddressesLowercase.includes(
            tokenB.address.toLowerCase(),
        );
    }, [tokenB.address, excludedTokenAddressesLowercase]);

    // token acknowledgement needed message (empty string if none needed)
    const ackTokenMessage = useMemo<string>(() => {
        // !Important   any changes to verbiage in this code block must be approved
        // !Important   ... by Doug, get in writing by email or request specific
        // !Important   ... review for a pull request on GitHub
        let text: string;
        if (tokenAIsExcludedToken) {
            text = `This ${tokenA.symbol} token has been identified as a potentially fraudulent token. Please be sure this is the actual token you want to trade. Many tokens will use the same name and symbol as other major tokens. Always conduct your own research before trading.`;
        } else if (tokenBIsExcludedToken) {
            text = `This ${tokenB.symbol} token has been identified as a potentially fraudulent token. Please be sure this is the actual token you want to trade. Many tokens will use the same name and symbol as other major tokens. Always conduct your own research before trading.`;
        } else if (needConfirmTokenA && needConfirmTokenB) {
            text = `The tokens ${tokenA.symbol || tokenA.name} and ${
                tokenB.symbol || tokenB.name
            } are not listed on any major reputable token list. Please be sure these are the actual tokens you want to trade. Many fraudulent tokens will use the same name and symbol as other major tokens. Always conduct your own research before trading.`;
        } else if (needConfirmTokenA) {
            text = `The token ${
                tokenA.symbol || tokenA.name
            } is not listed on any major reputable token list. Please be sure this is the actual token you want to trade. Many fraudulent tokens will use the same name and symbol as other major tokens. Always conduct your own research before trading.`;
        } else if (needConfirmTokenB) {
            text = `The token ${
                tokenB.symbol || tokenB.name
            } is not listed on any major reputable token list. Please be sure this is the actual token you want to trade. Many fraudulent tokens will use the same name and symbol as other major tokens. Always conduct your own research before trading.`;
        } else {
            text = '';
        }
        return text;
    }, [
        needConfirmTokenA,
        needConfirmTokenB,
        tokenA.symbol,
        tokenB.symbol,
        tokenAIsExcludedToken,
        tokenBIsExcludedToken,
    ]);

    const formattedAckTokenMessage = ackTokenMessage.replace(
        /\b(not|fraudulent)\b/i,
        '<span style="color: var(--negative); text-transform: uppercase;">$1</span>',
    );

    const tokenAExplorerLink = (needConfirmTokenA || tokenAIsExcludedToken) && (
        <AcknowledgeLink
            href={blockExplorer + 'token/' + tokenA.address}
            rel={'noopener noreferrer'}
            target='_blank'
            aria-label={`approve ${tokenA.symbol}`}
        >
            {tokenA.symbol || tokenA.name} <FiExternalLink />
        </AcknowledgeLink>
    );

    const tokenBExplorerLink = (needConfirmTokenB || tokenBIsExcludedToken) && (
        <AcknowledgeLink
            href={blockExplorer + 'token/' + tokenB.address}
            rel={'noopener noreferrer'}
            target='_blank'
            aria-label={`approve ${tokenB.symbol}`}
        >
            {tokenB.symbol || tokenB.name} <FiExternalLink />
        </AcknowledgeLink>
    );

    const ackTokenNeeded = needConfirmTokenA || needConfirmTokenB;

    return (
        <>
            <ContentContainer isOnTradeRoute={!isSwapPage}>
                {header}
                {!isSwapPage && !smallScreen && (
                    <TradeLinks
                        chainId={chainId}
                        tokenA={tokenA}
                        tokenB={tokenB}
                        limitTick={limitTick}
                    />
                )}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {input}
                </motion.div>
                {inputOptions && inputOptions}
                <FlexContainer
                    flexDirection='column'
                    gap={8}
                    margin='8px 0 0 0'
                    padding='0 32px 30px 32px'
                >
                    {transactionDetails}
                    {isUserConnected === undefined ||
                    !areDefaultTokensUpdatedForChain ? null : isUserConnected ===
                      true ? (
                        approveButton && !ackTokenNeeded ? (
                            approveButton
                        ) : (
                            <>
                                {!bypassConfirm ? button : bypassConfirm}
                                {ackTokenMessage &&
                                    areDefaultTokensUpdatedForChain && (
                                        <AcknowledgeText
                                            fontSize='body'
                                            dangerouslySetInnerHTML={{
                                                __html: formattedAckTokenMessage,
                                            }}
                                        ></AcknowledgeText>
                                    )}
                                {areDefaultTokensUpdatedForChain &&
                                    ackTokenMessage && (
                                        <GridContainer
                                            numCols={2}
                                            gap={16}
                                            margin='4px 0'
                                        >
                                            {tokenAExplorerLink}
                                            {tokenBExplorerLink}
                                        </GridContainer>
                                    )}
                            </>
                        )
                    ) : (
                        <Button
                            idForDOM='connect_wallet_button_in_trade_configurator'
                            action={openWalletModal}
                            title='Connect Wallet'
                            flat
                        />
                    )}
                    {!isUserConnected && ackTokenNeeded ? (
                        <AcknowledgeText
                            fontSize='body'
                            dangerouslySetInnerHTML={{
                                __html: formattedAckTokenMessage,
                            }}
                        ></AcknowledgeText>
                    ) : null}
                    {!isUserConnected && ackTokenNeeded ? (
                        <GridContainer numCols={2} gap={16} margin='4px 0'>
                            {tokenAExplorerLink}
                            {tokenBExplorerLink}
                        </GridContainer>
                    ) : null}
                    {warnings && warnings}
                </FlexContainer>
            </ContentContainer>
            {modal}
        </>
    );
};
