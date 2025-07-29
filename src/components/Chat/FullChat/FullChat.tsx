/* eslint-disable @typescript-eslint/no-explicit-any */
interface EmojiData {
    native: string;
    [key: string]: any; // For any additional properties that might be needed
}
import {
    Dispatch,
    SetStateAction,
    memo,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    AiOutlineCheck,
    AiOutlineClose,
    AiOutlineSound,
    AiOutlineUser,
} from 'react-icons/ai';
import { FiAtSign, FiSettings } from 'react-icons/fi';
import { IoNotificationsOutline, IoOptions } from 'react-icons/io5';
import { MdOutlineChat } from 'react-icons/md';
import {
    TbLayoutSidebarLeftCollapse,
    TbLayoutSidebarLeftExpand,
} from 'react-icons/tb';
import { Link, useParams } from 'react-router-dom';
import { favePoolsMethodsIF } from '../../../App/hooks/useFavePools';
import ambientTokenList from '../../../ambient-utils/constants/ambient-token-list.json';
import { uriToHttp } from '../../../ambient-utils/dataLayer';
import { PoolIF } from '../../../ambient-utils/types';
import { CrocEnvContext } from '../../../contexts/CrocEnvContext';
import { UserPreferenceContext } from '../../../contexts/UserPreferenceContext';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import ChatConfirmationPanel from '../ChatConfirmationPanel/ChatConfirmationPanel';
import { ChatGoToChatParamsIF } from '../ChatIFs';
import ChatNotificationBubble from '../ChatNotification/ChatNotificationBubble';
import ChatToaster from '../ChatToaster/ChatToaster';
import Room from '../MessagePanel/Room/Room';
import { Message } from '../Model/MessageModel';
import styles from './FullChat.module.css';

interface FullChatPropsIF {
    messageList: JSX.Element;
    chatNotification: JSX.Element;
    messageInput: JSX.Element;
    setRoom: Dispatch<SetStateAction<string>>;
    setIsCurrentPool: Dispatch<SetStateAction<boolean>>;
    userName: string;
    showCurrentPoolButton: boolean;
    setShowCurrentPoolButton: Dispatch<SetStateAction<boolean>>;
    userCurrentPool: string;
    favoritePools: PoolIF[];
    // eslint-disable-next-line
    setFavoritePools: any;
    setIsChatOpen: (val: boolean) => void;
    isChatOpen: boolean;
    isModerator: boolean;
    isVerified: boolean;
    verifyWallet: (
        val: number,
        date: Date,
        e: React.MouseEvent<HTMLDivElement>,
    ) => void;
    toastrActive: boolean;
    toastrActivator: Dispatch<SetStateAction<boolean>>;
    toastrText: string;
    toastrType?: 'success' | 'error' | 'warning' | 'info';
    showVerifyOldMessagesPanel: boolean;
    activateToastr: (
        text: string,
        type: 'success' | 'error' | 'warning' | 'info',
    ) => void;
    updateUnverifiedMessages: (startDate: Date, endDate?: Date) => void;
    verifyOldMessagesStartDate: Date;
    setShowVerifyOldMessagesPanel: Dispatch<SetStateAction<boolean>>;
    showPicker: boolean;
    addReactionEmojiPickListener: (data: EmojiData) => void;
    setShowPicker: Dispatch<SetStateAction<boolean>>;
    showDeleteConfirmation: boolean;
    handleConfirmDelete: () => void;
    handleCancelDelete: () => void;
    rndShowPreviousMessages: () => JSX.Element;
    room: string;
    isFocusMentions: boolean;
    setIsFocusMentions: any;
    isCurrentPool: boolean;
    ensName: string;
    currentUser: any;
    notifications?: Map<string, number>;
    mentCount: number;
    mentionIndex: number;
    setGoToChartParams?: Dispatch<
        SetStateAction<ChatGoToChatParamsIF | undefined>
    >;
    setUserCurrentPool: any;
    rndMentSkipper?: () => JSX.Element;
    messageForNotificationBubble?: Message;
    setSelectedMessageForReply: Dispatch<SetStateAction<Message | undefined>>;
    setIsReplyButtonPressed: Dispatch<SetStateAction<boolean>>;
    setMessageForNotificationBubble: Dispatch<
        SetStateAction<Message | undefined>
    >;
    showReactionPicker: boolean;
    reactionPicker: JSX.Element;
}

