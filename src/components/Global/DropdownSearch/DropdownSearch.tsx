import { AnimatePresence, motion } from 'framer-motion';
import {
    ChangeEvent,
    KeyboardEvent,
    useContext,
    useEffect,
    useState,
} from 'react';
import { AiOutlineFire } from 'react-icons/ai';
import { BiSearch } from 'react-icons/bi';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { MdClose } from 'react-icons/md';
import { TokenIF } from '../../../ambient-utils/types';
import SidebarSearchResults from '../../../App/components/Sidebar/SidebarSearchResults/SidebarSearchResults';
import useKeyPress from '../../../App/hooks/useKeyPress';
import {
    sidebarSearchIF,
    useSidebarSearch,
} from '../../../App/hooks/useSidebarSearch';
import { AppStateContext } from '../../../contexts/AppStateContext';
import { GraphDataContext } from '../../../contexts/GraphDataContext';
import { SidebarContext } from '../../../contexts/SidebarContext';
import { TokenContext } from '../../../contexts/TokenContext';
import { TradeDataContext } from '../../../contexts/TradeDataContext';
import { FlexContainer } from '../../../styled/Common';
import { HeaderButtons, HeaderText } from '../../../styled/Components/Chart';
import {
    SearchContainer,
    SearchInput,
} from '../../../styled/Components/Sidebar';
import useMediaQuery from '../../../utils/hooks/useMediaQuery';
import FavoritePools from '../Sidebar/FavoritePools';
import RecentPools from '../Sidebar/RecentPools';
import TopPools from '../Sidebar/TopPools';
import TokenIcon from '../TokenIcon/TokenIcon';
import styles from './DropdownSearch.module.css';

interface optionItem {
    id: number;
    name: string;
    data: React.ReactNode;
}

