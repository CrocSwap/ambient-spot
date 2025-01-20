import { TokenIF } from '../types/token/TokenIF';

// Use `defaultTokens` directly as the registry
export const defaultTokens: TokenIF[] = [];

// Helper to register tokens
function registerToken(token: TokenIF): TokenIF {
    defaultTokens.push(token);
    return token;
}

export const mainnetETH: TokenIF = registerToken({
    address: '0x0000000000000000000000000000000000000000',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
    name: 'Ether',
    symbol: 'ETH',
});

export const mainnetUSDC: TokenIF = registerToken({
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 1,
    decimals: 6,
    logoURI:
        'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png',
    name: 'USDC',
    symbol: 'USDC',
});

export const mainnetWBTC: TokenIF = registerToken({
    address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    chainId: 1,
    decimals: 8,
    logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
    name: 'Wrapped Bitcoin',
    symbol: 'WBTC',
});

export const mainnetPEPE: TokenIF = registerToken({
    address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    chainId: 1,
    decimals: 18,
    logoURI:
        'https://assets.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1682922725',
    name: 'Pepe',
    symbol: 'PEPE',
});

export const mainnetSWETH: TokenIF = registerToken({
    address: '0xf951e335afb289353dc249e82926178eac7ded78',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://etherscan.io/token/images/swellnetwork_32.png',
    name: 'Swell Ethereum',
    symbol: 'swETH',
});

export const mainnetRSETH: TokenIF = registerToken({
    address: '0xa1290d69c65a6fe4df752f95823fae25cb99e5a7',
    chainId: 1,
    decimals: 18,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/e1522c29a42749fd5ec81.svg',
    name: 'Kelp DAO Restaked ETH',
    symbol: 'rsETH',
});

export const mainnetRSWETH: TokenIF = registerToken({
    address: '0xFAe103DC9cf190eD75350761e95403b7b8aFa6c0',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://etherscan.io/token/images/rsweth_32.png?=v3',
    name: 'Restaked Swell ETH',
    symbol: 'rswETH',
});

export const mainnetSWELL: TokenIF = registerToken({
    address: '0x0a6E7Ba5042B38349e437ec6Db6214AEC7B35676',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/24924.png',
    name: 'Swell Governance Token',
    symbol: 'SWELL',
});

export const mainnetSTONE: TokenIF = registerToken({
    name: 'StakeStone Ether',
    address: '0x7122985656e38bdc0302db86685bb972b145bd3c',
    symbol: 'STONE',
    decimals: 18,
    chainId: 1,
    logoURI: 'https://etherscan.io/token/images/stakestone_32.png',
});

export const mainnetLIDO: TokenIF = registerToken({
    address: '0x5a98fcbea516cf06857215779fd812ca3bef1b32',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://etherscan.io/token/images/lido-dao_32.png',
    name: 'Lido DAO',
    symbol: 'LDO',
});

export const mainnetTBTC: TokenIF = registerToken({
    address: '0x18084fbA666a33d37592fA2633fD49a74DD93a88',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/26133.png',
    name: 'tBTC v2',
    symbol: 'tBTC',
});

export const mainnetLUSD: TokenIF = registerToken({
    address: '0x5f98805A4E8be255a32880FDeC7F6728C6568bA0',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://etherscan.io/token/images/liquitylusd_32.png',
    name: 'Liquity USD',
    symbol: 'LUSD',
});

export const mainnetMKR: TokenIF = registerToken({
    address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://etherscan.io/token/images/mkr-etherscan-35.png',
    name: 'Maker',
    symbol: 'MKR',
});

export const mainnetSYN: TokenIF = registerToken({
    address: '0x0f2d719407fdbeff09d87557abb7232601fd9f29',
    chainId: 1,
    decimals: 18,
    logoURI:
        'https://assets.coingecko.com/coins/images/18024/thumb/syn.png?1635002049',
    name: 'Synapse',
    symbol: 'SYN',
});

export const mainnetPENDLE: TokenIF = registerToken({
    address: '0x808507121b80c02388fad14726482e061b8da827',
    chainId: 1,
    decimals: 18,
    logoURI:
        'https://assets.coingecko.com/coins/images/15069/thumb/Pendle_Logo_Normal-03.png',
    name: 'Pendle',
    symbol: 'PENDLE',
});

