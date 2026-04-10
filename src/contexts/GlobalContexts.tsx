import React, { useEffect } from 'react';
import { cleanupBatchManager } from '../ambient-utils/api';
import { AppStateContextProvider } from './AppStateContext';
import { BottomSheetContextProvider } from './BottomSheetContext';
import { BrandContextProvider } from './BrandContext';
import { CachedDataContextProvider } from './CachedDataContext';
import { CandleContextProvider } from './CandleContext';
import { ChainDataContextProvider } from './ChainDataContext';
import { ChartContextProvider } from './ChartContext';
import { CrocEnvContextProvider } from './CrocEnvContext';
import { DataLoadingContextProvider } from './DataLoadingContext';
import { ExploreContextProvider } from './ExploreContext';
import { GraphDataContextProvider } from './GraphDataContext';
import { PoolContextProvider } from './PoolContext';
import { RangeContextProvider } from './RangeContext';
import { ReceiptContextProvider } from './ReceiptContext';
import { SidebarContextProvider } from './SidebarContext';
import { TokenBalanceContextProvider } from './TokenBalanceContext';
import { TokenContextProvider } from './TokenContext';
import { TradeDataContextProvider } from './TradeDataContext';
import { TradeTableContextProvider } from './TradeTableContext';
import { TradeTokenContextProvider } from './TradeTokenContext';
import { UserDataContextProvider } from './UserDataContext';
import { UserPreferenceContextProvider } from './UserPreferenceContext';
import { XpLeadersContextProvider } from './XpLeadersContext';

export const GlobalContexts = (props: { children: React.ReactNode }) => {
    useEffect(() => {
        return () => {
            (async () => await cleanupBatchManager())();
        };
    }, []);

    return (
        <AppStateContextProvider>
            <CachedDataContextProvider>
                <DataLoadingContextProvider>
                    <UserDataContextProvider>
                        <ReceiptContextProvider>
                            <RangeContextProvider>
                                {/* Everything above here has no context dependencies */}
                                <BottomSheetContextProvider>
                                    <TokenBalanceContextProvider>
                                        <TokenContextProvider>
                                            <TradeDataContextProvider>
                                                <BrandContextProvider>
                                                    <CrocEnvContextProvider>
                                                        <ChainDataContextProvider>
                                                            <XpLeadersContextProvider>
                                                                <ChartContextProvider>
                                                                    <GraphDataContextProvider>
                                                                        <TradeTokenContextProvider>
                                                                            <PoolContextProvider>
                                                                                <CandleContextProvider>
                                                                                    <TradeTableContextProvider>
                                                                                        <UserPreferenceContextProvider>
                                                                                            <SidebarContextProvider>
                                                                                                <ExploreContextProvider>
                                                                                                    {
                                                                                                        props.children
                                                                                                    }
                                                                                                </ExploreContextProvider>
                                                                                            </SidebarContextProvider>
                                                                                        </UserPreferenceContextProvider>
                                                                                    </TradeTableContextProvider>
                                                                                </CandleContextProvider>
                                                                            </PoolContextProvider>
                                                                        </TradeTokenContextProvider>
                                                                    </GraphDataContextProvider>
                                                                </ChartContextProvider>
                                                            </XpLeadersContextProvider>
                                                        </ChainDataContextProvider>
                                                    </CrocEnvContextProvider>
                                                </BrandContextProvider>
                                            </TradeDataContextProvider>
                                        </TokenContextProvider>
                                    </TokenBalanceContextProvider>
                                </BottomSheetContextProvider>
                                {/* Everything below here has no context dependencies */}
                            </RangeContextProvider>
                        </ReceiptContextProvider>
                    </UserDataContextProvider>
                </DataLoadingContextProvider>
            </CachedDataContextProvider>
        </AppStateContextProvider>
    );
};
