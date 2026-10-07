import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from 'react';

// Define the shape of the context
interface BottomSheetContextType {
    isBottomSheetOpen: boolean;
    openBottomSheet: () => void;
    closeBottomSheet: () => void;
}

const BottomSheetContext = createContext<BottomSheetContextType | undefined>(
    undefined,
);

// Hook for accessing the context
export const useBottomSheet = () => {
    const context = useContext(BottomSheetContext);
    if (!context) {
        throw new Error(
            'useBottomSheet must be used within a BottomSheetProvider',
        );
    }
    return context;
};

export const BottomSheetContextProvider: React.FC<{
    children: React.ReactNode;
}> = ({ children }) => {
    const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

    // Memoize the handler functions so they don't get recreated on every render
    const openBottomSheet = useCallback(() => {
        setIsBottomSheetOpen(true);
    }, []);

    const closeBottomSheet = useCallback(() => {
        setIsBottomSheetOpen(false);
    }, []);

    // Memoize the context value to prevent unnecessary re-renders of consuming components
    const value = useMemo(
        () => ({
            isBottomSheetOpen,
            openBottomSheet,
            closeBottomSheet,
        }),
        [isBottomSheetOpen, openBottomSheet, closeBottomSheet],
    );

    return <BottomSheetContext value={value}>{children}</BottomSheetContext>;
};