export const mainnetDAI: TokenIF = registerToken({
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    chainId: 1,
    decimals: 18,
    logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x6B175474E89094C44Da98b954EedeAC495271d0F/logo.png',
    name: 'Dai Stablecoin',
    symbol: 'DAI',
});

export const mainnetRPL: TokenIF = registerToken({
    address: '0xd33526068d116ce69f19a9ee46f0bd304f21a51f',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://etherscan.io/token/images/Rocketpool_32.png',
    name: 'Rocket Pool',
    symbol: 'RPL',
});

export const mainnetWstETH: TokenIF = registerToken({
    address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://scroll-tech.github.io/token-list/data/wstETH/logo.svg',
    name: 'Wrapped liquid staked Ether 2.0',
    symbol: 'wstETH',
});

export const mainnetMATIC: TokenIF = registerToken({
    address: '0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/4713/thumb/polygon.png',
    name: 'Matic Token',
    symbol: 'MATIC',
});

export const mainnetFRAX: TokenIF = registerToken({
    address: '0x853d955acef822db058eb8505911ed77f175b99e',
    chainId: 1,
    decimals: 18,
    logoURI: 'https://etherscan.io/token/images/fraxfinanceeth2_32.png',
    name: 'Frax',
    symbol: 'FRAX',
});

export const mainnetUSDT: TokenIF = registerToken({
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 1,
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/325/thumb/Tether.png',
    name: 'Tether',
    symbol: 'USDT',
});

export const mainnetETHFI: TokenIF = registerToken({
    address: '0xFe0c30065B384F05761f15d0CC899D4F9F9Cc0eB',
    chainId: 1,
    decimals: 18,
    logoURI:
        'https://assets.coingecko.com/coins/images/35958/thumb/etherfi.jpeg?1710254562',
    name: 'ether.fi governance token',
    symbol: 'ETHFI',
});

export const blastETH: TokenIF = registerToken({
    address: '0x0000000000000000000000000000000000000000',
    chainId: 81457,
    decimals: 18,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
    name: 'Ether',
    symbol: 'ETH',
});

export const blastUSDB: TokenIF = registerToken({
    address: '0x4300000000000000000000000000000000000003',
    chainId: 81457,
    decimals: 18,
    logoURI:
        'https://assets-global.website-files.com/65a6baa1a3f8ed336f415cb4/65c67f0ebf2f6a1bd0feb13c_usdb-icon-yellow.png',
    name: 'USDB',
    symbol: 'USDB',
});

export const blastBLAST: TokenIF = registerToken({
    address: '0xb1a5700fA2358173Fe465e6eA4Ff52E36e88E2ad',
    chainId: 81457,
    decimals: 18,
    logoURI: '',
    name: 'Blast',
    symbol: 'BLAST',
});

export const blastUSDPLUS: TokenIF = registerToken({
    address: '0x4fee793d435c6d2c10c135983bb9d6d4fc7b9bbd',
    chainId: 81457,
    decimals: 18,
    logoURI: '',
    name: 'USD+',
    symbol: 'USD+',
});

export const blastORBIT: TokenIF = registerToken({
    address: '0x42E12D42b3d6C4A74a88A61063856756Ea2DB357',
    chainId: 81457,
    decimals: 18,
    name: 'Orbit Protocol',
    symbol: 'ORBIT',
    logoURI: 'https://blastscan.io/token/images/orbit_32.png',
});

export const blastMIA: TokenIF = registerToken({
    address: '0xA4C7aA67189EC5623121c6C94Ec757DfeD932D4B',
    chainId: 81457,
    decimals: 18,
    name: 'Mia',
    symbol: 'MIA',
    logoURI: 'https://miablastsoff.com/images/logo.png',
});

export const blastJUICE: TokenIF = registerToken({
    address: '0x818a92bc81aad0053d72ba753fb5bc3d0c5c0923',
    chainId: 81457,
    decimals: 18,
    name: 'Juice Finance',
    symbol: 'JUICE',
    logoURI: 'https://miablastsoff.com/images/logo.png',
});

