import { UserXpIF, UserXpServerIF, XpSnapshotServerIF } from '../types';

interface argsIF {
    user: string;
    chainId: string;
}

// function to convert level to xp
export const levelToXp = (level: number) => {
    const xp = 250 * (level - 1) ** (3 / 2);
    return xp;
};

// function to convert xp to levels
export const xpToLevel = (xp: number) => {
    const level = Math.floor((xp / 250) ** (2 / 3)) + 1;
    return level;
};

// function to calculate points to next level
export const pointsToNextLevel = (xp: number) => {
    const nextLevel = xpToLevel(xp) + 1;
    const pointsToNextLevel = levelToXp(nextLevel) - xp;
    return pointsToNextLevel;
};

// function to calculate progress percentage to next level
export const progressToNextLevel = (xp: number) => {
    const level = xpToLevel(xp);
    const progressToNextLevel =
        ((xp - levelToXp(level)) / (levelToXp(level + 1) - levelToXp(level))) *
        100;

    return progressToNextLevel;
};

function mapUserXpResponseToUserXp(userXp: UserXpServerIF): UserXpIF {
    const currentLevel = xpToLevel(userXp.globalPoints);
    const pointsRemainingToNextLevel = pointsToNextLevel(userXp.globalPoints);

    const updatedPointsHistory = userXp.pointsHistory?.map(
        (historyItem: XpSnapshotServerIF) => ({
            ...historyItem,
            level: historyItem.cumulativePoints
                ? xpToLevel(historyItem.cumulativePoints)
                : 0,
        }),
    );

    return {
        ...userXp,
        currentLevel,
        pointsRemainingToNextLevel,
        pointsHistory: updatedPointsHistory || undefined,
    };
}

export const fetchUserXpData = async (args: argsIF) => {
    const { user, chainId } = args;

    const userXpEndpoint = 'https://ambindexer.net/xp/user?';

    const userXpFetchData = fetch(
        userXpEndpoint +
            new URLSearchParams({
                user: user.toLowerCase(),
                chainId: (chainId || '').toLowerCase(),
            }),
    )
        .then((response) => response?.json())
        .then((parsedResponse) =>
            mapUserXpResponseToUserXp(parsedResponse.data),
        );

    return userXpFetchData;
};

export const fetchXpLeadersData = async (
    leaderboardType: 'global' | 'byWeek' | 'byChain',
    chainId?: string,
) => {
    const xpLeadersEndpoint = 'https://ambindexer.net/xp/leaderboard?';

    const xpLeaderFetchData = fetch(
        xpLeadersEndpoint +
            new URLSearchParams({
                leaderboardType: leaderboardType,
                chainId: (chainId || '').toLowerCase(),
            }),
    )
        .then((response) => response?.json())
        .then((parsedResponse) =>
            parsedResponse.data.map((userXp: UserXpIF) =>
                mapUserXpResponseToUserXp(userXp),
            ),
        )
        .catch(console.error);

    const xpLeaders = xpLeaderFetchData;

    return xpLeaders;
};
