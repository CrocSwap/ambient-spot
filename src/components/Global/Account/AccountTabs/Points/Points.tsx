import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { ChainDataContext } from '../../../../../contexts/ChainDataContext';
import {
    UserDataContext,
    UserXpDataIF,
} from '../../../../../contexts/UserDataContext';
import { FlexContainer } from '../../../../../styled/Common';
import { ViewMoreButton } from '../../../../../styled/Components/TransactionTable';
import PointsRow from './PointsRow';

interface propsIF {
    resolvedUserXp: UserXpDataIF;
    connectedAccountActive: boolean;
}

const ambiLogo = (
    <svg
        xmlns='http://www.w3.org/2000/svg'
        width='15'
        height='15'
        viewBox='0 0 14 12'
        fill='none'
    >
        <path
            d='M9.59792 4.99692C9.59792 6.4865 8.43012 7.69404 6.98957 7.69404C5.54902 7.69404 4.38123 6.4865 4.38123 4.99692C4.38123 6.39412 5.54902 7.52678 6.98957 7.52678C8.43012 7.52678 9.59792 6.39412 9.59792 4.99692Z'
            fill='#7371FC'
            stroke='#7371FC'
            strokeWidth='0.272212'
        />
        <path
            d='M10.1405 4.99691C10.1405 6.78672 8.72981 8.23764 6.98963 8.23764C5.24944 8.23764 3.83875 6.78672 3.83875 4.99691C3.83875 4.64205 3.91927 4.30096 4.02767 3.98288C3.91927 4.30096 3.88048 4.64205 3.88048 4.99691C3.88048 6.69434 5.27249 8.03403 6.98963 8.03403C8.70676 8.03403 10.0988 6.69434 10.0988 4.99691C10.0988 4.64339 10.0621 4.30353 9.95448 3.98648C10.0621 4.30353 10.1405 4.64339 10.1405 4.99691Z'
            fill='#7371FC'
            stroke='#7371FC'
            strokeWidth='0.272212'
        />
        <path
            d='M10.2601 3.1436C10.5697 3.69068 10.7664 4.32311 10.7664 4.99689C10.7664 7.12157 9.07545 8.84395 6.98953 8.84395C4.90362 8.84395 3.21265 7.12156 3.21265 4.99689C3.21265 4.32197 3.41166 3.68855 3.72216 3.14084C3.41166 3.68855 3.25438 4.32197 3.25438 4.99689C3.25438 7.01764 4.92666 8.59852 6.98953 8.59852C9.0524 8.59852 10.7247 7.01764 10.7247 4.99689C10.7247 4.32311 10.5697 3.69068 10.2601 3.1436Z'
            fill='#7371FC'
            stroke='#7371FC'
            strokeWidth='0.272212'
        />
        <path
            d='M11.5176 4.99688C11.5176 7.56034 9.49031 9.63844 6.98952 9.63844C4.48872 9.63844 2.46143 7.56034 2.46143 4.99688C2.46143 3.96923 2.8257 3.02174 3.40266 2.26282C2.8257 3.02174 2.50316 3.96923 2.50316 4.99688C2.50316 7.42178 4.51177 9.34074 6.98952 9.34074C9.46726 9.34074 11.4759 7.42178 11.4759 4.99688C11.4759 3.97005 11.1556 3.02326 10.5794 2.26465C11.1556 3.02326 11.5176 3.97005 11.5176 4.99688Z'
            fill='#7371FC'
            stroke='#7371FC'
            strokeWidth='0.272212'
        />
        <path
            d='M12.3732 4.99689C12.3732 7.91832 9.96286 10.2084 6.98956 10.2084C4.01627 10.2084 1.60594 7.91832 1.60594 4.99689C1.60594 2.99206 2.66823 1.24149 4.28343 0.304089C2.66823 1.24149 1.54333 2.99206 1.54333 4.99689C1.54333 8.06843 3.98169 10.5584 6.98956 10.5584C9.99743 10.5584 12.4358 8.06843 12.4358 4.99689C12.4358 2.98776 11.3079 1.23398 9.68695 0.298065C11.3079 1.23398 12.3732 2.98776 12.3732 4.99689Z'
            fill='#7371FC'
            stroke='#7371FC'
            strokeWidth='0.272212'
        />
        <path
            d='M13.4791 4.99689C13.4791 8.50722 10.5737 11.1388 6.98957 11.1388C3.40548 11.1388 0.5 8.50722 0.5 4.99689C0.5 8.66888 3.40548 11.5047 6.98957 11.5047C10.5737 11.5047 13.4791 8.66888 13.4791 4.99689Z'
            fill='#7371FC'
            stroke='#7371FC'
            strokeWidth='0.272212'
        />
    </svg>
);

export default function Points(props: propsIF) {
    const { resolvedUserXp, connectedAccountActive } = props;
    const { ensName } = useContext(UserDataContext);

    // since we're only going to do a set number of finite rows, they can be instantiated
    // ... on an individual basis in the return statement of the function

    const { connectedUserXp } = useContext(ChainDataContext);
    const { userAddress, resolvedAddressFromContext } =
        useContext(UserDataContext);

    const linkToNavigateTo =
        connectedAccountActive && ensName
            ? `/${ensName}/xp`
            : resolvedAddressFromContext
              ? `/${resolvedAddressFromContext}/xp`
              : `/${userAddress}/xp`;

    return (
        <FlexContainer
            fullHeight
            flexDirection='column'
            justifyContent='space-between'
        >
            <div>
                <div>
                    <PointsRow
                        shortName={'AMBI'}
                        longName={'Ambient Points'}
                        pointsAccrued={
                            connectedAccountActive
                                ? connectedUserXp.dataReceived === true
                                    ? (
                                          connectedUserXp.data?.globalPoints ??
                                          0
                                      ).toLocaleString()
                                    : '...'
                                : resolvedUserXp.dataReceived === true
                                  ? (
                                        resolvedUserXp.data?.globalPoints ?? 0
                                    ).toLocaleString()
                                  : '...'
                        }
                        logo={ambiLogo}
                    />
                </div>
            </div>
            <FlexContainer
                fullWidth
                justifyContent='center'
                gap={16}
                style={{ marginBottom: '3rem' }}
            >
                <Link to={linkToNavigateTo}>
                    <FlexContainer
                        justifyContent='center'
                        alignItems='center'
                        padding='8px'
                    >
                        <ViewMoreButton>View Details</ViewMoreButton>
                    </FlexContainer>
                </Link>
                <Link to={'/xp-leaderboard'}>
                    <FlexContainer
                        justifyContent='center'
                        alignItems='center'
                        padding='8px'
                    >
                        <ViewMoreButton>View Leaderboard</ViewMoreButton>
                    </FlexContainer>
                </Link>
                <Link to={'/faq'}>
                    <FlexContainer
                        justifyContent='center'
                        alignItems='center'
                        padding='8px'
                    >
                        <ViewMoreButton>View FAQ</ViewMoreButton>
                    </FlexContainer>
                </Link>
            </FlexContainer>
        </FlexContainer>
    );
}
