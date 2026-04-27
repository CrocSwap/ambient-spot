/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any  */

import {
    Dispatch,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { CHAT_BACKEND_URL } from '../../../ambient-utils/constants';

import {
    decodeSocketIOMessage,
    encodeSocketIOMessage,
    getLS,
    getUnverifiedMsgList,
    getUserVerifyToken,
    removeFromUnverifiedList,
    setLS,
} from '../ChatUtils';

import {
    addReactionEndpoint,
    getAllMessagesEndpoint,
    getMentionsWithRestEndpoint,
    getMessageWithRestEndpoint,
    getMessageWithRestWithPaginationEndpoint,
    getUserDetailsEndpoint,
    getUserListWithRestEndpoint,
    updateLikesDislikesCountEndpoint,
    updateUnverifiedMessagesEndpoint,
} from '../ChatConstants/ChatEndpoints';

import useWebSocketImport, { ReadyState } from 'react-use-websocket';

// CJS default-export interop: Vite may wrap the module object as the default
const useWebSocket =
    typeof useWebSocketImport === 'function'
        ? useWebSocketImport
        : (useWebSocketImport as any).default;
import { AppStateContext } from '../../../contexts/AppStateContext';
import { UserDataContext } from '../../../contexts/UserDataContext';
import {
    LS_USER_NON_VERIFIED_MESSAGES,
    LS_USER_VERIFY_TOKEN,
} from '../ChatConstants/ChatConstants';
import { ChatWsQueryParams, LikeDislikePayload } from '../ChatIFs';
import { Message } from '../Model/MessageModel';
import { User } from '../Model/UserModel';

type ChatSocketListener = {
    msg: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listener: (payload: any) => void;
    componentId: string;
};

const useChatSocket = (
    room: string,
    areSubscriptionsEnabled = true,
    isChatOpen = true,
    activateToastr: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
    ) => void,
    // address?: string,
    // ensName?: string,
    currentUserID?: string,
    freezePanel?: () => void,
    activatePanel?: () => void,
    setMessageForNotificationBubble?: Dispatch<
        SetStateAction<Message | undefined>
    >,
) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [lastMessage, setLastMessage] = useState<Message>();
    const [messageUser, setMessageUser] = useState<string>();
    const [notifications, setNotifications] = useState<Map<string, number>>();
    const [userMap, setUserMap] = useState<Map<string, User>>(
        new Map<string, User>(),
    );
    const [userVrfToken, setUserVrfToken] = useState<string>('');

    const roomRef = useRef<string>(room);

    const messagesRef = useRef<Message[]>([]);
    const [listeners, setListeners] = useState<ChatSocketListener[]>([]);

    messagesRef.current = messages;

    const { userAddress: address, ensName } = useContext(UserDataContext);
    const { isUserIdle } = useContext(AppStateContext);

    const { updateUserAvatarData } = useContext(UserDataContext);

    const url = CHAT_BACKEND_URL + '/chat/api/subscribe/';

    // handle query params
    const qp: ChatWsQueryParams = {
        roomId: room,
    };
    if (address && address.length > 0) {
        qp.address = address.toString();
    }
    if (ensName && ensName.length > 0) {
        qp.ensName = ensName;
    }

    const {
        lastMessage: socketLastMessage,
        sendMessage: socketSendMessage,
        readyState,
    } = useWebSocket(isChatOpen && !isUserIdle && address ? url : null, {
        queryParams: {
            roomId: qp.roomId,
            address: qp.address ? qp.address : '',
            ensName: qp.ensName ? qp.ensName : '',
        },
        fromSocketIO: true,
        shouldReconnect: () => isChatOpen,
        reconnectAttempts: 20,
        reconnectInterval: (attemptNumber: number) =>
            Math.min(Math.pow(2, attemptNumber) * 1000, 10000),
        share: true,
        onOpen: () => {
            doHandshake();
        },
        // onClose: () => {
        // },
        // onError: () => {
        // },
        heartbeat: {
            interval: 60000,
            timeout: 55000,
        },
    });

    const isWsConnected = readyState == ReadyState.OPEN;

    useEffect(() => {
        if (isChatOpen) {
            doHandshake();
        }
    }, [address, ensName, room, isChatOpen, isUserIdle]);

    useEffect(() => {
        if (socketLastMessage == null || socketLastMessage.data == null) return;
        const decoded = decodeSocketIOMessage(socketLastMessage.data);
        switch (decoded.msgType) {
            case 'msg-recieve-2':
                newMsgListener(decoded.payload);
                break;
            case 'message-deleted-listener':
                deletedMsgListener(decoded.payload);
                break;
            case 'message-updated-listener':
                updatedMsgListener(decoded.payload);
                break;
            case 'set-avatar-listener':
                userListLightUpdate(decoded.payload);
                handlePossibleAvatarChange(decoded.payload);
                if (listeners.some((e) => e.msg === decoded.msgType)) {
                    const willBeCalled = listeners.filter(
                        (e) => e.msg === decoded.msgType,
                    );
                    willBeCalled.map((e) => {
                        e.listener(decoded.payload);
                    });
                }
                break;
            case 'noti':
                notiListener(decoded.payload);
                break;
        }
    }, [socketLastMessage]);

    const doHandshake = () => {
        sendToSocket('handshake-update', {
            roomId: room,
            address: address,
            ensName: ensName,
        });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sendToSocket(msgType: string, payload: any) {
        const msg = encodeSocketIOMessage(msgType, payload);
        socketSendMessage(msg, true);
    }

    async function getMsgWithRest(roomInfo: string) {
        if (roomInfo == undefined || roomInfo == '') return;

        const encodedRoomInfo = encodeURIComponent(roomInfo);
        const url = `${CHAT_BACKEND_URL}${getMessageWithRestEndpoint}${encodedRoomInfo}`;
        const response = await fetch(url, {
            method: 'GET',
        });
        const data = await response.json();
        assignMessages(data.reverse());
        setLastMessage(data);
        setMessageUser(data.sender);
        return data.reverse();
    }

    async function fetchForNotConnectedUser() {
        const encodedRoomInfo = encodeURIComponent(room);
        const url = `${CHAT_BACKEND_URL}${getMessageWithRestEndpoint}${encodedRoomInfo}`;
        const response = await fetch(url, {
            method: 'GET',
        });
        const data = await response.json();
        assignMessages(data.reverse());
        setLastMessage(data);
        setMessageUser(data.sender);
    }

    async function getAllMessages(p?: number) {
        const queryParams = 'p=' + p;
        const url = `${CHAT_BACKEND_URL}${getAllMessagesEndpoint}?${queryParams}`;
        const response = await fetch(url, {
            method: 'GET',
        });
        const data = await response.json();
        assignMessages([...data, ...messages]);
        setLastMessage(data);
        setMessageUser(data.sender);
        return data;
    }

    async function getMsgWithRestWithPagination(roomInfo: string, p?: number) {
        const encodedRoomInfo = encodeURIComponent(roomInfo);
        const queryParams = 'p=' + p;
        const url = `${CHAT_BACKEND_URL}${getMessageWithRestWithPaginationEndpoint}${encodedRoomInfo}?${queryParams}`;
        const response = await fetch(url, {
            method: 'GET',
        });
        const data = await response.json();
        assignMessages([...data.reverse(), ...messages]);
        setLastMessage(data);
        setMessageUser(data.sender);

        return data.reverse();
    }

    async function updateLikeDislike(
        messageId: string,
        pl: LikeDislikePayload,
    ) {
        const payload = {
            _id: messageId,
            ...pl,
        };

        const response = await fetch(
            CHAT_BACKEND_URL + updateLikesDislikesCountEndpoint,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            },
        );
        const data = await response.json();
        if (data && data.data && data.data.message) {
            const msg = data.data.message;
            const newMessageList = messages.map((e) => {
                if (e._id == msg._id) {
                    return msg;
                } else {
                    return e;
                }
            });
            assignMessages([...newMessageList]);
        }

        return data;
    }

    async function getMentionsWithRest(roomInfo: string) {
        const encodedRoomInfo = encodeURIComponent(roomInfo);
        const response = await fetch(
            CHAT_BACKEND_URL +
                getMentionsWithRestEndpoint +
                encodedRoomInfo +
                '/' +
                address,

            {
                method: 'GET',
            },
        );
        const data = await response.json();
        return data;
    }

    async function getUserListWithRest() {
        const response = await fetch(
            CHAT_BACKEND_URL + getUserListWithRestEndpoint,
            {
                method: 'GET',
            },
        );
        const data = await response.json();
        return data;
    }

    async function updateUnverifiedMessages(verifyDate: Date, endDate?: Date) {
        const nonVerifiedMessages = getUnverifiedMsgList(address);
        const vrfTkn = getLS(LS_USER_VERIFY_TOKEN, address);

        const response = await fetch(
            CHAT_BACKEND_URL + updateUnverifiedMessagesEndpoint,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: currentUserID,
                    startDate: verifyDate,
                    msgList: nonVerifiedMessages,
                    vrfTkn: vrfTkn,
                    endDate: endDate,
                }),
            },
        );
        const messages = await response.json();
        updateMessageWithArr(messages);

        // clean up local storage
        messages.map((msg: Message) => {
            removeFromUnverifiedList(msg._id, address);
        });
    }

    async function updateUserCache() {
        const userListData = await getUserListWithRest();
        const usmp = new Map<string, User>();
        userListData.forEach((user: User) => {
            usmp.set(user._id, user);
        });
        setUserMap(usmp);
        setUsers(userListData);
        const userToken = getLS(LS_USER_VERIFY_TOKEN, address);
        setUserVrfToken(userToken ? userToken : '');
    }

    async function getUserSummaryDetails(walletID: string) {
        const encodedWalletID = encodeURIComponent(walletID);
        const response = await fetch(
            CHAT_BACKEND_URL + getUserDetailsEndpoint + '/' + encodedWalletID,
            {
                method: 'GET',
            },
        );
        const data = await response.json();
        return data;
    }

    useEffect(() => {
        if (!isChatOpen) return;

        // if (!areSubscriptionsEnabled || !isChatOpen) return;

        async function getRest() {
            if (freezePanel) freezePanel();
            if (room == '') return;
            const data =
                room === 'Admins'
                    ? await getAllMessages(0)
                    : await getMsgWithRest(room);
            assignMessages(data.reverse());
            if (data.length > 0) {
                if (data[data.length - 1]) {
                    setLastMessage(data[data.length - 1]);
                    setMessageUser(data[data.length - 1].sender);
                }
            }

            const userListData = await getUserListWithRest();
            const usmp = new Map<string, User>();
            userListData.forEach((user: User) => {
                usmp.set(user._id, user);
            });
            setUserMap(usmp);
            setUsers(userListData);
            if (activatePanel) activatePanel();
        }

        getRest();
    }, [room, areSubscriptionsEnabled, isChatOpen, address, notifications]);

    useEffect(() => {
        if (roomRef.current == room) return;
        sendToSocket('join-room', { roomInfo: room, oldRoom: roomRef.current });
        roomRef.current = room;
    }, [room]);

    useEffect(() => {
        if (isChatOpen) {
            updateUserCache();
        }
    }, [messages, isChatOpen]);

    async function deleteMsgFromList(msgId: string) {
        const payload = {
            _id: msgId,
            whoIsDeleting: currentUserID,
            verifyToken: getUserVerifyToken(address),
        };
        const response = await fetch(
            `${CHAT_BACKEND_URL}/chat/api/messages/deleteMessagev2`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            },
        );
        const data = await response.json();
        if (data && data.status == 'OK') {
            activateToastr('Message deleted successfully', 'success');
            data.message.deletedMessageText = 'This message has deleted';
            if (data) {
                const msg = data.message;
                sendToSocket('message-deleted', { ...data.message });
                const newMessageList = messages.map((e) => {
                    if (e && e._id == msg._id) {
                        return msg;
                    } else {
                        return e;
                    }
                });

                assignMessages([...newMessageList]);
            }
        } else {
            activateToastr(data.status, 'error');
        }

        return data;
    }

    async function sendMsg(
        currentUser: string,
        msg: string,
        room: string,
        ensName: string,
        walletID: string | null,
        mentionedName: string | null,
        mentionedWalletID: string | null,
        chainId: string | null,
        repliedMessage?: string | undefined,
        repliedMessageRoomInfo?: string | undefined,
    ) {
        const payload = {
            from: currentUser,
            message: msg,
            roomInfo: room,
            ensName: ensName,
            walletID: walletID,
            mentionedName: mentionedName,
            isMentionMessage: mentionedName ? true : false,
            mentionedWalletID,
            chainId,
            repliedMessage: repliedMessage,
            repliedMessageRoomInfo: repliedMessageRoomInfo,
            senderToken: userVrfToken,
        };

        sendToSocket('send-msg', payload);
    }

    async function addReaction(
        messageId: string,
        userId: string,
        reaction: string,
    ) {
        const payload = {
            messageId,
            userId,
            reaction,
        };

        const response = await fetch(CHAT_BACKEND_URL + addReactionEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await response.json();
        sendToSocket('message-updated', { ...data.data.message });

        return data;
    }

    // update messages list with new message from server
    const updateMessages = (message: any) => {
        let newMessageList = messages.map((e) => {
            if (e && e._id == message._id) {
                return message;
            } else {
                return e;
            }
        });
        newMessageList = newMessageList.filter(
            (e) => (e && e.isDeleted != true) || room == 'Admins',
        );
        assignMessages([...newMessageList]);
    };

    // updates messages list with new message list from server
    const updateMessageWithArr = (msgListFromServer: Message[]) => {
        const newVerifiedMsgIds = new Set(
            msgListFromServer.map((msg) => msg._id),
        );
        let newMessageList = messages.map((e) => {
            if (e && newVerifiedMsgIds.has(e._id)) {
                return {
                    ...e,
                    isVerified: true,
                };
            } else {
                return e;
            }
        });
        newMessageList = newMessageList.filter(
            (e) => e && (e.isDeleted != true || room == 'Admins'),
        );
        assignMessages([...newMessageList]);
    };

    async function updateUserWithAvatarImage(
        userId: string,
        walletID: string,
        avatarImage: string,
        avatarThumbnail?: string,
        avatarCompressed?: string,
    ) {
        sendToSocket('set-avatar', {
            userId,
            walletID,
            avatarImage,
            avatarThumbnail,
            avatarCompressed,
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function userListLightUpdate(data: any) {
        const newUsersList: User[] = [];

        let refreshMessages = false;
        users.map((e) => {
            if (e._id == data.userId) {
                newUsersList.push({ ...e, avatarImage: data.avatarImage });
                refreshMessages = true;
            } else {
                newUsersList.push({ ...e });
            }
        });

        if (!refreshMessages) return;

        setUsers(newUsersList);

        const usmp = new Map<string, User>();
        newUsersList.forEach((user: User) => {
            usmp.set(user._id, user);
        });
        setUserMap(usmp);
        assignMessages([...messagesRef.current]);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handlePossibleAvatarChange(data: any) {
        if (data.walletID) {
            updateUserAvatarData(data.walletID, {
                avatarImage: data.avatarImage,
                avatarThumbnail: data.avatarThumbnail,
                avatarCompressed: data.avatarCompressed,
            });
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const newMsgListener = (data: any) => {
        if (data.roomInfo !== room && room != 'Admins') return;
        if (
            data &&
            data.sender &&
            data.sender === currentUserID &&
            !data.isVerified
        ) {
            let nonVrfMessages = getLS(LS_USER_NON_VERIFIED_MESSAGES, address);
            const newMsgToken = ', ' + data._id;
            nonVrfMessages = nonVrfMessages
                ? (nonVrfMessages += newMsgToken)
                : data._id + '';
            setLS(LS_USER_NON_VERIFIED_MESSAGES, nonVrfMessages, address);
        }
        assignMessages([...messagesRef.current, data]);
        if (messagesRef.current[messagesRef.current.length - 1]) {
            setLastMessage(data);
            setMessageUser(data.sender);
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deletedMsgListener = (data: any) => {
        updateMessages(data);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedMsgListener = (data: any) => {
        updateMessages(data);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const notiListener = (data: any) => {
        if (data && setMessageForNotificationBubble) {
            setMessageForNotificationBubble(data);
        }
        if (notifications) {
            const checkVal = notifications.get(data.roomInfo);
            if (checkVal != undefined) {
                setNotifications(
                    notifications.set(data.roomInfo, checkVal + 1),
                );
            } else {
                setNotifications(notifications.set(data.roomInfo, 1));
            }
        } else {
            const notificationsMap = new Map<string, number>();
            notificationsMap.set(data.roomInfo, 1);
            setNotifications(notificationsMap);
        }
    };

    const addListener = (listener: ChatSocketListener) => {
        if (!listeners.some((e) => e.componentId === listener.componentId)) {
            setListeners([...listeners, listener]);
        }
    };

    const assignMessages = (messages: Message[]) => {
        setMessages(messages.filter((m) => m != null));
    };

    return {
        messages,
        sendMsg,
        lastMessage,
        messageUser,
        users,
        notifications,
        updateLikeDislike,
        userMap,
        updateUserCache,
        getMsgWithRestWithPagination,
        getAllMessages,
        deleteMsgFromList,
        setMessages,
        addReaction,
        fetchForNotConnectedUser,
        getUserSummaryDetails,
        updateUnverifiedMessages,
        getMentionsWithRest,
        updateUserWithAvatarImage,
        addListener,
        isWsConnected,
    };
};

export default useChatSocket;
