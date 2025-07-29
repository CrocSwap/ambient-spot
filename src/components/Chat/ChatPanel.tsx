interface EmojiData {
    native: string;
    [key: string]: any; // For any additional properties that might be needed
}
import React, {
    memo,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AiOutlineCheck, AiOutlineClose, AiOutlineUser } from 'react-icons/ai';
import { BsChatLeftFill } from 'react-icons/bs';
import { IoIosArrowDown, IoIosArrowUp, IoIosClose } from 'react-icons/io';
import {
    RiArrowDownDoubleLine,
    RiArrowDownSLine,
    RiArrowUpDoubleLine,
    RiCloseCircleFill,
} from 'react-icons/ri';
import { trimString } from '../../ambient-utils/dataLayer';
import { PoolIF } from '../../ambient-utils/types';
import { AppStateContext } from '../../contexts/AppStateContext';
import { TradeDataContext } from '../../contexts/TradeDataContext';
import { UserDataContext } from '../../contexts/UserDataContext';
import NotFound from '../../pages/common/NotFound/NotFound';
import { linkGenMethodsIF, useLinkGen } from '../../utils/hooks/useLinkGen';
import useMediaQuery from '../../utils/hooks/useMediaQuery';
import useOnClickOutside from '../../utils/hooks/useOnClickOutside';
import DividerDark from '../Global/DividerDark/DividerDark';
import ChatConfirmationPanel from './ChatConfirmationPanel/ChatConfirmationPanel';
import { ALLOW_AUTH, ALLOW_MENTIONS } from './ChatConstants/ChatConstants';
import { ChatVerificationTypes } from './ChatEnums';
import { ChatGoToChatParamsIF } from './ChatIFs';
import ChatNotificationBubble from './ChatNotification/ChatNotificationBubble';
import styles from './ChatPanel.module.css';
import { getEmojiPack } from './ChatRenderUtils';
import ChatToaster from './ChatToaster/ChatToaster';
import DomDebugger from './DomDebugger/DomDebugger';
import FullChat from './FullChat/FullChat';
import MessageInput from './MessagePanel/InputBox/MessageInput';
import Room from './MessagePanel/Room/Room';
import SentMessagePanel from './MessagePanel/SentMessagePanel/SentMessagePanel';
import UserSummary from './MessagePanel/UserSummary/UserSummary';
import { Message } from './Model/MessageModel';
import { UserSummaryModel } from './Model/UserSummaryModel';
import useChatApi from './Service/ChatApi';
import useChatSocket from './Service/useChatSocket';
import { LuMessageSquareText } from 'react-icons/lu';

interface propsIF {
    isFullScreen: boolean;
    appPage?: boolean;
}

