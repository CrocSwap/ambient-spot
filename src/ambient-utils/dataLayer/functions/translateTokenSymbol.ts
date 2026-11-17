// used for determining whether to reverse default tokens in TradeDataContext and CrocEnvContext
export function translateTokenSymbol(symbol: string): string {
    return symbol.toUpperCase() === 'USDC.E'
        ? 'USDC'
        : symbol.toUpperCase() === 'PETH'
          ? 'ETH'
          : symbol.toUpperCase();
}