interface ChannelDisplayPropsIF {
    pool: PoolIF;
    isDropdown: boolean;
    favoritePools: PoolIF[];
    favePools: favePoolsMethodsIF;
}
function FullChat(props: FullChatPropsIF) {
    const { setIsChatOpen } = props;
    const { params } = useParams();
    const { topPools: rooms } = useContext(CrocEnvContext);
    const { favePools } = useContext(UserPreferenceContext);
    const reconstructedReadableRoom =
        params && !params.includes('global')
            ? params.replace(/&/g, ' / ').toUpperCase()
            : params && params.includes('global')
              ? 'Global'
              : 'Global';

    useEffect(() => {
        setIsChatOpen(true);
    }, []);

    const verifyBtnRef = useRef<HTMLDivElement>(null);

    const currencies: string[] | null =
        params && !params.includes('global') ? params.split('&') : null;

    const swappedReconstructedReadableRoom: string =
        currencies && currencies.length === 2
            ? (() => {
                  const [currency1, currency2] = currencies;
                  return currency1 + ' / ' + currency2;
              })()
            : params && params.includes('global')
              ? 'Global'
              : 'Global';

    const reSwappedReconstructedReadableRoom: string =
        currencies && currencies.length === 2
            ? (() => {
                  const [currency1, currency2] = currencies;
                  return (currency2 + ' / ' + currency1).toUpperCase();
              })()
            : swappedReconstructedReadableRoom &&
                swappedReconstructedReadableRoom.includes('global')
              ? 'Global'
              : 'Global';

    // eslint-disable-next-line
    const currentPoolChannel = new BroadcastChannel('currentPoolChannel');
    const {
        messageList,
        chatNotification,
        messageInput,
        userName,
        userCurrentPool,
    } = props;
    const [isChatSidebarOpen, setIsChatSidebarOpen] = useState(true);

    // const [isRoomInRoomArray, setIsRoomInRoomArray] = useState(false);

    const [roomArray] = useState<PoolIF[]>([]);

    const [readableRoomName, setReadableName] = useState(
        reconstructedReadableRoom || 'Global',
    );

    // eslint-disable-next-line
    const [readableRoom, setReadableRoom] = useState<PoolIF | undefined>(
        undefined,
    );

    const [currentPoolInfo, setCurrentPoolInfo] = useState<PoolIF | undefined>(
        undefined,
    );
    const [showChannelsDropdown, setShowChannelsDropdown] = useState(false);

    useEffect(() => {
        if (roomArray.some(({ name }) => name === reconstructedReadableRoom)) {
            const found = roomArray.find(
                (name) => name.name === reconstructedReadableRoom,
            );
            setReadableRoom(found);
            props.setRoom(reconstructedReadableRoom);
            setReadableName(reconstructedReadableRoom);
            // setIsRoomInRoomArray(true);
        } else {
            if (
                roomArray.some(
                    ({ name }) => name === reSwappedReconstructedReadableRoom,
                )
            ) {
                const found = roomArray.find(
                    (name) => name.name === reSwappedReconstructedReadableRoom,
                );
                setReadableRoom(found);
                setReadableName(reSwappedReconstructedReadableRoom);
                props.setRoom(reSwappedReconstructedReadableRoom);
                setReadableName(reSwappedReconstructedReadableRoom);
                // setIsRoomInRoomArray(true);
            } else {
                if (
                    currencies &&
                    currencies[0] !== currencies[1] &&
                    ambientTokenList.tokens.some(
                        ({ symbol }) =>
                            symbol === currencies[0].toUpperCase() &&
                            ambientTokenList.tokens.some(
                                ({ symbol }) =>
                                    symbol === currencies[1].toUpperCase(),
                            ),
                    )
                ) {
                    setReadableName(
                        currencies[0].toUpperCase() +
                            ' / ' +
                            currencies[1].toUpperCase(),
                    );
                    props.setRoom(
                        currencies[0].toUpperCase() +
                            ' / ' +
                            currencies[1].toUpperCase(),
                    );
                    setReadableName(
                        currencies[0].toUpperCase() +
                            ' / ' +
                            currencies[1].toUpperCase(),
                    );
                    // setIsRoomInRoomArray(false);
                } else {
                    setReadableName('Global');
                    props.setRoom('Global');
                    setReadableName('Global');
                    // setIsRoomInRoomArray(false);
                }
            }
        }
    }, [
        reconstructedReadableRoom,
        reSwappedReconstructedReadableRoom,
        rooms.length === 0,
    ]);

    // eslint-disable-next-line
    function handleRoomClick(event: any, pool: PoolIF, isDropdown: boolean) {
        const roomName = pool.baseToken.symbol + ' / ' + pool.quoteToken.symbol;
        props.setRoom(roomName);

        const readableRoomName = `${pool.baseToken.symbol} / ${pool.quoteToken.symbol}`;
        setReadableName(readableRoomName);
        setReadableRoom(pool);

        if (roomName.toString() === 'Current Pool') {
            props.setIsCurrentPool(true);
            if (props.showCurrentPoolButton) {
                props.setShowCurrentPoolButton(false);
            }
        } else {
            props.setIsCurrentPool(false);
            props.setShowCurrentPoolButton(true);
        }

        if (roomArray.some(({ name }) => name === readableRoomName)) {
            // setIsRoomInRoomArray(true);
        } else {
            // setIsRoomInRoomArray(false);
        }

        if (isDropdown) setShowChannelsDropdown(!showChannelsDropdown);
    }

    // eslint-disable-next-line
    function findSpeed(pool: any) {
        switch (pool.baseToken.symbol + ' / ' + pool.quoteToken.symbol) {
            case 'ETH / USDC':
                return 0 as number;
            case 'ETH / WBTC':
                return 5;
            case 'USDC / DAI':
                return -2;
            case 'ETH / DAI':
                return -2;
            case 'USDC / WBTC':
                return -2;
            case 'WBTC / DAI':
                return -2;
            default:
                return 10;
        }
    }

    // eslint-disable-next-line
    function findId(pool: any) {
        switch (pool.baseToken.symbol + ' / ' + pool.quoteToken.symbol) {
            case 'ETH / USDC':
                return 1;
            case 'ETH / WBTC':
                return 3;
            case 'USDC / DAI':
                return 4;
            case 'ETH / DAI':
                return 2;
            case 'USDC / WBTC':
                return 5;
            case 'WBTC / DAI':
                return 6;
            default:
                return 10;
        }
    }

    useEffect(() => {
        rooms?.map((pool: PoolIF) => {
            if (!roomArray.some(({ name }) => name === pool.name)) {
                roomArray.push(pool);
            }
        });
        const fave:
            | PoolIF[]
            | {
                  name: string;
                  base: string;
                  quote: string;
                  baseToken: {
                      name: string;
                      address: string;
                      symbol: string;
                      decimals: number;
                      chainId: number;
                      logoURI: string;
                  };
                  quoteToken: {
                      name: string;
                      address: string;
                      symbol: string;
                      decimals: number;
                      chainId: number;
                      logoURI: string;
                  };
                  chainId: string;
                  poolIdx: number;
                  speed: number;
                  id: number;
              }[] = [];
        favePools.pools.forEach((pool: PoolIF) => {
            const favPool = {
                name: pool.baseToken.symbol + ' / ' + pool.quoteToken.symbol,
                base: pool.base,
                quote: pool.quote,
                baseToken: {
                    name: pool.baseToken.name,
                    address: pool.base,
                    symbol: pool.baseToken.symbol,
                    decimals: pool.baseToken.decimals,
                    chainId: pool.baseToken.chainId,
                    logoURI: pool.baseToken.logoURI,
                },
                quoteToken: {
                    name: pool.quoteToken.name,
                    address: pool.quote,
                    symbol: pool.quoteToken.symbol,
                    decimals: pool.quoteToken.decimals,
                    chainId: pool.quoteToken.chainId,
                    logoURI: pool.quoteToken.logoURI,
                },
                chainId: pool.chainId,
                poolIdx: pool.poolIdx,
                speed: findSpeed(pool),
                id: findId(pool),
            };

            if (!roomArray.some(({ name }) => name === favPool.name)) {
                roomArray.push(favPool);
            }

            for (let x = 0; x < roomArray.length; x++) {
                if (favPool.name === roomArray[x].name) {
                    roomArray.push(roomArray.splice(x, 1)[0]);
                }
            }
            fave.push(favPool);
        });
        props.setFavoritePools(() => {
            return fave;
        });
        const middleIndex = Math.ceil(props.favoritePools.length / 2);
        props.favoritePools.splice(0, middleIndex);
    }, [favePools, rooms.length === 0]);

    function handleGlobalClick() {
        props.setRoom('Global');
        setReadableName('Global');
    }

    function handleCurrentPoolClick() {
        props.setRoom(userCurrentPool);
        setReadableName(userCurrentPool);
        setReadableRoom(currentPoolInfo);
        // if (roomArray.some(({ name }) => name === userCurrentPool)) {
        //     setIsRoomInRoomArray(true);
        // } else {
        //     setIsRoomInRoomArray(false);
        // }
    }

    function setCurrentPoolInfo_(pool: PoolIF) {
        setCurrentPoolInfo(pool);
        return '';
    }

    function ChannelDisplay(props: ChannelDisplayPropsIF) {
        const { pool, isDropdown } = props;

        const activePoolStyle =
            pool?.name === readableRoomName ? styles.active_room : '';
        const poolIsCurrentPool = pool.name === userCurrentPool;
        const activePoolIsCurrentPool =
            poolIsCurrentPool && pool?.name === readableRoomName;
        const smallScrenView = useMediaQuery('(max-width: 968px)');
        const isButtonFavorited = favePools.check(
            pool.base,
            pool.quote,
            pool.chainId,
            pool.poolIdx,
        );

        return (
            <div
                className={`${styles.pool_display} ${activePoolStyle}`}
                // eslint-disable-next-line
                onClick={(event: any) => {
                    handleRoomClick(event, pool, isDropdown);
                }}
            >
                {isButtonFavorited ? (
                    <svg
                        width={smallScrenView ? '15px' : '20px'}
                        height={smallScrenView ? '15px' : '20px'}
                        viewBox='0 0 15 15'
                        fill='none'
                        xmlns='http://www.w3.org/2000/svg'
                    >
                        <g clipPath='url(#clip0_1874_47746)'>
                            <path
                                d='M12.8308 3.34315C12.5303 3.04162 12.1732 2.80237 11.7801 2.63912C11.3869 2.47588 10.9654 2.39185 10.5397 2.39185C10.1141 2.39185 9.69255 2.47588 9.29941 2.63912C8.90626 2.80237 8.54921 3.04162 8.24873 3.34315L7.78753 3.81033L7.32633 3.34315C7.02584 3.04162 6.66879 2.80237 6.27565 2.63912C5.8825 2.47588 5.461 2.39185 5.03531 2.39185C4.60962 2.39185 4.18812 2.47588 3.79498 2.63912C3.40183 2.80237 3.04478 3.04162 2.7443 3.34315C1.47451 4.61294 1.39664 6.75721 2.99586 8.38637L7.78753 13.178L12.5792 8.38637C14.1784 6.75721 14.1005 4.61294 12.8308 3.34315Z'
                                fill={'#6b6f7d'}
                                stroke='#6b6f7d'
                                strokeLinecap='round'
                                strokeLinejoin='round'
                            />
                        </g>
                        <defs>
                            <clipPath id='clip0_1874_47746'>
                                <rect
                                    width='14'
                                    height='14'
                                    fill='white'
                                    transform='translate(0.600098 0.599976)'
                                />
                            </clipPath>
                        </defs>
                    </svg>
                ) : (
                    ''
                )}

                <div className={styles.token_logos}>
                    <img
                        src={uriToHttp(pool?.baseToken.logoURI)}
                        alt='base token'
                    />
                    <img
                        src={uriToHttp(pool?.quoteToken.logoURI)}
                        alt='quote token'
                    />
                </div>
                <span>{pool?.name}</span>
                {poolIsCurrentPool && (
                    <div>
                        <p
                            className={styles.current_pool}
                            style={{
                                color: activePoolIsCurrentPool
                                    ? 'var(--text1)'
                                    : 'var(--text3)',
                            }}
                        >
                            Go to Current Pool
                        </p>
                        <div>{setCurrentPoolInfo_(pool)}</div>
                    </div>
                )}
            </div>
        );
    }

    // const otherRooms = [
    //     {
    //         id: 100,
    //         name: 'Global',
    //         value: 'Global',
    //     },
    //     {
    //         id: 101,
    //         name: 'Admins',
    //         value: 'Admins',
    //     },
    // ];

    // const renderOtherRooms = () => {
    //     const roomsToAdd = otherRooms.filter((room) => {
    //         return (
    //             room.name !== readableRoomName &&
    //             !(room.name == 'Admins' && !props.isModerator)
    //         );
    //     });

    //     const renderRoomIcon = (name: string) => {
    //         switch (name.toLowerCase()) {
    //             case 'global':
    //                 return (
    //                     <AiOutlineGlobal
    //                         size={20}
    //                         color='var(--text-highlight)'
    //                     />
    //                 );
    //             case 'admins':
    //                 return (
    //                     <AiOutlineUser
    //                         size={20}
    //                         color='var(--text-highlight)'
    //                     />
    //                 );
    //         }
    //     };

    //     return (
    //         <>
    //             {roomsToAdd.map((e) => {
    //                 return (
    //                     <div
    //                         key={e.id}
    //                         className={`${styles.pool_display}`}
    //                         // eslint-disable-next-line
    //                         onClick={(event: any) => {
    //                             props.setRoom(e.name);

    //                             setReadableName(e.name);
    //                             props.setIsCurrentPool(false);
    //                             props.setShowCurrentPoolButton(true);

    //                             if (
    //                                 roomArray.some(
    //                                     ({ name }) => name === readableRoomName,
    //                                 )
    //                             ) {
    //                                 setIsRoomInRoomArray(true);
    //                             } else {
    //                                 setIsRoomInRoomArray(false);
    //                             }
    //                             setShowChannelsDropdown(!showChannelsDropdown);
    //                         }}
    //                     >
    //                         <div
    //                             className={
    //                                 styles.token_logos +
    //                                 ' ' +
    //                                 styles.other_room_icon
    //                             }
    //                         >
    //                             {renderRoomIcon(e.name)}
    //                         </div>
    //                         <span>{e.name}</span>
    //                     </div>
    //                 );
    //             })}
    //         </>
    //     );
    // };

    const sidebarExpandOrCollapseIcon = (
        <div onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}>
            {isChatSidebarOpen ? (
                <TbLayoutSidebarLeftCollapse
                    size={20}
                    color='var(--text-highlight)'
                />
            ) : (
                <TbLayoutSidebarLeftExpand
                    size={20}
                    color='var(--text-highlight)'
                />
            )}{' '}
        </div>
    );

    const chatOptionData = [
        {
            title: 'Settings',
            icon: <FiSettings size={20} color='var(--text-highlight)' />,
        },
        {
            title: 'Notification',
            icon: (
                <IoNotificationsOutline
                    size={20}
                    color='var(--text-highlight)'
                />
            ),
        },
        {
            title: 'Sound',
            icon: <AiOutlineSound size={20} color='var(--text-highlight)' />,
        },
    ];
    // eslint-disable-next-line
    const chatOptions = (
        <section className={styles.options}>
            <header>
                <h3>OPTIONS</h3>

                <IoOptions size={20} color='var(--text2)' />
            </header>
            {chatOptionData.map((item, idx) => (
                <div key={idx} className={styles.option_item}>
                    {item.icon}
                    <span>{item.title}</span>
                </div>
            ))}
        </section>
    );

    const currentRoomIsGlobal = readableRoomName.toLowerCase() === 'global';

    const chatChanels = (
        <section className={styles.options}>
            <header>
                <h3>CHANNELS</h3>
                <MdOutlineChat size={20} color='var(--text2)' />
            </header>

            <div
                className={styles.option_item}
                onClick={() => {
                    handleCurrentPoolClick();
                }}
            >
                <FiAtSign size={20} color='var(--text-highlight)' />
                <span> Current Pool</span>
            </div>
            <div
                className={styles.option_item}
                style={{
                    background: currentRoomIsGlobal ? 'var(--dark2)' : '',
                }}
                onClick={handleGlobalClick}
            >
                <FiAtSign size={20} color='var(--text-highlight)' />
                <span> Global</span>
            </div>

            {roomArray.map((pool, idx) => (
                <ChannelDisplay
                    pool={pool}
                    key={idx}
                    isDropdown={false}
                    favoritePools={props.favoritePools}
                    favePools={favePools}
                />
            ))}
        </section>
    );

    // const channelsDropdown = (
    //     <div className={styles.channels_dropdown}>
    //         <button
    //             className={styles.active_channel_dropdown}
    //             onClick={() => setShowChannelsDropdown(!showChannelsDropdown)}
    //         >
    //             {readableRoomName}
    //             <div className={styles.dropdown_icon}>
    //                 <RiArrowDownSLine size={20}></RiArrowDownSLine>
    //             </div>
    //         </button>
    //         {showChannelsDropdown && (
    //             <div
    //                 className={
    //                     showChannelsDropdown
    //                         ? styles.active_channel_dropdown_items_containers
    //                         : styles.channel_dropdown_items_containers
    //                 }
    //             >
    //                 {roomArray.map((pool, idx) => (
    //                     <ChannelDisplay
    //                         pool={pool}
    //                         key={idx}
    //                         isDropdown={true}
    //                         favoritePools={props.favoritePools}
    //                         favePools={favePools}
    //                     />
    //                 ))}
    //                 {renderOtherRooms()}
    //             </div>
    //         )}
    //     </div>
    // );

    // const smallScrenView = useMediaQuery('(max-width: 968px)');
    const chatContainer = (
        <div className={styles.chat_main_container}>
            {/* {props.isChatOpen && (
                )} */}
            <div
                ref={verifyBtnRef}
                className={`${styles.verify_button} ${
                    props.isVerified ? styles.verified : ''
                } `}
                onClick={(e) => props.verifyWallet(0, new Date(), e)}
            >
                {props.isModerator && props.isVerified && (
                    <AiOutlineUser
                        className={
                            styles.verify_button_icon +
                            ' ' +
                            styles.verify_button_mod_icon
                        }
                        color='var(--other-green)'
                        size={14}
                    ></AiOutlineUser>
                )}
                {props.isVerified ? (
                    <>
                        <AiOutlineCheck
                            className={styles.verify_button_icon}
                            color='var(--other-green)'
                            size={10}
                        />
                    </>
                ) : (
                    <>
                        <AiOutlineClose
                            className={styles.verify_button_icon}
                            size={10}
                        />
                        <span> Not Verified</span>
                    </>
                )}
            </div>
            {messageList}
            {chatNotification}

            {messageInput}
            {props.rndMentSkipper && props.rndMentSkipper()}
            <div id='thelastmessage' />
        </div>
    );

    // const isButtonFavorited =
    //     readableRoom &&
    //     favePools.check(
    //         readableRoom.base.address,
    //         readableRoom.quote.address,
    //         readableRoom.chainId,
    //         readableRoom.poolIdx,
    //     );
    // function handleFavButton() {
    //     if (readableRoom) {
    //         isButtonFavorited
    //             ? favePools.remove(
    //                   readableRoom.quote,
    //                   readableRoom.base,
    //                   readableRoom.chainId,
    //                   readableRoom.poolIdx,
    //               )
    //             : favePools.add(
    //                   readableRoom.quote,
    //                   readableRoom.base,
    //                   readableRoom.chainId,
    //                   readableRoom.poolIdx,
    //               );
    //     }
    // }

    // const favButton =
    //     !currentRoomIsGlobal && isRoomInRoomArray ? (
    //         <button
    //             className={styles.favorite_button}
    //             onClick={handleFavButton}
    //             id='trade_fav_button'
    //         >
    //             {
    //                 <svg
    //                     width={smallScrenView ? '20px' : '30px'}
    //                     height={smallScrenView ? '20px' : '30px'}
    //                     viewBox='0 0 15 15'
    //                     fill='none'
    //                     xmlns='http://www.w3.org/2000/svg'
    //                 >
    //                     <g clipPath='url(#clip0_1874_47746)'>
    //                         <path
    //                             d='M12.8308 3.34315C12.5303 3.04162 12.1732 2.80237 11.7801 2.63912C11.3869 2.47588 10.9654 2.39185 10.5397 2.39185C10.1141 2.39185 9.69255 2.47588 9.29941 2.63912C8.90626 2.80237 8.54921 3.04162 8.24873 3.34315L7.78753 3.81033L7.32633 3.34315C7.02584 3.04162 6.66879 2.80237 6.27565 2.63912C5.8825 2.47588 5.461 2.39185 5.03531 2.39185C4.60962 2.39185 4.18812 2.47588 3.79498 2.63912C3.40183 2.80237 3.04478 3.04162 2.7443 3.34315C1.47451 4.61294 1.39664 6.75721 2.99586 8.38637L7.78753 13.178L12.5792 8.38637C14.1784 6.75721 14.1005 4.61294 12.8308 3.34315Z'
    //                             fill={isButtonFavorited ? '#EBEBFF' : 'none'}
    //                             stroke='#EBEBFF'
    //                             strokeLinecap='round'
    //                             strokeLinejoin='round'
    //                         />
    //                     </g>
    //                     <defs>
    //                         <clipPath id='clip0_1874_47746'>
    //                             <rect
    //                                 width='14'
    //                                 height='14'
    //                                 fill='white'
    //                                 transform='translate(0.600098 0.599976)'
    //                             />
    //                         </clipPath>
    //                     </defs>
    //                 </svg>
    //             }
    //         </button>
    //     ) : (
    //         ''
    //     );

    return (
        <div
            className={
                isChatSidebarOpen
                    ? styles.main_container
                    : styles.main_container_close
            }
        >
            <section className={styles.left_container}>
                <header className={styles.user_wallet}>
                    <Link to='/account'>{userName}</Link>
                    {sidebarExpandOrCollapseIcon}
                </header>
                {chatChanels}
            </section>
            <section className={styles.right_container}>
                {/* <header className={styles.right_container_header}>
                    {favButton} {currentRoomIsGlobal ? '#' : ''}{' '}
                    {readableRoomName}
                </header>{' '}
                {channelsDropdown} */}
                {props.isChatOpen && props.showPicker && props.reactionPicker}

                <Room
                    selectedRoom={props.room}
                    setRoom={props.setRoom}
                    room={props.room}
                    setIsCurrentPool={props.setIsCurrentPool}
                    isCurrentPool={props.isCurrentPool}
                    showCurrentPoolButton={props.showCurrentPoolButton}
                    setShowCurrentPoolButton={props.setShowCurrentPoolButton}
                    userCurrentPool={props.userCurrentPool}
                    setUserCurrentPool={props.setUserCurrentPool}
                    currentUser={props.currentUser}
                    ensName={props.ensName}
                    setIsFocusMentions={props.setIsFocusMentions}
                    notifications={props.notifications}
                    mentCount={props.mentCount}
                    mentionIndex={props.mentionIndex}
                    isModerator={props.isModerator}
                    isFocusMentions={props.isFocusMentions}
                    setGoToChartParams={props.setGoToChartParams}
                    isChatOpen={true}
                />

                {chatContainer}
            </section>

            <ChatNotificationBubble
                message={props.messageForNotificationBubble}
                setRoom={props.setRoom}
                setSelectedMessageForReply={props.setSelectedMessageForReply}
                setIsReplyButtonPressed={props.setIsReplyButtonPressed}
                setMessageForNotificationBubble={
                    props.setMessageForNotificationBubble
                }
            />

            <ChatToaster
                isActive={props.toastrActive}
                activator={props.toastrActivator}
                text={props.toastrText}
                type={props.toastrType}
            />
            <ChatConfirmationPanel
                isActive={props.showDeleteConfirmation}
                title='Delete Message'
                content='Are you sure you want to delete this message?'
                confirmListener={props.handleConfirmDelete}
                cancelListener={props.handleCancelDelete}
            />
            <ChatConfirmationPanel
                isActive={props.showVerifyOldMessagesPanel}
                title='Verify Old Messages'
                content='Old messages will be verified. Do you want to verify?'
                cancelListener={() => {
                    props.setShowVerifyOldMessagesPanel(false);
                }}
                confirmListener={async () => {
                    props.setShowVerifyOldMessagesPanel(false);
                    await props.updateUnverifiedMessages(
                        props.verifyOldMessagesStartDate,
                        new Date(),
                    );
                    props.activateToastr(
                        'Old messages are verified!',
                        'success',
                    );
                }}
            />
            {props.rndShowPreviousMessages()}
            {props.isChatOpen &&
                props.showReactionPicker &&
                props.reactionPicker}
        </div>
    );
}

export default memo(FullChat);