function ChatPanel(props: propsIF) {
    const [isFocusMentions, setIsFocusMentions] = useState(
        true && ALLOW_MENTIONS,
    );
    const { isFullScreen } = props;
    const {
        activeNetwork,
        chat: {
            isEnabled: isChatEnabled,
            isOpen: isChatOpen,
            setIsOpen: setIsChatOpen,
        },
        subscriptions: { isEnabled: isSubscriptionsEnabled },
    } = useContext(AppStateContext);

    const { baseToken, quoteToken } = useContext(TradeDataContext);

    if (!isChatEnabled) return <NotFound />;

    const messageListWrapper = useRef<HTMLDivElement>(null);
    const reactionsRef = useRef<HTMLDivElement>(null);
    const [favoritePools, setFavoritePools] = useState<PoolIF[]>([]);
    const [room, setRoom] = useState('Global');
    const [isModerator, setIsModerator] = useState(false);
    const [isCurrentPool, setIsCurrentPool] = useState(false);
    const [showCurrentPoolButton, setShowCurrentPoolButton] = useState(true);
    const [userCurrentPool, setUserCurrentPool] = useState('ETH / USDC');
    const [isDeleteMessageButtonPressed, setIsDeleteMessageButtonPressed] =
        useState(false);
    const [showPopUp, setShowPopUp] = useState(false);
    const [popUpText, setPopUpText] = useState('');
    const {
        userAddress,
        ensName: ens,
        isUserConnected,
        resolvedAddressFromContext,
        setCurrentUserID,
    } = useContext(UserDataContext);
    const [ensName, setEnsName] = useState('');
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [isVerified, setIsVerified] = useState(false);
    const [currentUser, setCurrentUser] = useState<string | undefined>(
        undefined,
    );
    const [scrollDirection, setScrollDirection] = useState(String);
    const [notificationCount, setNotificationCount] = useState(0);
    const [isMessageDeleted, setIsMessageDeleted] = useState(false);
    const [showPreviousMessagesButton, setShowPreviousMessagesButton] =
        useState(false);
    const [isScrollToBottomButtonPressed, setIsScrollToBottomButtonPressed] =
        useState(true);

    const [isReplyButtonPressed, setIsReplyButtonPressed] = useState(false);
    const [selectedMessageforReply, setSelectedMessageForReply] = useState<
        Message | undefined
    >();
    const [selectedMessageIdForDeletion, setSelectedMessageIdForDeletion] =
        useState('');

    const [page, setPage] = useState(0);
    const [mentionIndex, setMentionIndex] = useState(-1);
    // eslint-disable-next-line
    const [notConnectedUserInterval, setNotConnectedUserInterval] =
        useState<NodeJS.Timeout>();

    // that block toggled when message count limit is handled --------------------------------------------

    // const [isInputDisabled, setIsInputDisabled] = useState<boolean>(false);
    const isInputDisabled = false;

    const _cooldownVal = 12;
    // const [sendMessageCooldown, setSendMessageCooldown] =
    //     useState<number>(_cooldownVal);
    const sendMessageCooldown = _cooldownVal;
    // --------------------------------------------------------------------------------------------------

    // CHAT_FEATURE_STATES - Feature : User Summary
    const [userSummaryToBottom, setUserSummaryToBottom] = useState(false);
    const [userSummaryVerticalPosition, setUserSummaryVerticalPosition] =
        useState(0);
    const [userSummaryActive, setUserSummaryActive] = useState(false);
    const [selectedUserSummary, setSelectedUserSummary] =
        useState<UserSummaryModel>();

    const [showVerifyOldMessagesPanel, setShowVerifyOldMessagesPanel] =
        useState(false);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

    const [
        showVerifyWalletConfirmationInDelete,
        setShowVerifyWalletConfirmationInDelete,
    ] = useState(false);

    // some tricky date set for old messages verification. if it is not changed by confirmation panel, some future date will be used to not verify any messages
    const [verifyOldMessagesStartDate, setVerifyOldMessagesStartDate] =
        useState(new Date(new Date().getTime() + 1000 * 60 * 60 * 100));

    const [toastrActive, setToastrActive] = useState(false);
    const [toastrType, setToastrType] = useState<
        'success' | 'error' | 'warning' | 'info'
    >('info');
    const [toastrText, setToastrText] = useState('');

    const verifyBtnRef = useRef<HTMLDivElement>(null);

    const [goToChartParams, setGoToChartParams] = useState<
        ChatGoToChatParamsIF | undefined
    >();

    const [showPrevMents, setShowPrevMents] = useState(false);
    const [showNextMents, setShowNextMents] = useState(false);

    const activateToastr = (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
    ) => {
        setToastrActive(true);
        setToastrText(message);
        setToastrType(type);
    };

    const freezePanel = () => {
        messageListWrapper.current?.style.setProperty('opacity', '0');
    };

    const scrollToVeryBottom = () => {
        if (messageListWrapper.current) {
            scrollToInstant(messageListWrapper.current.scrollHeight);
        }
    };

    const scrollToInstant = (pos: number) => {
        if (messageListWrapper.current) {
            messageListWrapper.current.scrollTo({
                left: 0,
                top: pos,
                behavior: 'instant' as ScrollBehavior,
            });
        }
    };

    const activatePanel = () => {
        messageListWrapper.current?.style.setProperty('opacity', '1');
        scrollToVeryBottom();
        setTimeout(() => {
            scrollToVeryBottom();
        }, 200);
    };

    const [scrollRevertTarget, setScrollRevertTarget] = useState('');

    const isMobile = useMediaQuery('(max-width: 800px)');

    const [messageForNotificationBubble, setMessageForNotificationBubble] =
        useState<Message | undefined>(undefined);

    const reactionCodes = [
        '1f44d',
        '2764-fe0f',
        '1f603',
        '1f602',
        '1f622',
        '1f64f',
        '1f44e',
        '1f621',
    ];

    const {
        messages,
        lastMessage,
        messageUser,
        sendMsg,
        users,
        getMsgWithRestWithPagination,
        notifications,
        updateLikeDislike,
        userMap,
        updateUserCache,
        getAllMessages,
        setMessages,
        addReaction,
        deleteMsgFromList,
        fetchForNotConnectedUser,
        getUserSummaryDetails,
        updateUnverifiedMessages,
        isWsConnected,
        // saveUserWithAvatarImage,
    } = useChatSocket(
        room,
        isSubscriptionsEnabled,
        isChatOpen,
        activateToastr,
        // userAddress,
        // ens,
        currentUser,
        freezePanel,
        activatePanel,
        setMessageForNotificationBubble,
    );

    const {
        getID,
        updateUser,
        updateMessageUser,
        verifyWalletService,
        isUserVerified,
    } = useChatApi();

    const [focusedMessage, setFocusedMessage] = useState<Message | undefined>();
    const focusedMessageRef = useRef<Message | undefined>();
    focusedMessageRef.current = focusedMessage;
    const [showCustomEmojiPanel, setShowCustomEmojiPanel] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [pickerBottomPos, setPickerBottomPos] = useState(0);

    const defaultEnsName = 'defaultValue';

    const linkGenMarket: linkGenMethodsIF = useLinkGen('market');

    const [lastScrolledMessage, setLastScrolledMessage] = useState('');
    const [lastScrollListenerActive, setLastScrollListenerActive] =
        useState(false);
    const [pickerReady, setPickerReady] = useState(false);

    // Lazy loading states for emoji picker
    const [emojiData, setEmojiData] = useState<any>(null);
    const [Picker, setPicker] = useState<React.ComponentType<any> | null>(null);
    const [isEmojiLoading, setIsEmojiLoading] = useState(false);

    const lastScrollListenerRef = useRef<boolean>();
    lastScrollListenerRef.current = lastScrollListenerActive;

    useEffect(() => {
        if (showReactionPicker) {
            const id = requestAnimationFrame(() => setPickerReady(true));
            return () => cancelAnimationFrame(id);
        }
        setPickerReady(false);
    }, [showReactionPicker]);

    useOnClickOutside(reactionsRef, () => {
        if (pickerReady) setShowReactionPicker(false);
    });

    // Lazy load emoji picker when needed
    useEffect(() => {
        if (showReactionPicker && !Picker && !isEmojiLoading) {
            setIsEmojiLoading(true);
            Promise.all([
                import('@emoji-mart/react'),
                import('@emoji-mart/data'),
            ])
                .then(([emojiMart, emojiDataModule]) => {
                    setPicker(() => emojiMart.default);
                    setEmojiData(emojiDataModule.default);
                    setIsEmojiLoading(false);
                })
                .catch((error) => {
                    console.error('Failed to load emoji picker:', error);
                    setIsEmojiLoading(false);
                });
        }
    }, [showReactionPicker, Picker, isEmojiLoading]);

    const closeOnEscapeKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.code !== 'Escape') return;

            if (showCustomEmojiPanel) {
                setIsChatOpen(false);
                setShowCustomEmojiPanel(false);
            } else if (showPicker) {
                setIsChatOpen(false);
                setShowPicker(false);
            } else if (isReplyButtonPressed) {
                setIsChatOpen(false);
                setIsReplyButtonPressed(false);
            } else if (showReactionPicker) {
                setIsChatOpen(false);
                setShowReactionPicker(false);
            } else {
                setIsChatOpen(false);
            }
        },
        [
            showCustomEmojiPanel,
            showPicker,
            isReplyButtonPressed,
            isChatOpen,
            showReactionPicker,
        ],
    );

    useEffect(() => {
        async function checkUser() {
            const data = await getID();
            if (!data || data.status === 'Not OK') {
                // do nothing
            } else {
                setCurrentUser(data.userData._id);
            }
        }

        if (isChatOpen) {
            checkUser();
        }
    }, [isChatOpen, userAddress]);

    useEffect(() => {
        document.body.addEventListener('keydown', closeOnEscapeKeyDown);
        return () => {
            document.body.removeEventListener('keydown', closeOnEscapeKeyDown);
        };
    }, [closeOnEscapeKeyDown]);

    function openChatPanel(e: KeyboardEvent) {
        if (e.code === 'KeyC' && e.ctrlKey && e.altKey) {
            setIsChatOpen(!isChatOpen); // Toggle chat panel open/closed
        }
    }

    useEffect(() => {
        document.body.addEventListener('keydown', closeOnEscapeKeyDown);
        document.body.addEventListener('keydown', openChatPanel);
        return function cleanUp() {
            document.body.removeEventListener('keydown', closeOnEscapeKeyDown);
        };
    });

    async function mentionHoverListener(elementTop: number, walletID: string) {
        // CHAT_FEATURES_WBO -  Feature : User Summary
        const userDetails = await getUserSummaryDetails(walletID);
        setSelectedUserSummary(userDetails);
        if (!messageListWrapper.current) return;

        const wrapperCenterPoint =
            messageListWrapper.current.getBoundingClientRect().height / 2 +
            messageListWrapper.current.getBoundingClientRect().top;
        setUserSummaryActive(true);
        setUserSummaryVerticalPosition(
            elementTop - messageListWrapper.current.getBoundingClientRect().top,
        );
        if (elementTop >= wrapperCenterPoint) {
            setUserSummaryToBottom(false);
        } else {
            setUserSummaryToBottom(true);
        }
    }

    function summaryMouseLeaveListener() {
        setUserSummaryActive(false);
    }

    function closePopUp() {
        setShowPopUp(false);
    }

    const [isMentionPanelActive, setIsMentionPanelActive] = useState(false);
    // eslint-disable-next-line
    const [mentionPanelQuery, setMentionPanelQuery] = useState('');

    const messageInputListener = (value: string) => {
        if (value.indexOf('@') !== -1) {
            setIsMentionPanelActive(true);
            setMentionPanelQuery(value.split('@')[1]);
        } else {
            if (isMentionPanelActive) setIsMentionPanelActive(false);
        }
    };

    const reactionBtnListener = (
        e: React.MouseEvent<HTMLDivElement>,
        focusedMessage?: Message,
    ) => {
        e.stopPropagation();
        setPickerBottomPos(
            window.innerHeight - (e.clientY + (isMobile ? 50 : 0)),
        );
        setFocusedMessage(focusedMessage);
        setShowReactionPicker(true);
    };
    const addReactionEmojiPickListener = (data: EmojiData | string) => {
        if (focusedMessageRef.current && currentUser) {
            let reaction;
            if (typeof data === 'string') {
                reaction = data;
            } else {
                // Handle both emoji-mart data structure and direct string
                reaction = data.native || data.emoji || data;
            }
            addReaction(focusedMessageRef.current._id, currentUser, reaction);
            setShowReactionPicker(false);
        }
    };

    useEffect(() => {
        document.body.addEventListener('keydown', closeOnEscapeKeyDown);
        return () => {
            document.body.removeEventListener('keydown', closeOnEscapeKeyDown);
        };
    }, []);

    useEffect(() => {
        async function checkUserAndVerification() {
            if (!isChatOpen || !userAddress) {
                setIsVerifying(false);
                return;
            }
            setIsVerifying(true);

            try {
                const userDataResponse = await getID();
                if (!userDataResponse || userDataResponse.status === 'Not OK') {
                    setIsVerified(false);
                } else {
                    setCurrentUser(userDataResponse.userData._id);
                    const verifiedResponse = await isUserVerified();
                    setIsVerified(
                        verifiedResponse ? verifiedResponse.verified : false,
                    );
                }
            } catch (error) {
                setIsVerified(false);
            }
            setIsVerifying(false);
        }

        checkUserAndVerification();
    }, [isChatOpen, userAddress]);

    useEffect(() => {
        if (room == undefined) {
            return;
        }

        if (notConnectedUserInterval) {
            clearInterval(notConnectedUserInterval);
        }

        if (userAddress === undefined) {
            if (!isChatOpen) {
                return;
            }

            if (page > 0) {
                return;
            }

            const interval = setInterval(() => {
                fetchForNotConnectedUser();
            }, 10000);

            setNotConnectedUserInterval(interval);
        }

        return clearInterval(notConnectedUserInterval);
    }, [userAddress, room, isChatOpen, page]);

    useEffect(() => {
        if (
            lastScrolledMessage == undefined ||
            lastScrolledMessage.length === 0
        ) {
            scrollToBottom();
        }
        if (scrollDirection === 'Scroll Up') {
            if (messageUser !== currentUser) {
                if (
                    lastMessage?.mentionedName === ensName ||
                    (lastMessage?.mentionedName === userAddress &&
                        userAddress !== undefined)
                ) {
                    setNotificationCount(
                        (notificationCount) => notificationCount + 1,
                    );
                }
            } else if (messageUser === currentUser) {
                setIsScrollToBottomButtonPressed(true);
                // scrollToBottom();

                setNotificationCount(0);
            }
        } else {
            // scrollToBottom();
        }
    }, [lastMessage]);

    useEffect(() => {
        setScrollDirection('Scroll Down');
        if (userAddress && isChatOpen) {
            if (ens === null || ens === undefined) {
                setEnsName(defaultEnsName);
            } else {
                setEnsName(ens);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            getID().then((result: any) => {
                if (result && result.status === 'Not OK') {
                    // this flow moved to backend due to triggering more than one
                    // whole of initial data fetching process will be refactored
                    // saveUser(address, ensName).then((result: any) => {
                    //     setCurrentUser(result.userData._id);
                    //     return result;
                    // });
                } else {
                    result.userData.isModerator === true
                        ? setIsModerator(true)
                        : setIsModerator(false);
                    setCurrentUser(result.userData._id);
                    setCurrentUserID(result.userData._id);
                    setUserCurrentPool(result.userData.userCurrentPool);
                    if (result.userData.ensName !== ensName) {
                        updateUser(
                            currentUser as string,
                            ensName,
                            userCurrentPool,
                        ).then(
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            (result: any) => {
                                if (result && result.status === 'OK') {
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    updateMessageUser(
                                        currentUser as string,
                                        ensName,
                                    ).then(
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        (result: any) => {
                                            return result;
                                        },
                                    );
                                }
                            },
                        );
                    }
                }
            });
        } else {
            setCurrentUser(undefined);
        }
    }, [ens, userAddress, isChatOpen, isFullScreen, setUserCurrentPool]);

    useEffect(() => {
        setIsScrollToBottomButtonPressed(false);
        // scrollToBottom();
        setNotificationCount(0);
        setShowPreviousMessagesButton(false);
        setPage(0);

        // handle reply for room change
        resetReplyState();

        // disable detecting last scroll for 2 seconds
        setLastScrollListenerActive(false);
        setTimeout(() => {
            setLastScrollListenerActive(true);
        }, 2000);
    }, [room]);

    // useEffect(() => {
    //     if (isMessageDeleted) {
    //         setIsMessageDeleted(false);
    //         getMsg();
    //         window.scrollTo(0, 0);
    //     }
    // }, [isMessageDeleted]);

    const scrollToMessage = (messageId: string, flashAnimation?: boolean) => {
        const msgEl = document.querySelector(
            '.messageBubble[data-message-id="' + messageId + '"]',
        );
        if (msgEl && messageListWrapper.current) {
            // messageListWrapper.current.scrollTop = messageListWrapper.current.scrollHeight - msgElOffsetTop + msgElHeight - messageListWrapper.current.getBoundingClientRect().height;
            setTimeout(() => {
                const target = calculateScrollTarget(messageId);
                if (messageListWrapper && messageListWrapper.current) {
                    messageListWrapper.current.scrollTop = target;
                    if (flashAnimation) {
                        setTimeout(() => {
                            msgEl.classList.add(styles.purple_flashed);

                            setTimeout(() => {
                                msgEl.classList.remove(styles.purple_flashed);
                            }, 1500);
                        }, 500);
                    }
                }
            }, 100);
        }
    };

    useEffect(() => {
        setIsScrollToBottomButtonPressed(false);
        scrollToBottom(true);
        setNotificationCount(0);

        if (isChatOpen) {
            setTimeout(() => {
                setLastScrollListenerActive(true);
            }, 1000);
            if (lastScrolledMessage && lastScrolledMessage.length > 0) {
                setTimeout(() => {
                    scrollToMessage(lastScrolledMessage);
                }, 700);
            }
        } else {
            setLastScrollListenerActive(false);
        }
    }, [isChatOpen]);

    useEffect(() => {
        if (scrollRevertTarget.length > 0) {
            const targetPos = calculateScrollTarget(scrollRevertTarget);
            scrollToInstant(targetPos);
            setScrollRevertTarget('');
        }

        const mentionsInScope = messages.filter((item) => {
            return item && item.mentionedWalletID == userAddress;
        });

        if (mentionIndex == -1) {
            setMentionIndex(mentionsInScope.length - 1);
        }

        if (messages.length == 0) return;
    }, [messages, setMessages]);

    function handleCloseChatPanel() {
        setIsChatOpen(false);
    }

    const scrollToBottomButton = async () => {
        if (!messageListWrapper.current) return;

        messageListWrapper.current.scrollTo(
            0,
            messageListWrapper.current.scrollHeight,
        );
        setTimeout(() => {
            if (!messageListWrapper.current) return;

            setIsScrollToBottomButtonPressed(true);
            messageListWrapper.current.scrollTo(
                0,
                messageListWrapper.current.scrollHeight,
            );
        }, 101);
        setScrollDirection('Scroll Down');
    };

    const getPreviousMessages = async () => {
        const nextPage = page + 1;
        setPage(nextPage);

        if (messages.length > 0) {
            setScrollRevertTarget(messages[0]._id);
        }

        const data =
            room === 'Admins'
                ? await getAllMessages(nextPage)
                : await getMsgWithRestWithPagination(room, nextPage);
        if (data.length === 0) {
            setShowPreviousMessagesButton(false);
        }
    };

    const scrollToBottom = async (
        bypassInterval?: boolean,
        bypassLastScrolled?: boolean,
        overrideTimeout?: number,
    ) => {
        if (notConnectedUserInterval && !bypassInterval) return;
        if (
            lastScrolledMessage &&
            lastScrolledMessage.length > 0 &&
            !bypassLastScrolled
        )
            return;

        const timeout = overrideTimeout ? overrideTimeout : 1000;
        const timer = setTimeout(() => {
            if (!messageListWrapper.current) return;
            messageListWrapper.current.scrollTo(
                0,
                messageListWrapper.current.scrollHeight,
            );
        }, timeout);
        setScrollDirection('Scroll Down');
        return () => clearTimeout(timer);
    };

    const getChatBubbleYPos = (bubbleEl?: Element, containerEl?: Element) => {
        if (bubbleEl === undefined || containerEl === undefined) return 0; // what is it?
        const elTop =
            bubbleEl?.getBoundingClientRect().top + containerEl?.scrollTop;
        return elTop - containerEl?.getBoundingClientRect().top;
    };

    const calculateScrollTarget = (messageId: string) => {
        if (
            messageListWrapper &&
            messageListWrapper.current &&
            messageId &&
            messageId.length > 0
        ) {
            const msgEl = document.querySelector(
                '.messageBubble[data-message-id="' + messageId + '"]',
            );
            if (msgEl) {
                const msgElOffsetTop = (msgEl as HTMLElement).offsetTop;
                const target = msgElOffsetTop - 120;

                return target;
            }
            return messageListWrapper.current.scrollHeight;
        }
        return 0;
    };

    const handleFocusedMessageOnScroll = () => {
        if (
            messageListWrapper &&
            messageListWrapper.current &&
            lastScrollListenerRef.current == true
        ) {
            const rect = messageListWrapper.current.getBoundingClientRect();
            const bubbles = document.querySelectorAll('.messageBubble');
            for (let i = 0; i < bubbles.length; i++) {
                const el = bubbles[i];
                if (el.getBoundingClientRect().top > rect.top) {
                    const msgId = el.getAttribute('data-message-id');
                    calculateScrollTarget(msgId ? msgId : '');
                    setLastScrolledMessage(msgId ? msgId : '');
                    break;
                }
            }
        }
    };

    const goToChartAction = () => {
        if (goToChartParams) {
            linkGenMarket.navigate({
                chain: goToChartParams?.chain,
                tokenA: goToChartParams?.tokenA,
                tokenB: goToChartParams?.tokenB,
            });
        }
        setGoToChartParams(undefined);
    };

    const mentions = messages.filter((item) => {
        return (
            item &&
            item.mentionedWalletID == userAddress &&
            userAddress !== undefined
        );
    });

    const checkMents = () => {
        const mentionElements = document.querySelectorAll('.mentionedMessage');
        if (
            messageListWrapper.current &&
            messageListWrapper.current.getBoundingClientRect() &&
            mentionElements.length > 0
        ) {
            const listRect = messageListWrapper.current.getBoundingClientRect();

            let showPrev = false;
            let showNext = false;

            for (let i = 0; i < mentionElements.length; i++) {
                const mentRect = mentionElements[i].getBoundingClientRect();
                if (mentRect.top < listRect.top) {
                    showPrev = true;
                }
                if (mentRect.bottom > listRect.bottom + 20) {
                    showNext = true;
                }
            }

            setShowPrevMents(showPrev);
            setShowNextMents(showNext);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleScroll = (e: any) => {
        if (lastScrollListenerRef.current === true) {
            if (isChatOpen && messageListWrapper.current) {
                const panelScrollHeight =
                    messageListWrapper.current.scrollHeight;
                const panelHeight =
                    messageListWrapper.current.getBoundingClientRect().height;
                const panelScrollTop = messageListWrapper.current.scrollTop;
                if (panelScrollHeight - panelHeight - panelScrollTop > 40) {
                    handleFocusedMessageOnScroll();
                } else {
                    setLastScrolledMessage('');

                    // setLastScrolledMessage('');
                }
            }
        }

        const tolerance = 0.6;

        if (
            e.target.scrollTop + e.target.clientHeight + tolerance >=
            e.target.scrollHeight
        ) {
            setNotificationCount(0);
            setIsScrollToBottomButtonPressed(false);
            setScrollDirection('Scroll Down');
        } else {
            if (e.target.scrollTop === 0) {
                setShowPreviousMessagesButton(true);
            } else {
                setShowPreviousMessagesButton(false);
            }
            setScrollDirection('Scroll Up');
        }
        setUserSummaryActive(false);
        checkMents();
    };

    const handleMentionSkipper = (way: number) => {
        if (
            messageListWrapper.current &&
            messageListWrapper.current.getBoundingClientRect()
        ) {
            let targetElement = null;
            const wrapperRect =
                messageListWrapper.current.getBoundingClientRect();
            // down
            const mentionElements =
                document.querySelectorAll('.mentionedMessage');
            if (way == 1) {
                for (let i = 0; i < mentionElements.length; i++) {
                    const mRect = mentionElements[i].getBoundingClientRect();
                    if (mRect.bottom > wrapperRect.bottom) {
                        targetElement = mentionElements[i];
                        break;
                    }
                }
            }
            // up
            else if (way === -1) {
                for (let i = mentionElements.length - 1; i >= 0; i--) {
                    const mRect = mentionElements[i].getBoundingClientRect();
                    if (mRect.top < wrapperRect.top) {
                        targetElement = mentionElements[i];
                        break;
                    }
                }
            }
            // last
            else {
                targetElement = mentionElements.item(
                    mentionElements.length - 1,
                );
            }

            if (targetElement != null) {
                messageListWrapper.current.scrollTop =
                    getChatBubbleYPos(
                        targetElement,
                        messageListWrapper.current,
                    ) - 40;
            }
        }
    };

    const verifyWallet = async (
        verificationType: ChatVerificationTypes,
        verificationDate: Date,
        e?: React.MouseEvent<HTMLDivElement>,
    ) => {
        if (e) e.stopPropagation();

        if (!isUserConnected) {
            activateToastr('Please connect your wallet first.', 'warning');
            return;
        }

        if (isVerified) return;

        try {
            await verifyWalletService(verificationDate);

            if (verificationType === ChatVerificationTypes.VerifyMessages) {
                activateToastr('Your wallet and messages verified!', 'success');
                setShowVerifyOldMessagesPanel(false);
                await updateUnverifiedMessages(verificationDate, new Date());
            } else {
                activateToastr('Your wallet is verified!', 'success');
                await updateUnverifiedMessages(new Date(0), new Date());
            }

            updateUserCache();
            setIsVerified(true);
        } catch (error) {
            console.error('Error during verification:', error);
            activateToastr('Verification failed. Please try again.', 'error');
        }
    };

    const resetReplyState = () => {
        setIsReplyButtonPressed(false);
        setSelectedMessageForReply(undefined);
    };

    const reactionPicker = (
        <div
            id='chatReactionWrapper'
            className={`${styles.reaction_picker_wrapper} ${showReactionPicker ? styles.active : ' '}`}
            ref={reactionsRef}
            style={{ bottom: pickerBottomPos }}
            onClick={(e) => e.stopPropagation()}
        >
            {isEmojiLoading ? (
                <div className={styles.emojiLoading}>Loading emojis...</div>
            ) : Picker && emojiData ? (
                <Picker
                    data={emojiData}
                    onEmojiSelect={addReactionEmojiPickListener}
                    theme='dark'
                    previewPosition='none'
                    skinTonePosition='none'
                    perLine={8}
                    emojiButtonSize={32}
                    emojiSize={20}
                />
            ) : (
                getEmojiPack(reactionCodes, addReactionEmojiPickListener, 30)
            )}
            <RiCloseCircleFill
                onClick={() => setShowReactionPicker(false)}
                className={styles.reaction_picker_close_button}
            />
        </div>
    );

    const closedHeader = !isMobile ? (
        <div
            className={styles.closedChatHeader}
            onClick={() => setIsChatOpen(true)}
        >
            <LuMessageSquareText size={24} color='white' strokeWidth={1} />
        </div>
    ) : null;

    const header =
        isChatOpen && !isMobile ? (
            <div
                className={styles.chat_header}
                onClick={() => {
                    setIsChatOpen(!isChatOpen);
                    // dismissSideBannerPopup && dismissSideBannerPopup();
                }}
            >
                <h2 className={styles.chat_title}>Trollbox</h2>

                {isChatOpen && ALLOW_AUTH && (
                    <div
                        ref={verifyBtnRef}
                        className={`${styles.verify_button} ${
                            isVerified && isUserConnected ? styles.verified : ''
                        } ${!isWsConnected ? styles.not_connected : ''}`}
                        onClick={(e) => verifyWallet(0, new Date(), e)}
                    >
                        {isModerator &&
                            isVerified &&
                            userAddress &&
                            isUserConnected && (
                                <AiOutlineUser
                                    className={`${styles.verify_button_icon} ${styles.verify_button_mod_icon} ${
                                        !isWsConnected
                                            ? styles.not_connected
                                            : ''
                                    }`}
                                    color='var(--other-green)'
                                    size={14}
                                />
                            )}
                        {isVerified && userAddress && isUserConnected ? (
                            <>
                                <AiOutlineCheck
                                    className={`${styles.verify_button_icon} ${
                                        !isWsConnected
                                            ? styles.not_connected
                                            : ''
                                    }`}
                                    color='var(--other-green)'
                                    size={10}
                                />
                            </>
                        ) : (
                            <>
                                <AiOutlineClose
                                    className={`${styles.verify_button_icon} ${
                                        !isWsConnected
                                            ? styles.not_connected
                                            : ''
                                    }`}
                                    size={10}
                                />
                                <span> Not Verified </span>
                            </>
                        )}
                    </div>
                )}

                <section style={{ paddingRight: '10px' }}>
                    {isFullScreen || !isChatOpen ? (
                        <></>
                    ) : (
                        // <<div
                        //     className={styles.open_full_button}
                        //     onClick={() =>
                        //         window.open('/chat/' + convertCurreny(room))
                        //     }
                        //     aria-label='Open chat in full screen'
                        // >
                        //     <img
                        //         src={ExpandChatIcon}
                        //         alt='Open chat in full screen'
                        //     />
                        // </div>>
                        <></>
                    )}
                    {isFullScreen || !isChatOpen ? (
                        <></>
                    ) : (
                        <IoIosArrowDown
                            size={22}
                            onClick={() => handleCloseChatPanel()}
                            role='button'
                            tabIndex={0}
                            aria-label='hide chat button'
                        />
                    )}
                    {!isChatOpen && (
                        <IoIosArrowUp
                            size={22}
                            role='button'
                            tabIndex={0}
                            aria-label='Open chat button'
                        />
                    )}
                </section>
            </div>
        ) : (
            closedHeader
        );

    let mentionIxdexPointer = 0;
    const messageList = (
        <div
            ref={messageListWrapper}
            className={styles.scrollable_div}
            onScroll={handleScroll}
            id='chatmessage'
        >
            {messages &&
                messages.map((item, i) => {
                    if (!item) {
                        return <></>;
                    }
                    if (item && item.mentionedWalletID === userAddress) {
                        mentionIxdexPointer += 1;
                    }
                    return (
                        <SentMessagePanel
                            key={i}
                            isUserLoggedIn={isUserConnected as boolean}
                            message={item}
                            ensName={ensName}
                            isCurrentUser={item && item.sender === currentUser}
                            currentUser={currentUser}
                            resolvedAddress={resolvedAddressFromContext}
                            connectedAccountActive={userAddress}
                            room={room}
                            isModerator={isModerator}
                            isMessageDeleted={isMessageDeleted}
                            setIsMessageDeleted={setIsMessageDeleted}
                            nextMessage={
                                i === messages.length - 1
                                    ? null
                                    : messages[i + 1]
                            }
                            previousMessage={i === 0 ? null : messages[i - 1]}
                            mentionIndex={
                                item && item.mentionedWalletID === userAddress
                                    ? mentionIxdexPointer - 1
                                    : undefined
                            }
                            updateLikeDislike={updateLikeDislike}
                            userMap={userMap}
                            verifyWallet={verifyWallet}
                            isUserVerified={isVerified}
                            showPopUp={showPopUp}
                            setShowPopUp={setShowPopUp}
                            popUpText={popUpText}
                            setPopUpText={setPopUpText}
                            isReplyButtonPressed={isReplyButtonPressed}
                            setIsReplyButtonPressed={setIsReplyButtonPressed}
                            setSelectedMessageForReply={
                                setSelectedMessageForReply
                            }
                            isSubscriptionsEnabled={isSubscriptionsEnabled}
                            isChatOpen={isChatOpen}
                            address={userAddress}
                            isDeleted={item && item.isDeleted}
                            deletedMessageText={item && item.deletedMessageText}
                            addReactionListener={reactionBtnListener}
                            isDeleteMessageButtonPressed={
                                isDeleteMessageButtonPressed
                            }
                            setIsDeleteMessageButtonPressed={
                                setIsDeleteMessageButtonPressed
                            }
                            deleteMsgFromList={deleteMsgFromList}
                            addReaction={addReaction}
                            mentionHoverListener={mentionHoverListener}
                            mentionMouseLeftListener={() => {
                                setUserSummaryActive(false);
                            }}
                            showDeleteConfirmation={showDeleteConfirmation}
                            setShowDeleteConfirmation={
                                setShowDeleteConfirmation
                            }
                            selectedMessageIdForDeletion={
                                selectedMessageIdForDeletion
                            }
                            setSelectedMessageIdForDeletion={
                                setSelectedMessageIdForDeletion
                            }
                            showVerifyWalletConfirmationInDelete={
                                showVerifyWalletConfirmationInDelete
                            }
                            setShowVerifyWalletConfirmationInDelete={
                                setShowVerifyWalletConfirmationInDelete
                            }
                            scrollToMessage={scrollToMessage}
                            setShowVerifyOldMessagesPanel={
                                setShowVerifyOldMessagesPanel
                            }
                            setVerifyOldMessagesStartDate={
                                setVerifyOldMessagesStartDate
                            }
                            isFocusMentions={isFocusMentions}
                            isMobile={isMobile}
                        />
                    );
                })}

            {/* WBO - Feature : User Summary */}

            <UserSummary
                isActive={userSummaryActive}
                // isActive={userSummaryActive && false}
                toBottom={userSummaryToBottom}
                user={selectedUserSummary}
                mouseLeaveListener={summaryMouseLeaveListener}
                mouseEnterListener={() => {
                    setUserSummaryActive(true);
                }}
                verticalPosition={userSummaryVerticalPosition}
                isCurrentUser={currentUser == selectedUserSummary?._id}
                showExtendedSummary={
                    isModerator || currentUser == selectedUserSummary?._id
                }
            />
        </div>
    );

    const chatNotification = (
        <div className={styles.chat_notification}>
            {notificationCount > 0 &&
            scrollDirection === 'Scroll Up' &&
            !isReplyButtonPressed &&
            !isScrollToBottomButtonPressed ? (
                isFullScreen ? (
                    <div className={styles.chat_notification}>
                        <span
                            style={{ marginTop: '-18px', cursor: 'pointer' }}
                            onClick={() => scrollToBottomButton()}
                        >
                            <BsChatLeftFill
                                size={25}
                                color='var(--accent1)'
                                style={{ cursor: 'pointer' }}
                            />
                            <span className={styles.text}>
                                {notificationCount}
                            </span>
                        </span>
                        <span style={{ marginTop: '-18px', cursor: 'pointer' }}>
                            <RiArrowDownSLine
                                role='button'
                                size={27}
                                color='var(--accent1)'
                                onClick={() => scrollToBottomButton()}
                                tabIndex={0}
                                aria-label='Scroll to bottom'
                                style={{ cursor: 'pointer' }}
                                title={'Scroll To Bottom'}
                                className={styles.scroll_to_bottom_icon}
                            />
                        </span>
                    </div>
                ) : (
                    <div className={styles.chat_notification}>
                        <span onClick={() => scrollToBottomButton()}>
                            <BsChatLeftFill
                                size={25}
                                color='var(--accent1)'
                                style={{ cursor: 'pointer' }}
                            />
                            <span className={styles.text}>
                                {notificationCount}
                            </span>
                        </span>
                        <span>
                            <RiArrowDownSLine
                                role='button'
                                size={27}
                                color='var(--accent1)'
                                onClick={() => scrollToBottomButton()}
                                tabIndex={0}
                                aria-label='Scroll to bottom button'
                                style={{ cursor: 'pointer' }}
                                title={'Scroll To Bottom'}
                            />
                        </span>
                    </div>
                )
            ) : scrollDirection === 'Scroll Up' &&
              notificationCount <= 0 &&
              !isReplyButtonPressed &&
              !isScrollToBottomButtonPressed ? (
                isFullScreen ? (
                    <span style={{ marginTop: '-18px', cursor: 'pointer' }}>
                        <RiArrowDownSLine
                            role='button'
                            size={32}
                            color='var(--accent1)'
                            onClick={() => scrollToBottomButton()}
                            tabIndex={0}
                            aria-label='Scroll to bottom'
                            style={{ cursor: 'pointer' }}
                            title={'Scroll To Bottom'}
                            className={styles.scroll_to_icon}
                        />
                    </span>
                ) : (
                    <span>
                        <RiArrowDownDoubleLine
                            role='button'
                            size={27}
                            color='var(--accent1)'
                            onClick={() => scrollToBottomButton()}
                            tabIndex={0}
                            aria-label='Scroll to bottom zzzz'
                            style={{ cursor: 'pointer' }}
                            title={'Scroll To Bottom'}
                            className={styles.scroll_to_icon}
                        />
                    </span>
                )
            ) : (
                ''
            )}
        </div>
    );

    const sendingLink = (
        <div className={styles.pop_up}>
            <p>{popUpText}</p>
            <div className={styles.close_button}>
                <IoIosClose
                    onClick={() => closePopUp()}
                    size={20}
                    role='button'
                    tabIndex={0}
                    aria-label='Close information box.'
                />
            </div>
        </div>
    );

    const sendMessageListener = () => {
        if (isChatOpen) {
            scrollToBottom(true, true, isMobile ? 700 : 400);
        }
    };

    const messageInput = (
        <MessageInput
            currentUser={currentUser as string}
            message={messages[0]}
            room={
                room === 'Current Pool'
                    ? baseToken.symbol + ' / ' + quoteToken.symbol
                    : room
            }
            ensName={ensName}
            appPage={props.appPage}
            sendMsg={sendMsg}
            inputListener={messageInputListener}
            users={users}
            showPopUp={showPopUp}
            setShowPopUp={setShowPopUp}
            popUpText={popUpText}
            setPopUpText={setPopUpText}
            isReplyButtonPressed={isReplyButtonPressed}
            setIsReplyButtonPressed={setIsReplyButtonPressed}
            isInputDisabled={isInputDisabled}
            sendMessageCooldown={sendMessageCooldown}
            selectedMessageForReply={selectedMessageforReply}
            setSelectedMessageForReply={setSelectedMessageForReply}
            sendMessageListener={sendMessageListener}
            isChatOpen={isChatOpen}
            isMobile={isMobile}
            userMap={userMap}
            chainId={activeNetwork.chainId}
            showCustomEmojiPanel={showCustomEmojiPanel}
            setShowCustomEmojiPanel={setShowCustomEmojiPanel}
            showPicker={showPicker}
            setShowPicker={setShowPicker}
        />
    );

    const mentSkipperComponent = () => {
        if (mentions.length > 0 && isChatOpen && isFocusMentions) {
            return (
                <>
                    {showPrevMents && (
                        <div
                            className={styles.ment_skip_button}
                            onClick={() => {
                                handleMentionSkipper(-1);
                            }}
                            title='Previous Mention'
                        >
                            <IoIosArrowUp size={22} />
                        </div>
                    )}
                    {showNextMents && (
                        <div
                            className={styles.ment_skip_button_down}
                            onClick={() => {
                                handleMentionSkipper(1);
                            }}
                            title='Next Mention'
                        >
                            <IoIosArrowDown size={22} />
                        </div>
                    )}
                    {showNextMents && (
                        <div
                            className={styles.ment_skip_button_last}
                            onClick={() => {
                                handleMentionSkipper(2);
                            }}
                            title='Last Mention'
                        >
                            <IoIosArrowDown size={22} />
                            Last Mention
                        </div>
                    )}
                </>
            );
        }

        return <></>;
    };

    const handleConfirmDelete = async () => {
        deleteMsgFromList(selectedMessageIdForDeletion);
        setShowDeleteConfirmation(false);
    };

    const handleCancelDelete = () => {
        setShowDeleteConfirmation(false);
    };

    const rndPreviousMessagesButton = () => {
        return (
            <div className={styles.scroll_up}>
                {showPreviousMessagesButton ? (
                    <RiArrowUpDoubleLine
                        role='button'
                        size={27}
                        color='var(--accent1)'
                        onClick={() => getPreviousMessages()}
                        tabIndex={0}
                        aria-label='Show previous messages'
                        style={{ cursor: 'pointer' }}
                        title='Show previous messages'
                        className={styles.scroll_to_icon}
                    />
                ) : (
                    ''
                )}
            </div>
        );
    };

    const contentHeight = isChatOpen ? '479px' : '30px';
    if (props.appPage)
        return (
            <>
                <FullChat
                    messageList={messageList}
                    setIsChatOpen={setIsChatOpen}
                    chatNotification={chatNotification}
                    messageInput={messageInput}
                    userName={
                        userAddress && !ens
                            ? trimString(userAddress as string, 6, 0, '…')
                            : (ens as string)
                    }
                    setRoom={setRoom}
                    setIsCurrentPool={setIsCurrentPool}
                    showCurrentPoolButton={showCurrentPoolButton}
                    setShowCurrentPoolButton={setShowCurrentPoolButton}
                    userCurrentPool={userCurrentPool}
                    favoritePools={favoritePools}
                    setFavoritePools={setFavoritePools}
                    isChatOpen={isChatOpen}
                    isVerified={isVerified}
                    isModerator={isModerator}
                    verifyWallet={verifyWallet}
                    toastrActive={toastrActive}
                    toastrActivator={setToastrActive}
                    toastrText={toastrText}
                    toastrType={toastrType}
                    showVerifyOldMessagesPanel={showVerifyOldMessagesPanel}
                    activateToastr={activateToastr}
                    updateUnverifiedMessages={updateUnverifiedMessages}
                    verifyOldMessagesStartDate={verifyOldMessagesStartDate}
                    setShowVerifyOldMessagesPanel={
                        setShowVerifyOldMessagesPanel
                    }
                    showPicker={showPicker}
                    setShowPicker={setShowPicker}
                    addReactionEmojiPickListener={addReactionEmojiPickListener}
                    showDeleteConfirmation={showDeleteConfirmation}
                    handleConfirmDelete={handleConfirmDelete}
                    handleCancelDelete={handleCancelDelete}
                    rndShowPreviousMessages={rndPreviousMessagesButton}
                    room={room}
                    isFocusMentions={isFocusMentions}
                    setIsFocusMentions={setIsFocusMentions}
                    isCurrentPool={isCurrentPool}
                    ensName={ensName}
                    currentUser={currentUser}
                    notifications={notifications}
                    mentCount={mentions.length}
                    mentionIndex={mentionIndex}
                    setGoToChartParams={setGoToChartParams}
                    setUserCurrentPool={setUserCurrentPool}
                    rndMentSkipper={mentSkipperComponent}
                    messageForNotificationBubble={messageForNotificationBubble}
                    setMessageForNotificationBubble={
                        setMessageForNotificationBubble
                    }
                    setSelectedMessageForReply={setSelectedMessageForReply}
                    setIsReplyButtonPressed={setIsReplyButtonPressed}
                    showReactionPicker={showReactionPicker}
                    reactionPicker={reactionPicker}
                />
            </>
        );

    return (
        <div
            className={`${styles.main_container} ${isChatOpen && !isMobile ? styles.chat_open : styles.chat_closed}`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onClick={(e: any) => e.stopPropagation()}
        >
            <ChatNotificationBubble
                message={messageForNotificationBubble}
                setRoom={setRoom}
                setSelectedMessageForReply={setSelectedMessageForReply}
                setIsReplyButtonPressed={setIsReplyButtonPressed}
                setMessageForNotificationBubble={
                    setMessageForNotificationBubble
                }
            />

            <div
                className={styles.modal_body}
                style={{ height: contentHeight, width: '100%' }}
            >
                <div className={styles.chat_body}>
                    <div
                        className={`${styles.btn_go_to_chart} ${
                            goToChartParams != undefined ? styles.active : ''
                        }`}
                        onClick={goToChartAction}
                    >
                        Go to Chart
                    </div>
                    {header}
                    {isChatOpen && (
                        <Room
                            selectedRoom={room}
                            setRoom={setRoom}
                            room={room}
                            setIsCurrentPool={setIsCurrentPool}
                            isCurrentPool={isCurrentPool}
                            showCurrentPoolButton={showCurrentPoolButton}
                            setShowCurrentPoolButton={setShowCurrentPoolButton}
                            userCurrentPool={userCurrentPool}
                            setUserCurrentPool={setUserCurrentPool}
                            currentUser={currentUser}
                            ensName={ensName}
                            setIsFocusMentions={setIsFocusMentions}
                            notifications={notifications}
                            mentCount={mentions.length}
                            mentionIndex={mentionIndex}
                            isModerator={isModerator}
                            isFocusMentions={isFocusMentions}
                            setGoToChartParams={setGoToChartParams}
                            isChatOpen={isChatOpen}
                        />
                    )}

                    <DividerDark changeColor addMarginTop addMarginBottom />
                    {rndPreviousMessagesButton()}
                    {messageList}
                    {showPopUp ? sendingLink : ''}
                    {chatNotification}

                    {isChatOpen && showReactionPicker && (
                        <div
                            id='chatReactionWrapper'
                            className={`${styles.reaction_picker_wrapper} ${showReactionPicker ? styles.active : ' '}`}
                            ref={reactionsRef}
                            style={{ bottom: pickerBottomPos }}
                        >
                            {getEmojiPack(
                                reactionCodes,
                                addReactionEmojiPickListener,
                                30,
                            )}
                            <RiCloseCircleFill
                                onClick={() => setShowReactionPicker(false)}
                                className={styles.reaction_picker_close_button}
                            />
                        </div>
                    )}
                    {messageInput}
                    <div id='thelastmessage' />
                </div>
            </div>

            {mentSkipperComponent()}

            <ChatConfirmationPanel
                isActive={showDeleteConfirmation && isChatOpen}
                title='Delete Message'
                content='Are you sure you want to delete this message?'
                confirmListener={handleConfirmDelete}
                cancelListener={handleCancelDelete}
            />

            <ChatConfirmationPanel
                isActive={showVerifyOldMessagesPanel && isChatOpen}
                title='Verify Old Messages'
                content='Please verify your wallet address in order to authenticate previous messages.'
                cancelListener={() => {
                    setShowVerifyOldMessagesPanel(false);
                }}
                confirmListener={async () => {
                    setShowVerifyOldMessagesPanel(false);
                    await updateUnverifiedMessages(
                        verifyOldMessagesStartDate,
                        new Date(),
                    );
                    activateToastr('Old messages are verified!', 'success');
                }}
            />
            <ChatConfirmationPanel
                isActive={showVerifyWalletConfirmationInDelete && isChatOpen}
                title='Verify Your Wallet'
                content='Please verify your wallet address in order to delete this message.'
                cancelListener={() => {
                    setShowVerifyWalletConfirmationInDelete(false);
                }}
                confirmListener={async (e) => {
                    try {
                        verifyWallet(0, new Date(), e);
                        setShowVerifyWalletConfirmationInDelete(false);
                    } catch (error) {
                        console.error('Error in confirmListener:', error);
                    }
                }}
            />
            <ChatToaster
                isActive={toastrActive && isChatOpen}
                activator={setToastrActive}
                text={toastrText}
                type={toastrType}
            />

            <DomDebugger />
        </div>
    );
}

export default memo(ChatPanel);