export const blastMIM: TokenIF = registerToken({
    address: '0x76DA31D7C9CbEAE102aff34D3398bC450c8374c1',
    chainId: 81457,
    decimals: 18,
    name: 'Magic Internet Money',
    symbol: 'MIM',
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/162.png',
});

export const blastBAG: TokenIF = registerToken({
    address: '0xb9dfCd4CF589bB8090569cb52FaC1b88Dbe4981F',
    chainId: 81457,
    decimals: 18,
    name: 'Bag',
    symbol: 'BAG',
    logoURI: 'https://assets.coingecko.com/coins/images/35417/thumb/bag-cg.png',
});

export const blastBEPE: TokenIF = registerToken({
    address: '0xB582Dc28968c725D2868130752aFa0c13EbF9b1a',
    chainId: 81457,
    decimals: 18,
    name: 'Blast Pepe',
    symbol: 'BEPE',
    logoURI:
        'https://assets.coingecko.com/coins/images/35658/standard/logo_200.png',
});

export const blastALIEN: TokenIF = registerToken({
    address: '0xCa84812E477eE5a96a92328689D8Ce2589aB6FfD',
    chainId: 81457,
    decimals: 18,
    name: 'Alien',
    symbol: 'ALIEN',
    logoURI: '',
});

export const blastESE: TokenIF = registerToken({
    address: '0x491e6DE43b55c8EAE702EDC263E32339da42f58c',
    chainId: 81457,
    decimals: 18,
    name: 'eesee',
    symbol: 'ESE',
    logoURI: '',
});

export const blastYESv1: TokenIF = registerToken({
    address: '0x20fE91f17ec9080E3caC2d688b4EcB48C5aC3a9C',
    chainId: 81457,
    decimals: 18,
    name: 'YES Money v1',
    symbol: 'YESv1',
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29620.png',
});

export const blastYES: TokenIF = registerToken({
    address: '0x1a49351bdB4BE48C0009b661765D01ed58E8C2d8',
    chainId: 81457,
    decimals: 18,
    name: 'YES Money v2',
    symbol: 'YES',
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29620.png',
});

export const blastWETH: TokenIF = registerToken({
    address: '0x4300000000000000000000000000000000000004',
    chainId: 81457,
    decimals: 18,
    name: 'Wrapped Ether',
    symbol: 'wETH',
    logoURI: '',
});

export const blastWEETH: TokenIF = registerToken({
    address: '0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A',
    chainId: 81457,
    decimals: 18,
    name: 'Wrapped eETH',
    symbol: 'weETH',
    logoURI:
        'https://tokenlogo.xyz/assets/token/0x7e7d4467112689329f7e06571ed0e8cbad4910ee.svg',
});

export const blastWrsETH: TokenIF = registerToken({
    name: 'Wrapped Kelp DAO Restaked ETH',
    address: '0xe7903B1F75C534Dd8159b313d92cDCfbC62cB3Cd',
    symbol: 'wrsETH',
    decimals: 18,
    chainId: 81457,
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29242.png',
});

export const blastEzETH: TokenIF = registerToken({
    name: 'Renzo Restaked ETH',
    address: '0x2416092f143378750bb29b79eD961ab195CcEea5',
    symbol: 'ezETH',
    decimals: 18,
    chainId: 81457,
    logoURI: '',
});

export const blastPUMP: TokenIF = registerToken({
    address: '0x216A5a1135A9dab49FA9Ad865E0f22FE22b5630A',
    chainId: 81457,
    decimals: 18,
    name: 'Pump',
    symbol: 'PUMP',
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29601.png',
});

export const blastOLE: TokenIF = registerToken({
    address: '0x73c369f61c90f03eb0dd172e95c90208a28dc5bc',
    chainId: 81457,
    decimals: 18,
    name: 'OpenLeverage',
    symbol: 'OLE',
    logoURI: '',
});

export const blastSepoliaETH: TokenIF = registerToken({
    address: '0x0000000000000000000000000000000000000000',
    chainId: 168587773,
    decimals: 18,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
    name: 'Ether',
    symbol: 'ETH',
});

