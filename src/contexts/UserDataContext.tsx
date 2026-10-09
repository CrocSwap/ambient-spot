import {
    useAppKitAccount,
    useAppKitNetwork,
    useAppKitProvider,
    useDisconnect,
} from '@reown/appkit/react';
import React, {
    Dispatch,
    SetStateAction,
    createContext,
    useContext,
    useEffect,
    useState,
} from 'react';
import { fetchEnsAddress } from '../ambient-utils/api';
import { checkBlacklist } from '../ambient-utils/constants';
import {
    BlastUserXpIF,
    UserVaultsServerIF,
    UserXpIF,
} from '../ambient-utils/types';
import { UserAvatarDataIF } from '../components/Chat/ChatIFs';
import { getAvatarRest } from '../components/Chat/ChatUtilsHelper';
import { AppStateContext } from './AppStateContext';

export interface UserDataContextIF {
    isUserConnected: boolean | undefined;
    userAddress: string | undefined;
    walletChain: number | undefined;
    disconnectUser: () => void;
    ensName: string | null | undefined;
    resolvedAddressFromContext: string;
    setResolvedAddressInContext: Dispatch<SetStateAction<string>>;
    userProfileNFT: string | undefined;
    setUserProfileNFT: Dispatch<SetStateAction<string | undefined>>;
    userThumbnailNFT: string | undefined;
    setUserThumbnailNFT: Dispatch<SetStateAction<string | undefined>>;
    currentUserID: string | undefined;
    setCurrentUserID: Dispatch<SetStateAction<string | undefined>>;
    isfetchNftTriggered: boolean;
    setIsfetchNftTriggered: Dispatch<SetStateAction<boolean>>;
    secondaryEnsFromContext: string;
    setSecondaryEnsInContext: Dispatch<SetStateAction<string>>;
    nftTestWalletAddress: string;
    setNftTestWalletAddress: Dispatch<SetStateAction<string>>;
    userAvatarData: UserAvatarDataIF | undefined;
    updateUserAvatarData: (
        walletID: string,
        avatarData: UserAvatarDataIF,
    ) => void;
    userVaultData: UserVaultsServerIF[] | undefined;
    setUserVaultData: React.Dispatch<
        React.SetStateAction<UserVaultsServerIF[] | undefined>
    >;
    totalLiquidityValue:
        { value: number; chainId: string; address: string } | undefined;
    setTotalLiquidityValue: React.Dispatch<
        React.SetStateAction<
            { value: number; chainId: string; address: string } | undefined
        >
    >;
    totalExchangeBalanceValue:
        { value: number; chainId: string; address: string } | undefined;
    setTotalExchangeBalanceValue: React.Dispatch<
        React.SetStateAction<
            { value: number; chainId: string; address: string } | undefined
        >
    >;
    totalWalletBalanceValue:
        { value: number; chainId: string; address: string } | undefined;
    setTotalWalletBalanceValue: React.Dispatch<
        React.SetStateAction<
            { value: number; chainId: string; address: string } | undefined
        >
    >;
    totalVaultsValue:
        { value: number; chainId: string; address: string } | undefined;
    setTotalVaultsValue: React.Dispatch<
        React.SetStateAction<
            { value: number; chainId: string; address: string } | undefined
        >
    >;
}

export interface UserXpDataIF {
    dataReceived: boolean;
    data: UserXpIF | undefined;
}
export interface UserNftIF {
    userID: string;
    avatarImage: string | undefined;
}

export interface BlastUserXpDataIF {
    dataReceived: boolean;
    data: BlastUserXpIF | undefined;
}

export const UserDataContext = createContext({} as UserDataContextIF);