const DropdownSearch = () => {
    const {
        activeNetwork: { chainId },
    } = useContext(AppStateContext);
    const { tokens } = useContext(TokenContext);
    const { isPoolDropdownOpen, setIsPoolDropdownOpen } =
        useContext(SidebarContext);

    const { baseToken, quoteToken, isDenomBase } = useContext(TradeDataContext);
    const denomInBase = isDenomBase;

    const [topToken, bottomToken]: [TokenIF, TokenIF] = denomInBase
        ? [baseToken, quoteToken]
        : [quoteToken, baseToken];
    const smallScrenView = useMediaQuery('(max-width: 968px)');

    const searchInputElementId = 'sidebar_search_input';
    const focusInput = (): void => {
        const inputField = document.getElementById(
            'sidebar_search_input',
        ) as HTMLInputElement;

        inputField.focus();
    };

    const isEscapePressed = useKeyPress('Escape');
    useEffect(() => {
        if (isEscapePressed && isPoolDropdownOpen) {
            setIsPoolDropdownOpen(false);
            searchData.clearInput();
        }
    }, [isEscapePressed, isPoolDropdownOpen]);

    const { positionsByUser, limitOrdersByUser, transactionsByUser } =
        useContext(GraphDataContext);

    // TODO: can pull into GraphDataContext
    const filterFn = <T extends { chainId: string }>(x: T) =>
        x.chainId === chainId;

    const _positionsByUser = positionsByUser.positions.filter(filterFn);
    const _txsByUser = transactionsByUser.changes.filter(filterFn);
    const _limitsByUser = limitOrdersByUser.limitOrders.filter(filterFn);

    const searchData: sidebarSearchIF = useSidebarSearch(
        _positionsByUser,
        _txsByUser,
        _limitsByUser,
        tokens,
    );

    const searchContainer: React.ReactNode = (
        <SearchContainer
            flexDirection='row'
            alignItems='center'
            justifyContent='center'
            gap={4}
            padding='2px 8px'
        >
            <FlexContainer
                alignItems='center'
                justifyContent='center'
                padding='2px 0 0 0'
            >
                <BiSearch
                    size={18}
                    color={'var(--text2)'}
                    onClick={focusInput}
                />
            </FlexContainer>
            <SearchInput
                type='text'
                id={searchInputElementId}
                value={searchData.rawInput}
                placeholder='Search...'
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    searchData.setInput(e.target.value)
                }
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.code === 'Escape') {
                        // prevent keypress from de-focusing the input
                        e.stopPropagation();
                        // clear search input, DOM will update
                        searchData.clearInput();
                        // unfocus the input
                        e.currentTarget.blur();
                    }
                }}
                spellCheck='false'
                autoComplete='off'
                tabIndex={1}
            />
            {searchData.isInputValid && (
                <FlexContainer
                    onClick={() => {
                        // clear search input, DOM will update
                        searchData.clearInput();
                        // manually focus DOM on the search input
                        const searchInput =
                            document.getElementById(searchInputElementId);
                        searchInput && searchInput.focus();
                    }}
                    role='button'
                    tabIndex={0}
                >
                    <MdClose size={18} color='#ebebeb66' />{' '}
                </FlexContainer>
            )}
        </SearchContainer>
    );

    const optionButtons = [
        {
            id: 1,
            name: 'Top Pools',
            data: <TopPools />,
        },
        {
            id: 2,
            name: 'Favorites',
            data: <FavoritePools />,
        },
        {
            id: 3,
            name: 'Recent Pairs',
            data: <RecentPools />,
        },
    ];

    const [activeOption, setActiveOption] = useState<optionItem>(
        optionButtons[0],
    );

    const handleClick = (option: optionItem) => {
        setActiveOption(option);
    };

    const optionButtonsDisplay = (
        <FlexContainer flexDirection='row' gap={8} justifyContent='flex-start'>
            {optionButtons.map((option) => (
                <motion.button
                    key={option.id}
                    onClick={() => handleClick(option)}
                    className={`${styles.option_button} ${
                        activeOption.name === option.name
                            ? styles.active_option
                            : null
                    }`}
                >
                    {option.name === 'Trending' ? (
                        <FlexContainer gap={4} alignItems='center'>
                            <AiOutlineFire />
                            {option.name}
                        </FlexContainer>
                    ) : (
                        option.name
                    )}
                </motion.button>
            ))}
        </FlexContainer>
    );

    const toggleDropdown = () => {
        setIsPoolDropdownOpen((prevState) => !prevState);
    };

    const dropdownSearchContent = !isPoolDropdownOpen ? null : (
        <div className={styles.dropdown_container}>
            {searchContainer}
            {searchData.isInputValid || optionButtonsDisplay}

            <motion.div
                className={styles.dropdown_content}
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                transition={{ type: 'spring', stiffness: 200 }}
            >
                {searchData.isInputValid ? (
                    <SidebarSearchResults searchData={searchData} />
                ) : (
                    activeOption?.data
                )}
            </motion.div>
        </div>
    );

    return (
        <AnimatePresence>
            <FlexContainer gap={8} className={styles.main_container}>
                <HeaderButtons
                    id='token_pair_in_chart_header'
                    aria-label='toggle dropdown.'
                    onClick={toggleDropdown}
                    style={{ justifyContent: 'flex-start' }}
                >
                    <FlexContainer
                        id='trade_chart_header_token_pair_logos'
                        role='button'
                        gap={8}
                    >
                        <TokenIcon
                            token={topToken}
                            src={topToken.logoURI}
                            alt={topToken.symbol}
                            size={smallScrenView ? 's' : 'l'}
                        />
                        <TokenIcon
                            token={bottomToken}
                            src={bottomToken.logoURI}
                            alt={bottomToken.symbol}
                            size={smallScrenView ? 's' : 'l'}
                        />
                    </FlexContainer>
                    <HeaderText
                        id='trade_chart_header_token_pair_symbols'
                        fontSize='header1'
                        fontWeight='300'
                        color='text1'
                        role='button'
                        aria-live='polite'
                        aria-atomic='true'
                        aria-relevant='all'
                        style={{ minWidth: '160px' }}
                    >
                        {topToken.symbol} / {bottomToken.symbol}
                    </HeaderText>
                    <span className={styles.arrow_icon}>
                        {isPoolDropdownOpen ? (
                            <FaChevronUp />
                        ) : (
                            <FaChevronDown />
                        )}
                    </span>
                </HeaderButtons>
                {dropdownSearchContent}
            </FlexContainer>
        </AnimatePresence>
    );
};
export default DropdownSearch;