export const blastSepoliaUSDB: TokenIF = registerToken({
    address: '0x4200000000000000000000000000000000000022',
    chainId: 168587773,
    decimals: 18,
    logoURI:
        'https://assets-global.website-files.com/65a6baa1a3f8ed336f415cb4/65c67f0ebf2f6a1bd0feb13c_usdb-icon-yellow.png',
    name: 'USDB',
    symbol: 'USDB',
});

export const sepoliaETH: TokenIF = registerToken({
    name: 'Native Ether',
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    chainId: 11155111,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
});

export const sepoliaUSDC: TokenIF = registerToken({
    name: 'USDC',
    address: '0x60bBA138A74C5e7326885De5090700626950d509',
    symbol: 'USDC',
    decimals: 6,
    chainId: 11155111,
    logoURI:
        'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png',
});

export const sepoliaWBTC: TokenIF = registerToken({
    name: 'Wrapped BTC',
    address: '0xCA97CC9c1a1dfA54A252DaAFE9b5Cd1E16C81328',
    symbol: 'WBTC',
    decimals: 8,
    chainId: 11155111,
    logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
});

export const scrollSepoliaWBTC: TokenIF = registerToken({
    name: 'Wrapped BTC',
    address: '0xb3B942b6d4a4858838aAb8f94DdaEdd479CD1594',
    symbol: 'WBTC',
    decimals: 8,
    chainId: 534351,
    logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
});

export const scrollETH: TokenIF = registerToken({
    name: 'Native Ether',
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
});

export const scrollWstETH: TokenIF = registerToken({
    name: 'Bridged Wrapped Lido Staked Ether',
    address: '0xf610A9dfB7C89644979b4A0f27063E9e7d7Cda32',
    symbol: 'wstETH',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://scroll-tech.github.io/token-list/data/wstETH/logo.svg',
});

export const scrollWeETH: TokenIF = registerToken({
    name: 'Wrapped eETH',
    address: '0x01f0a31698c4d065659b9bdc21b3610292a1c506',
    symbol: 'weETH',
    decimals: 18,
    chainId: 534352,
    logoURI:
        'https://tokenlogo.xyz/assets/token/0x7e7d4467112689329f7e06571ed0e8cbad4910ee.svg',
});

export const scrollSCR: TokenIF = registerToken({
    name: 'Scroll',
    address: '0xd29687c813d741e2f938f4ac377128810e217b1b',
    symbol: 'SCR',
    decimals: 18,
    chainId: 534352,
    logoURI:
        'https://assets.coingecko.com/coins/images/50571/thumb/scroll.jpg?1728376125',
});

export const scrollSCROLLY: TokenIF = registerToken({
    name: 'Scrolly The Map',
    address: '0xb65aD8d81d1E4Cb2975352338805AF6e39BA8Be8',
    symbol: 'SCROLLY',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://scrollscan.com/token/images/scrollythemap_32.png',
});

export const scrollSTG: TokenIF = registerToken({
    name: 'StargateToken',
    address: '0x8731d54E9D02c286767d56ac03e8037C07e01e98',
    symbol: 'STG',
    decimals: 18,
    chainId: 534352,
    logoURI:
        'https://assets.coingecko.com/coins/images/24413/standard/STG_LOGO.png',
});

export const scrollSCRIBES: TokenIF = registerToken({
    name: 'SCRIBES',
    address: '0x750351a9F75F98f2c2E91D4eDb3BeB14e719557E',
    symbol: 'SCRIBES',
    decimals: 18,
    chainId: 534352,
    logoURI: '',
});

export const scrollSKY: TokenIF = registerToken({
    name: 'Skydrome',
    address: '0x95a52EC1d60e74CD3Eb002fE54A2c74b185A4C16',
    symbol: 'SKY',
    decimals: 18,
    chainId: 534352,
    logoURI:
        'https://assets.coingecko.com/coins/images/33902/standard/icon_200x200.png?1703237670',
});

