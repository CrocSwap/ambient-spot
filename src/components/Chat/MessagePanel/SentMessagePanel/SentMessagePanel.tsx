import {
    Dispatch,
    SetStateAction,
    memo,
    useEffect,
    useRef,
    useState,
} from 'react';
import { AiOutlineCheck } from 'react-icons/ai';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    DefaultTooltip,
    TextOnlyTooltip,
} from '../../../Global/StyledTooltip/StyledTooltip';
import { Message } from '../../Model/MessageModel';
import { User, getUserLabelForReactions } from '../../Model/UserModel';
import useChatApi from '../../Service/ChatApi';
import PositionBox from '../PositionBox/PositionBox';

import { lookupChain } from '@crocswap-libs/sdk/dist/context';
import { IoReturnUpForwardSharp } from 'react-icons/io5';
import ethLogo from '../../../../assets/images/networks/ethereum_logo.svg';
import scrollLogo from '../../../../assets/images/networks/scroll_logo_no_margin.webp';
import {
    ALLOW_AUTH,
    ALLOW_REACTIONS,
    ALLOW_REPLIES,
    BASIC_CHAT_MODE,
    REGEX_EMOJI,
    REGEX_NOT_EMOJI,
} from '../../ChatConstants/ChatConstants';
import { ChatVerificationTypes } from '../../ChatEnums';
import { LikeDislikePayload, MentFoundParam } from '../../ChatIFs';
import { getAvatarForChat } from '../../ChatRenderUtils';
import {
    getShownName,
    hasEns,
    isChainNameTestnet,
    isLinkInCrocodileLabsLinksForInput,
    isValidUrl,
} from '../../ChatUtils';
import Options from '../Options/Options';
import ReplyMessage from '../ReplyMessage/ReplyMessage';
import styles from './SentMessagePanel.module.css';

interface SentMessageProps {
    message: Message;
    ensName: string;
    isCurrentUser: boolean;
    currentUser: string | undefined;
    resolvedAddress: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connectedAccountActive: any;
    isUserLoggedIn: boolean;
    isModerator: boolean;
    room: string;
    isMessageDeleted: boolean;
    setIsMessageDeleted: Dispatch<SetStateAction<boolean>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previousMessage: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nextMessage: any;
    mentionIndex?: number;
    updateLikeDislike: (messageId: string, like: LikeDislikePayload) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userMap?: Map<string, User>;
    verifyWallet: (
        verificationType: number,
        startDate: Date,
        e?: React.MouseEvent<HTMLDivElement>,
    ) => void;
    isUserVerified: boolean;
    showPopUp: boolean;
    setShowPopUp: Dispatch<SetStateAction<boolean>>;
    popUpText: string;
    setPopUpText: Dispatch<SetStateAction<string>>;
    isReplyButtonPressed: boolean;
    setIsReplyButtonPressed: Dispatch<SetStateAction<boolean>>;
    setSelectedMessageForReply: Dispatch<SetStateAction<Message | undefined>>;
    isSubscriptionsEnabled: boolean;
    address: string | undefined;
    isChatOpen: boolean;
    isDeleted: boolean;
    deletedMessageText: string;
    addReactionListener: (
        e: React.MouseEvent<HTMLDivElement>,
        message?: Message,
    ) => void;
    isDeleteMessageButtonPressed: boolean;
    setIsDeleteMessageButtonPressed: Dispatch<SetStateAction<boolean>>;
    deleteMsgFromList: (msgId: string) => void;
    addReaction: (messageId: string, userId: string, reaction: string) => void;
    mentionHoverListener: (elementTop: number, walletID: string) => void;
    mentionMouseLeftListener: () => void;
    showDeleteConfirmation: boolean;
    setShowDeleteConfirmation: Dispatch<SetStateAction<boolean>>;
    setSelectedMessageIdForDeletion: React.Dispatch<
        React.SetStateAction<string>
    >;
    selectedMessageIdForDeletion: string;
    setShowVerifyWalletConfirmationInDelete: Dispatch<SetStateAction<boolean>>;
    showVerifyWalletConfirmationInDelete: boolean;
    scrollToMessage: (messageId: string, flashAnimation?: boolean) => void;
    setShowVerifyOldMessagesPanel: Dispatch<SetStateAction<boolean>>;
    setVerifyOldMessagesStartDate: Dispatch<SetStateAction<Date>>;
    isFocusMentions: boolean;
    isMobile: boolean;
}

