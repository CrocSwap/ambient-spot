import { ReactElement, useContext, useEffect, useState } from 'react';
import { progressToNextLevel } from '../../../ambient-utils/api';
import LevelsCard from '../../../components/Global/LevelsCard/LevelsCard';
import LevelDisplay from '../../../components/Global/LevelsCard/UserLevelDisplay';
import {
    UserDataContext,
    UserXpDataIF,
} from '../../../contexts/UserDataContext';
import { FlexContainer, Text } from '../../../styled/Common';
import styles from './Level.module.css';
import RankTable from './RankTable/RankTable';
// import{ FiRefreshCcw } from 'react-icons/fi';
import {
    getLeaderboardSelectionFromLocalStorage,
    saveLeaderboardSelectionToLocalStorage,
} from '../../../App/functions/localStorage';
import { getAvatarComponent } from '../../../components/Chat/ChatRenderUtils';
import { getAvatarRest } from '../../../components/Chat/ChatUtilsHelper';
import { AppStateContext } from '../../../contexts';
import { ChainDataContext } from '../../../contexts/ChainDataContext';
import { XpLeadersContext } from '../../../contexts/XpLeadersContext';

interface propsIF {
    resolvedAddress: string;
    connectedAccountActive: boolean;
    truncatedAccountAddressOrEnsName: string;
    isLevelOnly?: boolean;
    isDisplayRank?: boolean;
    resolvedUserXp?: UserXpDataIF;
    isViewMoreActive?: boolean;
    setIsViewMoreActive?: React.Dispatch<React.SetStateAction<boolean>>;
}
export default function Level(props: propsIF) {
    const {
        resolvedAddress,
        connectedAccountActive,
        truncatedAccountAddressOrEnsName,
        isLevelOnly,
        isDisplayRank,
        resolvedUserXp,
        isViewMoreActive,
        setIsViewMoreActive,
    } = props;
    const { userAddress } = useContext(UserDataContext);
    const { isUserOnline } = useContext(AppStateContext);
    const { connectedUserXp } = useContext(ChainDataContext);
    const { xpLeaders } = useContext(XpLeadersContext);

    const [shownAvatar, setShownAvatar] = useState<ReactElement>(<></>);

    useEffect(() => {
        (async () => {
            if (isUserOnline) {
                const walletID = resolvedAddress
                    ? resolvedAddress
                    : userAddress
                      ? userAddress
                      : '';
                const avatarData = await getAvatarRest(walletID);

                setShownAvatar(
                    getAvatarComponent(walletID, avatarData, 50, true),
                );
            }
        })();
    }, [resolvedAddress, userAddress, isUserOnline]);

    const isUserPage = userAddress === resolvedAddress;

    const jazziconsToDisplay =
        resolvedAddress || connectedAccountActive || (isUserPage && shownAvatar)
            ? shownAvatar
            : null;

    const xpData =
        isUserPage ||
        connectedAccountActive ||
        location.pathname === '/account/xp'
            ? connectedUserXp
            : resolvedUserXp;

    const pointsData =
        xpData?.data?.pointsHistory?.map((entry) => {
            const elapsedTimeInSecondsNum = entry.snapshotUnixTime
                ? Date.now() / 1000 - entry.snapshotUnixTime
                : undefined;
            const elapsedTimeString =
                elapsedTimeInSecondsNum !== undefined
                    ? elapsedTimeInSecondsNum < 60
                        ? '< 1 minute ago'
                        : elapsedTimeInSecondsNum < 120
                          ? '1 minute ago'
                          : elapsedTimeInSecondsNum < 3600
                            ? `${Math.floor(
                                  elapsedTimeInSecondsNum / 60,
                              )} minutes ago `
                            : elapsedTimeInSecondsNum < 7200
                              ? '1 hour ago'
                              : elapsedTimeInSecondsNum < 86400
                                ? `${Math.floor(
                                      elapsedTimeInSecondsNum / 3600,
                                  )} hours ago `
                                : elapsedTimeInSecondsNum < 172800
                                  ? '1 day ago'
                                  : `${Math.floor(
                                        elapsedTimeInSecondsNum / 86400,
                                    )} days ago `
                    : 'Pending...';
            return {
                date: elapsedTimeString,
                addedPoints: entry.addedPoints.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }),
                retroPoints: entry.retroPoints.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }),
            };
        }) || [];

    const currentLevel = xpData?.data?.currentLevel;
    const globalPoints = xpData?.data?.globalPoints;

    // ------TOTAL POINTS THIS WEEEK-----
    // const now = new Date();
    // const endOfWeek = new Date(now);
    // const startOfWeek = new Date(endOfWeek);
    // // startOfWeek.setHours(0, 0, 0, 0);
    // // startOfWeek.setDate(now.getDate() - now.getDay());

    // startOfWeek.setDate(endOfWeek.getDate() - 7);

    // console.log({ startOfWeek, endOfWeek });

    // const globalPointsCurrentWeek =
    //     xpData?.data?.pointsHistory
    //         ?.filter(
    //             (entry) =>
    //                 entry.snapshotUnixTime >= startOfWeek.getTime() / 1000 &&
    //                 entry.snapshotUnixTime < endOfWeek.getTime() / 1000,
    //         )
    //         ?.reduce((acc, entry) => acc + entry.addedPoints, 0) || 0;

    const globalPointsCurrentWeek = xpData?.data?.weeklyPoints ?? undefined;

    // ---------------------------------

    const progressPercentage = progressToNextLevel(globalPoints ?? 0);

    const levelsCardProps = {
        currentLevel,
        globalPoints,
        globalPointsCurrentWeek,
        progressPercentage,
        pointsData,
        jazziconsToDisplay,
        resolvedAddress,
        pointsRemainingToNextLevel: xpData?.data?.pointsRemainingToNextLevel,
        isViewMoreActive,
        setIsViewMoreActive,
        truncatedAccountAddressOrEnsName: truncatedAccountAddressOrEnsName,
        connectedAccountActive,
    };

    if (isLevelOnly)
        return (
            <LevelDisplay
                currentLevel={currentLevel}
                globalPoints={globalPoints}
                user={truncatedAccountAddressOrEnsName}
            />
        );
    // LEADERBOARD
    const [selectedXpLeaderboardType, setSelectedXpLeaderboardType] = useState(
        getLeaderboardSelectionFromLocalStorage(),
    );

    useEffect(() => {
        xpLeaders.getXpLeaders(selectedXpLeaderboardType);
    }, [selectedXpLeaderboardType]);

    const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
    // const handleLeaderboardRefresh = () => {
    //     setIsLeaderboardLoading(true);
    //     xpLeaders.getXpLeaders(selectedXpLeaderboardType);

    //     setTimeout(() => {
    //         setIsLeaderboardLoading(false);
    //     }, 500);
    // };
    const handleOptionClick = (timeFrame: string) => {
        setSelectedXpLeaderboardType(timeFrame);
        saveLeaderboardSelectionToLocalStorage(timeFrame);
        setIsLeaderboardLoading(true);

        setTimeout(() => {
            setIsLeaderboardLoading(false);
        }, 500);
    };
    const xpLeaderboardTypes = ['Global', 'Weekly'];
    // const xpLeaderboardTypes = ['Global', 'Weekly', 'Chain'];

    if (isDisplayRank) {
        return (
            <div className={styles.level_page_container}>
                <FlexContainer
                    flexDirection='column'
                    margin='2rem auto'
                    style={{ height: '100%', gap: '1rem' }}
                >
                    <FlexContainer
                        flexDirection='row'
                        alignItems='center'
                        justifyContent='space-between'
                    >
                        <Text fontSize='header1' color='white' align='start'>
                            Leaderboard
                        </Text>
                        <FlexContainer
                            flexDirection='row'
                            alignItems='center'
                            gap={8}
                        >
                            <FlexContainer
                                flexDirection='row'
                                alignItems='center'
                                gap={8}
                            >
                                {xpLeaderboardTypes.map((option) => (
                                    <button
                                        className={`${styles.option_button} ${
                                            option ===
                                                selectedXpLeaderboardType &&
                                            styles.selected_button
                                        }`}
                                        key={option}
                                        onClick={() =>
                                            handleOptionClick(option)
                                        }
                                    >
                                        {option}
                                    </button>
                                ))}
                            </FlexContainer>

                            {/* <div
                                className={styles.refresh_button}
                                onClick={handleLeaderboardRefresh}
                            >
                                <FiRefreshCcw />
                            </div> */}
                        </FlexContainer>
                    </FlexContainer>
                    <RankTable
                        xpLeaders={xpLeaders}
                        selectedXpLeaderboardType={selectedXpLeaderboardType}
                        isLoading={isLeaderboardLoading}
                        connectedUserXp={connectedUserXp}
                    />
                </FlexContainer>
            </div>
        );
    }

    if (isViewMoreActive) {
        return (
            <div className={styles.level_page_container}>
                <LevelsCard {...levelsCardProps} />
            </div>
        );
    }

    return (
        <div className={styles.level_page_container}>
            <LevelsCard {...levelsCardProps} />
        </div>
    );
}