export const scrollPANDA: TokenIF = registerToken({
    name: 'PANDA',
    address: '0x61a9cC561b6c1F9C31bcDeb447aFeCf25f33Bbf9',
    symbol: 'PANDA',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://assets.coingecko.com/coins/images/35746/thumb/panda.jpeg',
});

export const scrollSOL: TokenIF = registerToken({
    name: 'Wrapped SOL',
    address: '0xCDf95E1F720caade4b1DC83ABfE15400D2a458AD',
    symbol: 'SOL',
    decimals: 9,
    chainId: 534352,
    logoURI: '',
});

export const scrollWrsETH: TokenIF = registerToken({
    name: 'Wrapped Kelp DAO Restaked ETH',
    address: '0xa25b25548b4c98b0c7d3d27dca5d5ca743d68b7f',
    symbol: 'wrsETH',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29242.png',
});

export const scrollRswETH: TokenIF = registerToken({
    name: 'Restaked Swell ETH',
    address: '0x89f17aB70cAFB1468D633056161573efEfeA0713',
    symbol: 'rswETH',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://etherscan.io/token/images/rsweth_32.png?=v3',
});

export const scrollRsETH: TokenIF = registerToken({
    name: 'KelpDao Restaked ETH',
    address: '0x65421ba909200b81640d98b979d07487c9781b66',
    symbol: 'rsETH',
    decimals: 18,
    chainId: 534352,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/e1522c29a42749fd5ec81.svg',
});

export const scrollSTONE: TokenIF = registerToken({
    name: 'StakeStone Ether',
    address: '0x80137510979822322193FC997d400D5A6C747bf7',
    symbol: 'STONE',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://etherscan.io/token/images/stakestone_32.png',
});

export const scrollUniETH: TokenIF = registerToken({
    name: 'Universal ETH',
    address: '0x15eefe5b297136b8712291b632404b66a8ef4d25',
    symbol: 'uniETH',
    decimals: 18,
    chainId: 534352,
    logoURI:
        'https://assets.coingecko.com/coins/images/28477/standard/uniETH_200.png?1696527471',
});

export const scrollRocketPoolETH: TokenIF = registerToken({
    name: 'Rocket Pool ETH',
    address: '0x53878B874283351D26d206FA512aEcE1Bef6C0dD',
    symbol: 'rETH',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://scroll-tech.github.io/token-list/data/rETH/logo.svg',
});

export const scrollPxETH: TokenIF = registerToken({
    name: 'Pirex Ether OFT',
    address: '0x9e0d7d79735e1c63333128149c7b616a0dc0bbdb',
    symbol: 'pxETH',
    decimals: 18,
    chainId: 534352,
    logoURI: '',
});

export const scrollPufETH: TokenIF = registerToken({
    name: 'PufferVault',
    address: '0xc4d46E8402F476F269c379677C99F18E22Ea030e',
    symbol: 'pufETH',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://scroll-tech.github.io/token-list/data/PufETH/logo.svg',
});

export const scrollWrappedETH: TokenIF = registerToken({
    name: 'Wrapped Ether',
    address: '0x5300000000000000000000000000000000000004',
    symbol: 'wETH',
    decimals: 18,
    chainId: 534352,
    logoURI: '',
});

export const scrollBalancer: TokenIF = registerToken({
    name: 'Balancer',
    address: '0x6a28e90582c583fcd3347931c544819C31e9D0e0',
    symbol: 'BAL',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://scrollscan.com/token/images/balancer_ofc_32.png',
});

export const scrollDODO: TokenIF = registerToken({
    name: 'DODO bird',
    address: '0x912aB742e1ab30ffa87038C425F9Bc8ED12B3EF4',
    symbol: 'DODO',
    decimals: 18,
    chainId: 534352,
    logoURI:
        'https://assets.coingecko.com/coins/images/12651/standard/dodo_logo.png?1696512458',
});

export const scrollUSDC: TokenIF = registerToken({
    name: 'Bridged USD Coin',
    address: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4',
    symbol: 'USDC',
    decimals: 6,
    chainId: 534352,
    logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
});

