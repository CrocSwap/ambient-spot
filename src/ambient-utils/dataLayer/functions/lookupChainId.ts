// fn to translate all possible chain identifiers to a canonical ID
// overload is necessary so compiler will know what return type to expect

// fn signature to return type 'string'
export function lookupChainId(
    rawInput: string | number,
    returnAs: 'string',
): string | undefined;

// fn signature to return type 'number'
export function lookupChainId(
    rawInput: string | number,
    returnAs: 'number',
): number | undefined;

// fn definition
export function lookupChainId(
    rawInput: string | number,
    returnAs: 'string' | 'number',
): string | number | undefined {
    // change input to a string if provided as a number
    const inputAsString: string =
        typeof rawInput === 'string' ? rawInput : '0x' + rawInput.toString(16);
    // trim string and set to lower case
    const fixedInput: string = inputAsString.trim().toLowerCase();
    // logic router to find a canonic 0x hex string for input
    // can be `undefined` if no mapping is located
    let chainIdHex: string | undefined;
    switch (fixedInput) {
        case 'ethereum':
        case 'mainnet':
        case '1':
        case '0x1':
            chainIdHex = '0x1';
            break;
        case 'scroll':
        case '534352':
        case '0x82750':
            chainIdHex = '0x82750';
            break;
        case 'plume':
        case '98866':
        case '0x18232':
            chainIdHex = '0x18232';
            break;
        case 'plumelegacy':
        case '98865':
        case '0x18231':
            chainIdHex = '0x18231';
            break;
        case 'blast':
        case '81457':
        case '0x13e31':
            chainIdHex = '0x13e31';
            break;
        case 'sepolia':
        case '11155111':
        case '0xaa36a7':
            chainIdHex = '0xaa36a7';
            break;
        case 'blastsepolia':
        case '168587773':
        case '0xa0c71fd':
            chainIdHex = '0xa0c71fd';
            break;
        case 'scrollsepolia':
        case '534351':
        case '0x8274f':
            chainIdHex = '0x8274f';
            break;
        case 'basesepolia':
        case '84532':
        case '0x14a34':
            chainIdHex = '0x14a34';
            break;
        case 'monadtestnet':
        case '10143':
        case '0x279f':
            chainIdHex = '0x279f';
            break;
    }
    // output variable
    let output: string | number | undefined;
    // transform output to specified type
    if (chainIdHex && returnAs === 'number') {
        output = parseInt(chainIdHex);
    } else {
        output = chainIdHex;
    }
    // return output
    return output;
}
