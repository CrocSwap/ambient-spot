export const GCGO_ETHEREUM_URLS = (
    import.meta.env.VITE_GCGO_ETHEREUM_URL || 'https://ambindexer.net/gcgo'
).split(',');
export const GCGO_SCROLL_URLS = (
    import.meta.env.VITE_GCGO_SCROLL_URL || 'https://ambindexer.net/scroll-gcgo'
).split(',');
export const GCGO_PLUME_URLS = (
    import.meta.env.VITE_GCGO_PLUME_URL || 'https://ambindexer.net/plume-gcgo'
).split(',');
export const GCGO_BLAST_URLS = (
    import.meta.env.VITE_GCGO_BLAST_URL || 'https://ambindexer.net/blast-gcgo'
).split(',');
export const GCGO_TESTNET_URLS = (
    import.meta.env.VITE_GCGO_TESTNET_URL ||
    'https://ambindexer.net/gcgo-testnet'
).split(',');