export const scrollAxlUSDC: TokenIF = registerToken({
    name: 'Bridged Axelar Wrapped USD Coin',
    address: '0xEB466342C4d449BC9f53A865D5Cb90586f405215',
    symbol: 'axlUSDC',
    decimals: 6,
    chainId: 534352,
    logoURI: '',
});

export const scrollSUSDe: TokenIF = registerToken({
    name: 'Staked USDe',
    address: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
    symbol: 'sUSDe',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29471.png',
});

export const scrollUSDE: TokenIF = registerToken({
    chainId: 534352,
    address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
    name: 'Ethena USDe',
    symbol: 'USDe',
    decimals: 18,
    logoURI: '',
});

export const scrollDAI: TokenIF = registerToken({
    name: 'Dai Stablecoin',
    address: '0xcA77eB3fEFe3725Dc33bccB54eDEFc3D9f764f97',
    symbol: 'DAI',
    decimals: 18,
    chainId: 534352,
    logoURI:
        'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png',
});
export const scrollKNC: TokenIF = registerToken({
    name: 'Kyber Network Crystal v2',
    address: '0x608ef9a3bffe206b86c3108218003b3cfbf99c84',
    symbol: 'KNC',
    decimals: 18,
    chainId: 534352,
    logoURI: 'https://scrollscan.com/token/images/kybernetworkknc_32.png',
});
export const scrollSINU: TokenIF = registerToken({
    name: 'Scroll Inu',
    address: '0x3660020acc6e993bbdc618dd63b15ad2a3a6d139',
    symbol: 'SINU',
    decimals: 18,
    chainId: 534352,
    logoURI: '',
});
export const scrollSOLVBTC: TokenIF = registerToken({
    name: 'Free Bridged SolvBTC.b',
    address: '0x3Ba89d490AB1C0c9CC2313385b30710e838370a4',
    symbol: 'SolvBTC.b',
    decimals: 18,
    chainId: 534352,
    logoURI:
        'https://assets.coingecko.com/coins/images/36800/standard/solvBTC.png',
});

export const scrollUSDT: TokenIF = registerToken({
    chainId: 534352,
    address: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
    name: 'Bridged Tether USD',
    symbol: 'USDT',
    decimals: 6,
    logoURI: 'https://scroll-tech.github.io/token-list/data/USDT/logo.svg',
});

export const scrollWBTC: TokenIF = registerToken({
    chainId: 534352,
    address: '0x3C1BCa5a656e69edCD0D4E36BEbb3FcDAcA60Cf1',
    name: 'Bridged Wrapped Bitcoin',
    symbol: 'WBTC',
    decimals: 8,
    logoURI:
        'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
});

export const scrollSepoliaETH: TokenIF = registerToken({
    name: 'Native Ether',
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    chainId: 534351,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
});

export const scrollSepoliaUSDC: TokenIF = registerToken({
    name: 'USDC',
    address: '0x4D65fB724CEd0CFC6ABFD03231C9CDC2C36A587B',
    symbol: 'USDC',
    decimals: 6,
    chainId: 534351,
    logoURI:
        'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png',
});

export const plumeSepoliaETH: TokenIF = registerToken({
    name: 'Native Ether',
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    chainId: 98864,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
});

export const plumeSepoliaUSD: TokenIF = registerToken({
    name: 'Plume USD',
    address: '0xe644F07B1316f28a7F134998e021eA9f7135F351',
    symbol: 'pUSD',
    decimals: 6,
    chainId: 98864,
    logoURI: 'https://img.cryptorank.io/coins/plume_network1716480863760.png',
});

export const plumeSepoliaNEV: TokenIF = registerToken({
    name: 'Nest Egg Vault',
    address: '0x659619AEdf381c3739B0375082C2d61eC1fD8835',
    symbol: 'NEV',
    decimals: 6,
    chainId: 98864,
    logoURI: '',
});

export const swellSepoliaETH: TokenIF = registerToken({
    name: 'Native Ether',
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    chainId: 1924,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
});

export const swellSepoliaUSDC: TokenIF = registerToken({
    name: 'Ambient USDC',
    address: '0xfEfD8bCB0034A2B0E3CC22e2f5A59279FAe67128',
    symbol: 'USDC',
    decimals: 6,
    chainId: 1924,
    logoURI:
        'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png',
});