function SentMessagePanel(props: SentMessageProps) {
    const { deleteMsgFromList } = props;
    const [isMoreButtonPressed, setIsMoreButtonPressed] = useState(false);
    const [hasSeparator, setHasSeparator] = useState(false);
    const [isPosition, setIsPosition] = useState(false);
    const [showAvatar, setShowAvatar] = useState<boolean>(true);
    const [showName, setShowName] = useState<boolean>(true);
    const [daySeparator, setdaySeparator] = useState('');
    const [flipped, setFlipped] = useState(false);
    const [flipRead, setFlipRead] = useState(false);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [count, setCount] = useState(0);
    const [timestampForChildRefresh, setTimestampForChildRefresh] = useState(
        new Date().getTime(),
    );

    const likeCount = props.message.likes ? props.message.likes.length : 0;
    const dislikeCount = props.message.dislikes
        ? props.message.dislikes.length
        : 0;

    const { getRepliedMessageInfo } = useChatApi();

    const navigate = useNavigate();
    const location = useLocation();

    const checkRegex = props.message.message.match(REGEX_EMOJI);

    const onlyEmoji =
        !REGEX_NOT_EMOJI.test(props.message.message) &&
        checkRegex != null &&
        checkRegex.length < 6 &&
        props.message.message.length < 6;

    const handleInitialLikeDislike = () => {
        let retVal = 0;
        const liked = props.message.likes?.filter(
            (e) => e === props.currentUser,
        );
        const disliked = props.message.dislikes?.filter(
            (e) => e === props.currentUser,
        );

        if (liked && disliked) {
            retVal = liked?.length > 0 ? 1 : disliked?.length > 0 ? -1 : 0;
        }

        return retVal;
    };

    const messageVoted = handleInitialLikeDislike();

    const [processedReactions, setProcessedReactions] = useState<string[]>([]);
    const [hasUserReacted, setHasUserReacted] = useState<boolean>(false);
    const [repliedMesssage, setRepliedMessage] = useState<
        Message | undefined
    >();

    useEffect(() => {
        const previousMessageDate = new Date(props.previousMessage?.createdAt);
        const currentMessageDate = new Date(props.message?.createdAt);
        const nextMessageDate = new Date(props.nextMessage?.createdAt);
        const currentPreviousDiffInMs = Math.abs(
            currentMessageDate.getTime() - previousMessageDate.getTime(),
        );
        const nextCurrentDiffInMs = Math.abs(
            nextMessageDate.getTime() - currentMessageDate.getTime(),
        );
        getDayAndName(
            props.previousMessage?.createdAt,
            props.message?.createdAt,
        );

        // checks verify or chain diff for same user
        const checkForDiff = (msg1: Message, msg2: Message) => {
            return (
                msg1.sender === msg2.sender &&
                (msg1.isVerified !== msg2.isVerified ||
                    msg1.chainId !== msg2.chainId)
            );
        };

        if (props.previousMessage?.sender === props.message?.sender) {
            if (currentPreviousDiffInMs < 1 * 60 * 1000) {
                setShowAvatar(
                    checkForDiff(props.previousMessage, props.message),
                );
                setShowName(checkForDiff(props.previousMessage, props.message));
                if (
                    nextCurrentDiffInMs < 1 * 60 * 1000 &&
                    props.nextMessage?.sender === props.message?.sender
                ) {
                    setHasSeparator(
                        checkForDiff(props.nextMessage, props.message),
                    );
                } else {
                    setHasSeparator(true);
                }
            } else {
                if (
                    nextCurrentDiffInMs < 1 * 60 * 1000 &&
                    props.message?.sender === props.nextMessage?.sender
                ) {
                    setShowAvatar(
                        checkForDiff(props.nextMessage, props.message),
                    );
                    setShowAvatar(true);
                    setShowName(true);
                    setHasSeparator(
                        checkForDiff(props.nextMessage, props.message),
                    );
                } else {
                    setShowAvatar(true);
                    setShowName(true);
                    setHasSeparator(true);
                }
            }
        } else {
            setShowAvatar(true);
            setShowName(true);
            if (
                nextCurrentDiffInMs < 1 * 60 * 1000 &&
                props.nextMessage?.sender === props.message?.sender
            ) {
                setHasSeparator(false);
            } else {
                setHasSeparator(true);
            }
        }
    }, [props.message, props.nextMessage, props.previousMessage]);

    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsMoreButtonPressed(false);
            }
        };

        document.addEventListener('click', handleClickOutside);

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [setIsMoreButtonPressed]);

    useEffect(() => {
        if (
            props.previousMessage &&
            props.message &&
            props.previousMessage.sender === props.message.sender
        ) {
            const previousMessageDate = new Date(
                props.previousMessage.createdAt,
            );
            const currentMessageDate = new Date(props.message.createdAt);
            const currentPreviousDiffInMs = Math.abs(
                currentMessageDate.getTime() - previousMessageDate.getTime(),
            );

            if (currentPreviousDiffInMs < 1 * 60 * 1000) {
                setCount((prevCount) => prevCount + 1);
            } else {
                setCount(0);
            }
        } else {
            setCount(0);
        }
    }, [props.previousMessage, props.message]);

    useEffect(() => {
        if (props.message.repliedMessage && ALLOW_REPLIES) {
            getReplyMessageInfo(props.message.repliedMessage as string);
        }
        const processed = processReactionsV2();
        let hasFound = false;
        processed.map((e) => {
            if (isUserIncluded(e)) {
                setHasUserReacted(true);
                hasFound = true;
            }
        });
        if (!hasFound) {
            setHasUserReacted(false);
        }
    }, [props.message, props.message.reactions, props.currentUser]);

    const formatAMPM = (str: string) => {
        const date = new Date(str);
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const _min = minutes.toString().padStart(2, '0');
        const strTime = hours + ':' + _min + ' ' + ampm;
        return strTime;
    };

    const getDayAndName = (previousDay: string, currentDay: string) => {
        const today = new Date();
        const previousMessageDate = new Date(previousDay);
        const currentMessageDate = new Date(currentDay);
        const todayDayNumber = today.getUTCDate();
        const todayMonthNumber = today.toLocaleString('default', {
            month: 'long',
        });
        const previousDayNumber = previousMessageDate.getUTCDate();
        const currentDayNumber = currentMessageDate.getUTCDate();
        const currentDayMonthNumber = currentMessageDate.toLocaleString(
            'default',
            {
                month: 'long',
            },
        );
        if (
            todayDayNumber === currentDayNumber &&
            todayMonthNumber === currentDayMonthNumber &&
            previousDayNumber !== currentDayNumber
        ) {
            setdaySeparator('Today');
        } else {
            if (previousDayNumber !== currentDayNumber) {
                setdaySeparator(currentDayNumber + ' ' + currentDayMonthNumber);
            } else {
                setdaySeparator('');
            }
        }
    };

    function handleOpenExplorerAddHttp(url: string) {
        if (!url.includes('https')) {
            window.open(convertToFullUrl(url));
        } else {
            window.open(url);
        }
    }

    function convertToFullUrl(domain: string): string {
        const protocol = 'https://';
        return protocol + domain;
    }

    function buildMessageToken(word: string, mentFound: MentFoundParam) {
        let ret = <></>;
        if (isLinkInCrocodileLabsLinksForInput(word) && isValidUrl(word)) {
            ret = (
                <span
                    className={styles.link_token}
                    onClick={() => {
                        handleOpenExplorerAddHttp(word);
                    }}
                >
                    {word}
                </span>
            );
        } else {
            if (
                mentFound.val == false &&
                word.indexOf('@') >= 0 &&
                props.message.mentionedWalletID
            ) {
                mentFound.val = true;

                ret = (
                    <>
                        <span> {word.slice(0, word.lastIndexOf('@'))} </span>
                        <span
                            onClick={() => {
                                goToMentionedProfile(
                                    word.slice(
                                        word.lastIndexOf('@'),
                                        word.length,
                                    ),
                                    props.message.mentionedWalletID,
                                );
                                // props.mentionHoverListener(
                                //     e.currentTarget.getBoundingClientRect()
                                //         .top - (props.isMobile ? 40 : 0),
                                //     props.message.mentionedWalletID,
                                // );
                            }}
                            // onMouseLeave={props.mentionMouseLeftListener}
                            className={styles.mentioned_name_token}
                        >
                            {word.slice(word.lastIndexOf('@'), word.length)}
                        </span>
                    </>
                );
            } else {
                ret = <span> {word} </span>;
            }
        }
        return ret;
    }

    function renderMessage() {
        const messagesArray = props.message.message.split(' ');
        const mentFound = { val: false };

        return (
            <div
                className={` ${styles.message_block_wrapper}
                                ${
                                    showAvatar == true
                                        ? ' '
                                        : styles.without_avatar
                                }
        `}
            >
                <div
                    className={
                        styles.message_block +
                        ' ' +
                        (props.message.isVerified == true
                            ? styles.vrf_msg_dbg
                            : '') +
                        ' ' +
                        (onlyEmoji ? styles.only_emoji : '')
                    }
                >
                    {messagesArray.map((e, i) => {
                        return (
                            <span key={i} className={styles.message_token}>
                                {buildMessageToken(e, mentFound)}
                            </span>
                        );
                    })}
                </div>
                <div className={styles.roomInfo}>
                    {' '}
                    {props.room === 'Admins' ? props.message.roomInfo : ''}
                </div>
            </div>
        );
    }

    function getReplyMessageInfo(_id: string) {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        getRepliedMessageInfo(_id).then((result: any) => {
            setRepliedMessage(result[0]);
        });
    }

    function handleLikeAndDislikeLS(messageId: string, val: number) {
        const currObj = localStorage.getItem('lkds');
        let newObj = {};
        if (currObj != null && currObj != undefined) {
            newObj = { ...JSON.parse(currObj), [messageId]: val };
        } else {
            newObj = { [messageId]: val };
        }
        localStorage.setItem('lkds', JSON.stringify(newObj));

        const payloadObj = {
            userId: props.currentUser,
            actionType: val,
        };

        props.updateLikeDislike(props.message._id, payloadObj);
    }

    function getReactionUsers(reaction: string) {
        const ret = [''];
        if (
            props.message.reactions != undefined &&
            props.message.reactions[reaction]
        ) {
            props.message.reactions[reaction].map((user: string) => {
                const userObj = props.userMap?.get(user);
                if (userObj) {
                    if (userObj._id == props.currentUser) {
                        const temp = ret[1];
                        ret[1] = 'You';
                        ret.push(temp);
                    } else {
                        ret.push(getUserLabelForReactions(userObj));
                    }
                }
            });
        }

        ret.splice(0, 1);
        if (ret.length > 5) {
            const moreCount = ret.length - 5;
            ret.splice(5, ret.length - 5);
            ret.push('...');
            ret.push(moreCount.toString() + ' more');
        }

        return ret;
    }

    function processReactionsV2() {
        if (props.message.reactions && Object.keys(props.message.reactions)) {
            const emojiCounts = Object.keys(props.message.reactions).map(
                (emoji) => ({
                    emoji,
                    count: props.message.reactions[emoji].length,
                }),
            );

            emojiCounts.sort((a, b) => b.count - a.count);

            const ret = [''];

            emojiCounts.map((e) => {
                ret.push(e.emoji);
            });
            // return ret.slice(1, 4);

            const processedReactions = ret.slice(1, 4);
            setProcessedReactions(processedReactions);
            return processedReactions;
        }

        return [];
    }

    function isUserIncluded(reaction: string) {
        let ret = false;
        if (props.message.reactions != undefined) {
            props.message.reactions[reaction].map((user: string) => {
                if (user === props.currentUser) {
                    ret = true;
                }
            });
        }
        return ret;
    }

    const optionsButtonRef = useRef<HTMLDivElement>(null);

    function shouldOptionsRiseToBottom() {
        const wrapper = document.getElementById('chatmessage');
        if (wrapper && optionsButtonRef.current) {
            const tresholdPoint =
                wrapper.getBoundingClientRect().height / 4 +
                wrapper.getBoundingClientRect().top;
            return (
                tresholdPoint >
                optionsButtonRef.current.getBoundingClientRect().top
            );
        }
        return false;
    }

    function goToMentionedProfile(
        mentionStr: string,
        mentionedWalletID: string,
    ) {
        const targetStr = props.mentionIndex
            ? 'account'
            : mentionStr.indexOf('.eth') >= 0
              ? mentionStr.replace('@', '').replace(',', '')
              : mentionedWalletID;
        if (location.pathname != `/${targetStr}`) {
            navigate(`/${targetStr}`);
        }
    }

    function goToProfilePage() {
        if (
            location.pathname !==
            `/${
                props.message.ensName === 'defaultValue'
                    ? props.message.walletID
                    : props.message.ensName
            }`
        ) {
            navigate(
                `/${
                    props.isCurrentUser
                        ? 'account'
                        : !hasEns(props.message)
                          ? props.message.walletID
                          : props.message.ensName
                }`,
            );
        }
    }

    return (
        <div
            data-message-id={props.message._id}
            data-message-content={props.message.message}
            className={`${styles.msg_bubble_container} messageBubble ${
                props.mentionIndex !== undefined
                    ? 'mentionedMessage mentIndex-' + props.mentionIndex
                    : ''
            }  ${flipped ? styles.flipped : ''}  ${
                flipRead ? styles.flip_read : ''
            } 
            ${
                props.message.repliedMessage && ALLOW_REPLIES
                    ? styles.replied_message_container
                    : ' '
            }

            ${hasSeparator ? styles.has_separator : ''}
            ${
                props.message.mentionedWalletID === props.address &&
                props.isFocusMentions &&
                props.address
                    ? styles.reader_mentioned
                    : ''
            }

            ${
                shouldOptionsRiseToBottom() && isMoreButtonPressed
                    ? styles.rise_to_bottom_wrapper
                    : ''
            }
            ${daySeparator !== '' ? styles.has_day_separator : ''} 
            ${showAvatar ? styles.thread_top_msg : ''} 

            ${props.message.isDeleted ? styles.deleted_msg : ''}

            ${props.room == 'Admins' ? styles.admin_room_msg : ''}
            `}
            data-ment-index={props.mentionIndex}
            onMouseEnter={() => {
                // setIsMoreButtonPressed(false);
                setTimestampForChildRefresh(new Date().getTime());
            }}
            onClick={() => {
                props.mentionMouseLeftListener();
            }}
        >
            {!props.message.isDeleted || props.isModerator ? (
                <div className={styles.msg_bubble_content}>
                    <div className={styles.msg_bubble_front}>
                        {/* <div
                            className={styles.flip_trigger}
                            onClick={() => {
                                setFlipped(true);
                            }}
                        ></div> */}

                        {props.address && !props.message.isDeleted && (
                            <div
                                ref={optionsButtonRef}
                                className={styles.options_button}
                            >
                                <Options
                                    setIsReplyButtonPressed={
                                        props.setIsReplyButtonPressed
                                    }
                                    message={props.message}
                                    isReplyButtonPressed={
                                        props.isReplyButtonPressed
                                    }
                                    setSelectedMessageForReply={
                                        props.setSelectedMessageForReply
                                    }
                                    addReactionListener={
                                        props.addReactionListener
                                    }
                                    tooltipTop={shouldOptionsRiseToBottom()}
                                    isModerator={props.isModerator}
                                    isUsersMessage={
                                        props.message.sender ===
                                        props.currentUser
                                    }
                                    setFlipped={() => {
                                        setFlipped(true);
                                        setFlipRead(true);
                                    }}
                                    isUserVerified={props.isUserVerified}
                                    tsForRefresh={timestampForChildRefresh}
                                    deleteMessageFromList={deleteMsgFromList}
                                    showDeleteConfirmation={
                                        props.showDeleteConfirmation
                                    }
                                    setShowDeleteConfirmation={
                                        props.setShowDeleteConfirmation
                                    }
                                    setSelectedMessageIdForDeletion={
                                        props.setSelectedMessageIdForDeletion
                                    }
                                    selectedMessageIdForDeletion={
                                        props.selectedMessageIdForDeletion
                                    }
                                    setShowVerifyWalletConfirmationInDelete={
                                        props.setShowVerifyWalletConfirmationInDelete
                                    }
                                    showVerifyWalletConfirmationInDelete={
                                        props.showVerifyWalletConfirmationInDelete
                                    }
                                />
                            </div>
                        )}

                        <div>
                            {daySeparator === '' ? (
                                ''
                            ) : daySeparator !== '' ? (
                                <p
                                    className={
                                        styles.separator +
                                        ' ' +
                                        styles.day_separator
                                    }
                                >
                                    {daySeparator}
                                </p>
                            ) : (
                                ''
                            )}
                            {/* {'repliedMessage' in props.message &&
                                (showAvatar ? (
                                    <IoReturnUpForwardSharp
                                        style={{
                                            position: 'absolute',
                                            top: '-0.3rem',
                                            left: '0.6rem',
                                        }}
                                    />
                                ) : (
                                    <IoReturnUpForwardSharp
                                        style={{
                                            position: 'absolute',
                                            top: '-0.3rem',
                                            left: '0.6rem',
                                            transform: 'scaleY(-1)',
                                        }}
                                    />
                                ))} */}
                            {props.message.repliedMessage && ALLOW_REPLIES && (
                                <IoReturnUpForwardSharp
                                    className={
                                        styles.replied_message_arrow +
                                        ' ' +
                                        (showAvatar ? styles.has_avatar : ' ')
                                    }
                                />
                            )}

                            {props.message.repliedMessage && ALLOW_REPLIES ? (
                                <div className={styles.replied_box}>
                                    <ReplyMessage
                                        isReplyButtonPressed={false}
                                        currentUserId={props.currentUser}
                                        messageObj={repliedMesssage}
                                        repliedMessageBoxClickListener={() => {
                                            props.scrollToMessage(
                                                props.message
                                                    .repliedMessage as string,
                                                true,
                                            );
                                        }}
                                        userMap={props.userMap}
                                    />
                                </div>
                            ) : (
                                ''
                            )}
                            <div
                                className={
                                    props.isUserLoggedIn
                                        ? props.message.isMentionMessage ===
                                          false
                                            ? styles.sent_message_body
                                            : props.message.mentionedName?.trim() ===
                                                    props.ensName?.trim() ||
                                                props.message.mentionedName?.trim() ===
                                                    props.connectedAccountActive?.trim()
                                              ? styles.sent_message_body_with_mention
                                              : styles.sent_message_body
                                        : styles.sent_message_body
                                }
                            >
                                {showAvatar && (
                                    <div
                                        // onMouseLeave={props.mentionMouseLeftListener}
                                        // onMouseEnter={(e) => {
                                        //     props.mentionHoverListener(
                                        //         e.currentTarget.getBoundingClientRect().top,
                                        //         props.message.walletID,
                                        //     );
                                        // }}
                                        className={styles.avatar_jazzicons}
                                        onClick={goToProfilePage}
                                    >
                                        {/* {myJazzicon} */}
                                        {!BASIC_CHAT_MODE &&
                                            props.message &&
                                            props.message.chainId &&
                                            props.room === 'Admins' && (
                                                <img
                                                    className={`${styles.chain_logo} ${isChainNameTestnet(lookupChain(props.message.chainId).displayName) ? styles.testnet : ' '} `}
                                                    src={
                                                        [
                                                            '0x82750',
                                                            '0x8274f',
                                                        ].includes(
                                                            props.message
                                                                .chainId,
                                                        )
                                                            ? scrollLogo
                                                            : ethLogo
                                                    }
                                                ></img>
                                            )}
                                        {getAvatarForChat(
                                            props.message.walletID,
                                            props.userMap?.get(
                                                props.message.sender,
                                            ),
                                        )}
                                    </div>
                                )}
                                {!showAvatar && (
                                    <div
                                        style={{
                                            display: 'none',
                                            marginLeft: '10px',
                                        }}
                                    >
                                        <div className={styles.nft_container}>
                                            {/* {myJazzicon} */}
                                            {getAvatarForChat(
                                                props.message.walletID,
                                                props.userMap?.get(
                                                    props.message.sender,
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className={styles.message_item}>
                                    <div
                                        className={
                                            showName && props.isCurrentUser
                                                ? styles.current_user_name +
                                                  ' ' +
                                                  styles.name_default
                                                : showName &&
                                                    !props.isCurrentUser
                                                  ? styles.name +
                                                    ' ' +
                                                    styles.name_default
                                                  : !showName &&
                                                      !props.isCurrentUser
                                                    ? ''
                                                    : ''
                                        }
                                    >
                                        <span
                                            className={
                                                styles.name_default_label
                                            }
                                            onClick={goToProfilePage}
                                        >
                                            {showName &&
                                                getShownName(props.message)}
                                        </span>
                                        {showAvatar &&
                                            props.message.isVerified &&
                                            ALLOW_AUTH && (
                                                <div
                                                    className={
                                                        styles.verified_icon
                                                    }
                                                >
                                                    <AiOutlineCheck
                                                        color='var(--other-green)'
                                                        size={10}
                                                    />
                                                </div>
                                            )}

                                        {showAvatar &&
                                            !props.message.isVerified &&
                                            ALLOW_AUTH &&
                                            props.isCurrentUser && (
                                                <>
                                                    <DefaultTooltip
                                                        title={
                                                            'Verify this message'
                                                        }
                                                        placement={'left'}
                                                        arrow
                                                        enterDelay={400}
                                                        leaveDelay={200}
                                                    >
                                                        <div
                                                            className={
                                                                styles.update_verify_date_icon
                                                            }
                                                            onClick={() => {
                                                                if (
                                                                    !props.isUserVerified
                                                                ) {
                                                                    props.verifyWallet(
                                                                        ChatVerificationTypes.VerifyMessages,
                                                                        new Date(
                                                                            props
                                                                                .message
                                                                                .createdAt,
                                                                        ),
                                                                    );
                                                                } else {
                                                                    props.setShowVerifyOldMessagesPanel(
                                                                        true,
                                                                    );
                                                                    props.setVerifyOldMessagesStartDate(
                                                                        new Date(
                                                                            props
                                                                                .message
                                                                                .createdAt,
                                                                        ),
                                                                    );
                                                                }
                                                            }}
                                                        >
                                                            <AiOutlineCheck
                                                                color='var(--other-red)'
                                                                size={10}
                                                            />
                                                        </div>
                                                    </DefaultTooltip>
                                                </>
                                            )}
                                        {showAvatar &&
                                            !BASIC_CHAT_MODE &&
                                            props.message &&
                                            props.message.chainId && (
                                                <>
                                                    <div
                                                        className={
                                                            styles.chain_info
                                                        }
                                                    >
                                                        {
                                                            lookupChain(
                                                                props.message
                                                                    .chainId,
                                                            ).displayName
                                                        }
                                                    </div>
                                                </>
                                            )}
                                    </div>

                                    <PositionBox
                                        message={props.message.message}
                                        isInput={false}
                                        isPosition={isPosition}
                                        setIsPosition={setIsPosition}
                                        walletExplorer={getShownName(
                                            props.message,
                                        )}
                                        isCurrentUser={props.isCurrentUser}
                                        showAvatar={showAvatar}
                                    />
                                    {!isPosition && renderMessage()}
                                </div>

                                <div className={styles.reply_message}>
                                    <p className={styles.message_date}>
                                        {formatAMPM(props.message.createdAt)}
                                    </p>

                                    <div></div>
                                </div>

                                {/* {snackbarContent} */}
                            </div>

                            {props.message.reactions &&
                                ALLOW_REACTIONS &&
                                Object.keys(props.message.reactions).length >
                                    0 && (
                                    <div
                                        className={`${
                                            styles.reactions_wrapper
                                        } ${
                                            hasUserReacted == true
                                                ? styles.user_reacted
                                                : ' '
                                        }`}
                                    >
                                        {
                                            // Object.keys(
                                            //     props.message.reactions,
                                            // )
                                            processedReactions.map(
                                                (reaction) => {
                                                    return (
                                                        <TextOnlyTooltip
                                                            key={reaction}
                                                            title={
                                                                <div
                                                                    className={
                                                                        styles.reaction_users_tooltip
                                                                    }
                                                                >
                                                                    {getReactionUsers(
                                                                        reaction,
                                                                    ).map(
                                                                        (e) => {
                                                                            return (
                                                                                <div
                                                                                    key={
                                                                                        e
                                                                                    }
                                                                                    className={
                                                                                        e ==
                                                                                        'You'
                                                                                            ? styles.user_reaction_label
                                                                                            : ''
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        e
                                                                                    }
                                                                                </div>
                                                                            );
                                                                        },
                                                                    )}
                                                                </div>
                                                            }
                                                        >
                                                            <div
                                                                key={
                                                                    props
                                                                        .message
                                                                        ._id +
                                                                    reaction
                                                                }
                                                                className={`
                                                            ${styles.reaction_node} 
                                                        `}
                                                                onClick={() => {
                                                                    if (
                                                                        props.currentUser !=
                                                                        undefined
                                                                    )
                                                                        props.addReaction(
                                                                            props
                                                                                .message
                                                                                ._id,
                                                                            props.currentUser,
                                                                            reaction,
                                                                        );
                                                                }}
                                                            >
                                                                {reaction}
                                                            </div>
                                                        </TextOnlyTooltip>
                                                    );
                                                },
                                            )
                                        }
                                    </div>
                                )}

                            {hasSeparator ? (
                                <hr
                                    className={styles.separator}
                                    style={{ cursor: 'default' }}
                                />
                            ) : (
                                <></>
                            )}
                        </div>
                    </div>

                    <div className={styles.msg_bubble_back}>
                        <div
                            className={styles.flip_trigger}
                            onClick={() => {
                                setFlipped(false);
                                setFlipRead(false);
                            }}
                        ></div>
                        <div
                            className={styles.flip_trigger_lefted}
                            onMouseEnter={() => {
                                setFlipRead(true);
                            }}
                            onMouseLeave={() => {
                                // setFlipRead(false);
                            }}
                        >
                            💬
                        </div>
                        {/* <div className={styles.like_btn_base}> + </div>
                    <div className={styles.like_btn_base}> - </div> */}

                        <div className={styles.msg_bubble_back_content}>
                            <div
                                className={`${
                                    messageVoted == 1 ? styles.active : ''
                                } ${styles.like_btn_base} 
                            ${!props.isUserVerified ? styles.disabled : ''}
                            `}
                                onClick={() => {
                                    if (props.isUserVerified) {
                                        handleLikeAndDislikeLS(
                                            props.message._id,
                                            1,
                                        );
                                    }
                                }}
                            >
                                {' '}
                                👍{' '}
                            </div>

                            <div
                                className={`${
                                    messageVoted == -1 ? styles.active : ''
                                } ${styles.like_btn_base} ${styles.dislike_btn}
                            ${!props.isUserVerified ? styles.disabled : ''}
                            `}
                                onClick={() => {
                                    if (props.isUserVerified) {
                                        handleLikeAndDislikeLS(
                                            props.message._id,
                                            -1,
                                        );
                                    }
                                }}
                            >
                                {' '}
                                👎{' '}
                            </div>

                            {likeCount + dislikeCount > 0 && (
                                <>
                                    <div
                                        className={
                                            styles.like_dislike_bar_wrapper
                                        }
                                    >
                                        <div
                                            className={
                                                styles.like_dislike_node_wrapper
                                            }
                                            style={{
                                                width:
                                                    (likeCount /
                                                        (dislikeCount +
                                                            likeCount)) *
                                                        100 +
                                                    '%',
                                            }}
                                        >
                                            <div
                                                className={
                                                    styles.like_dislike_node
                                                }
                                            ></div>
                                        </div>
                                        <div
                                            className={
                                                styles.like_dislike_node_wrapper
                                            }
                                            style={{
                                                width:
                                                    (dislikeCount /
                                                        (dislikeCount +
                                                            likeCount)) *
                                                        100 +
                                                    '%',
                                            }}
                                        >
                                            <div
                                                className={`${styles.like_dislike_node} ${styles.dislike_node}`}
                                            ></div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <></>
            )}
        </div>
    );
}

export default memo(SentMessagePanel);