export const UserDataContextProvider = (props: {
    children: React.ReactNode;
}) => {
    const [resolvedAddressFromContext, setResolvedAddressInContext] =
        React.useState<string>('');
    const [secondaryEnsFromContext, setSecondaryEnsInContext] =
        React.useState<string>('');

    const [totalLiquidityValue, setTotalLiquidityValue] = React.useState<
        { value: number; chainId: string; address: string } | undefined
    >(undefined);
    const [totalExchangeBalanceValue, setTotalExchangeBalanceValue] =
        React.useState<
            { value: number; chainId: string; address: string } | undefined
        >(undefined);
    const [totalWalletBalanceValue, setTotalWalletBalanceValue] =
        React.useState<
            { value: number; chainId: string; address: string } | undefined
        >(undefined);
    const [totalVaultsValue, setTotalVaultsValue] = React.useState<
        { value: number; chainId: string; address: string } | undefined
    >(undefined);

    const { address: userAddress, isConnected: isUserConnected } =
        useAppKitAccount();

    const { chainId: walletChain } = useAppKitNetwork();

    const { isUserOnline } = useContext(AppStateContext);

    const { disconnect } = useDisconnect();
    const { walletProvider } = useAppKitProvider('eip155');
    async function disconnectUser(): Promise<void> {
        if (walletProvider) {
            try {
                await disconnect();
            } catch (error) {
                console.error('disconnect error', { error });
            }
        }
    }

    const isBlacklisted = userAddress ? checkBlacklist(userAddress) : false;
    if (isBlacklisted) disconnectUser();

    const [ensName, setEnsName] = useState('');

    const [userProfileNFT, setUserProfileNFT] = useState<string | undefined>(
        undefined,
    );

    const [userThumbnailNFT, setUserThumbnailNFT] = useState<
        string | undefined
    >(undefined);

    const [currentUserID, setCurrentUserID] = useState<string | undefined>(
        undefined,
    );

    const [isfetchNftTriggered, setIsfetchNftTriggered] =
        useState<boolean>(false);

    const [nftTestWalletAddress, setNftTestWalletAddress] =
        useState<string>('');

    const [userAvatarData, setUserAvatarData] = useState<
        UserAvatarDataIF | undefined
    >();

    const [userVaultData, setUserVaultData] = useState<
        UserVaultsServerIF[] | undefined
    >();

    // check for ENS name account changes
    useEffect(() => {
        if (isUserOnline) {
            (async () => {
                if (userAddress) {
                    try {
                        const ensResult = await fetchEnsAddress(userAddress);
                        if (ensResult) setEnsName(ensResult);
                        else setEnsName('');
                    } catch (error) {
                        setEnsName('');
                        console.error({ error });
                    }
                }

                // fetch user avatar
                if (userAddress) {
                    const resp = await getAvatarRest(userAddress);
                    setUserAvatarData(resp);
                }
            })();
        }
    }, [userAddress, isUserOnline]);

    const updateUserAvatarData = (
        walletID: string,
        avatarData: UserAvatarDataIF,
    ) => {
        if (walletID == userAddress) {
            setUserAvatarData(avatarData);
        }
    };

    const chainAsNumber: number | undefined = walletChain
        ? typeof walletChain === 'string'
            ? parseInt(walletChain)
            : walletChain
        : undefined;

    const userDataContext: UserDataContextIF = {
        isUserConnected,
        userAddress,
        walletChain: chainAsNumber,
        disconnectUser,
        ensName,
        resolvedAddressFromContext,
        setResolvedAddressInContext,
        secondaryEnsFromContext,
        setSecondaryEnsInContext,
        userProfileNFT,
        setUserProfileNFT,
        userThumbnailNFT,
        setUserThumbnailNFT,
        currentUserID,
        setCurrentUserID,
        setIsfetchNftTriggered,
        isfetchNftTriggered,
        nftTestWalletAddress,
        setNftTestWalletAddress,
        userAvatarData,
        updateUserAvatarData,
        userVaultData,
        setUserVaultData,
        totalLiquidityValue,
        setTotalLiquidityValue,
        totalExchangeBalanceValue,
        setTotalExchangeBalanceValue,
        totalWalletBalanceValue,
        setTotalWalletBalanceValue,
        totalVaultsValue,
        setTotalVaultsValue,
    };

    return (
        <UserDataContext value={userDataContext}>
            {props.children}
        </UserDataContext>
    );
};