export const swellSepoliaUSDT: TokenIF = registerToken({
    name: 'Ambient USDT',
    address: '0x60bBA138A74C5e7326885De5090700626950d509',
    symbol: 'USDT',
    decimals: 6,
    chainId: 1924,
    logoURI: '',
});

export const baseSepoliaETH: TokenIF = registerToken({
    name: 'Native Ether',
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    chainId: 84532,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
});

export const baseSepoliaUSDC: TokenIF = registerToken({
    name: 'Ambient USDC',
    address: '0x1B98743bB9297A60FF9e75EA2630A77bf72bc17c',
    symbol: 'USDC',
    decimals: 6,
    chainId: 84532,
    logoURI:
        'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png',
});

export const swellETH: TokenIF = registerToken({
    name: 'Native Ether',
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    chainId: 1923,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
});

export const swellUBTC: TokenIF = registerToken({
    name: 'uBTC',
    address: '0xFA3198ecF05303a6d96E57a45E6c815055D255b1',
    symbol: 'uBTC',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/bsquared.svg',
});

export const swellWSTETH: TokenIF = registerToken({
    name: 'Wrapped liquid staked Ether 2.0',
    address: '0x7c98E0779EB5924b3ba8cE3B17648539ed5b0Ecc',
    symbol: 'wstETH',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/61bd908177ce4eef8d4a9.png',
});

export const swellPZETH: TokenIF = registerToken({
    name: 'Renzo Restaked LST',
    address: '0x9cb41CD74D01ae4b4f640EC40f7A60cA1bCF83E7',
    symbol: 'pzETH',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://raw.githubusercontent.com/hyperlane-xyz/hyperlane-registry/refs/heads/main/deployments/warp_routes/PZETH/logo.svg',
});

export const swellEZETH: TokenIF = registerToken({
    name: 'Renzo Restaked ETH',
    address: '0x2416092f143378750bb29b79eD961ab195CcEea5',
    symbol: 'ezETH',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://raw.githubusercontent.com/hyperlane-xyz/hyperlane-registry/refs/heads/main/deployments/warp_routes/EZETH/logo.svg',
});

export const swellRSWELL: TokenIF = registerToken({
    name: 'rSWELL',
    address: '0x939f1cC163fDc38a77571019eb4Ad1794873bf8c',
    symbol: 'rSWELL',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/bafadce2c7f8b374f127b.svg',
});

export const swellSWBTC: TokenIF = registerToken({
    name: 'swBTC',
    address: '0x1cf7b5f266A0F39d6f9408B90340E3E71dF8BF7B',
    symbol: 'swBTC',
    decimals: 8,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/64b0af65ae04a5d71ccee.svg',
});

export const swellSWELL: TokenIF = registerToken({
    name: 'Swell Governance Token',
    address: '0x2826D136F5630adA89C1678b64A61620Aab77Aea',
    symbol: 'SWELL',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/4b0af65ae04a5d71cceeb.svg',
});

export const swellRSWETH: TokenIF = registerToken({
    name: 'rswETH',
    address: '0x18d33689AE5d02649a859A1CF16c9f0563975258',
    symbol: 'rswETH',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/a53e1522c29a42749fd5e.svg',
});

export const swellSTBTC: TokenIF = registerToken({
    name: 'Lorenzo stBTC',
    address: '0xf6718b2701D4a6498eF77D7c152b2137Ab28b8A3',
    symbol: 'stBTC',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/1bd908177ce4eef8d4a90.svg',
});

export const swellWEETH: TokenIF = registerToken({
    name: 'Wrapped eETH',
    address: '0xA6cB988942610f6731e664379D15fFcfBf282b44',
    symbol: 'weETH',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/2305e6804e5346fb5545e.png',
});

export const swellRSETH: TokenIF = registerToken({
    name: 'KelpDao Restaked ETH',
    address: '0xc3eACf0612346366Db554C991D7858716db09f58',
    symbol: 'rsETH',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/e1522c29a42749fd5ec81.svg',
});

export const swellSWETH: TokenIF = registerToken({
    name: 'swETH',
    address: '0x09341022ea237a4DB1644DE7CCf8FA0e489D85B7',
    symbol: 'swETH',
    decimals: 18,
    chainId: 1923,
    logoURI:
        'https://s3.us-east-2.amazonaws.com/assets.rollbridge.app/971f401121cc90314670c.svg',
});

export const swellUSDE: TokenIF = registerToken({
    name: 'USDe',
    address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
    symbol: 'USDe',
    decimals: 18,
    chainId: 1923,
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29470.png',
});

export const swellSUSDe: TokenIF = registerToken({
    name: 'Staked USDe',
    address: '0x211Cc4DD073734dA055fbF44a2b4667d5E5fE5d2',
    symbol: 'sUSDe',
    decimals: 18,
    chainId: 1923,
    logoURI: 'https://s2.coinmarketcap.com/static/img/coins/64x64/29471.png',
});

export const swellENA: TokenIF = registerToken({
    name: 'Ethena',
    address: '0x58538e6A46E07434d7E7375Bc268D3cb839C0133',
    symbol: 'ENA',
    decimals: 18,
    chainId: 1923,
    logoURI: 'https://mantlescan.xyz/token/images/ethena_32.png',
});

export const plumeNativeETH: TokenIF = registerToken({
    name: 'Native Ether',
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    decimals: 18,
    chainId: 98865,
    logoURI: 'https://ethereum-optimism.github.io/data/ETH/logo.svg',
});

export const plumePETH: TokenIF = registerToken({
    name: 'Plume ETH',
    address: '0xD630fb6A07c9c723cf709d2DaA9B63325d0E0B73',
    symbol: 'pETH',
    decimals: 18,
    chainId: 98865,
    logoURI: '',
});

export const plumeUSDC: TokenIF = registerToken({
    name: 'Bridged USDC',
    address: '0x3938A812c54304fEffD266C7E2E70B48F9475aD6',
    symbol: 'USDC.e',
    decimals: 6,
    chainId: 98865,
    logoURI: '',
});

export const plumeWTT: TokenIF = registerToken({
    name: 'Wolski Test Token',
    address: '0x3211dFB6c2d3F7f15D7568049a86a38fcF1b00D3',
    symbol: 'WTT',
    decimals: 6,
    chainId: 98865,
    logoURI: '',
});

export const plumePUSD: TokenIF = registerToken({
    name: 'Plume USD',
    address: '0xdddD73F5Df1F0DC31373357beAC77545dC5A6f3F',
    symbol: 'pUSD',
    decimals: 6,
    chainId: 98865,
    logoURI: '',
});

export const plumeNRWA: TokenIF = registerToken({
    name: 'Nest RWA Vault',
    address: '0x81537d879ACc8a290a1846635a0cAA908f8ca3a6',
    symbol: 'nRWA',
    decimals: 6,
    chainId: 98865,
    logoURI: '',
});

export const plumeNTBILL: TokenIF = registerToken({
    name: 'Nest Treasuries Vault',
    address: '0xE72Fe64840F4EF80E3Ec73a1c749491b5c938CB9',
    symbol: 'nTBILL',
    decimals: 6,
    chainId: 98865,
    logoURI: '',
});

export const plumeNYIELD: TokenIF = registerToken({
    name: 'Nest Yield Vault',
    address: '0x892DFf5257B39f7afB7803dd7C81E8ECDB6af3E8',
    symbol: 'nYIELD',
    decimals: 6,
    chainId: 98865,
    logoURI: '',
});

export const baseSepoliaUSDT: TokenIF = registerToken({
    name: 'Ambient USDT',
    address: '0x868cFD46ad326354AD214bEA9f08fD8EfBfac3b9',
    symbol: 'USDT',
    decimals: 6,
    chainId: 84532,
    logoURI: '',
});

export const baseSepoliaWTT: TokenIF = registerToken({
    name: 'Wolski Test Token',
    address: '0xfefd8bcb0034a2b0e3cc22e2f5a59279fae67128',
    symbol: 'WTT',
    decimals: 6,
    chainId: 84532,
    logoURI: '',
});
