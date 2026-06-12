// TODO:  Currently this function has logic to make two query URLs, a primary
// TODO:  ... and a backup. The app is not configured to make use of this
// TODO:  ... failsafe, so the code is modified to return only the primary
// TODO:  ... URL to query. Later we should refactor the app to accept two
// TODO:  ... an array of URL strings for all fetch() requests and query the
// TODO:  ... secondary if querying the primary fails.  This file will need
// TODO:  ... be modified to output the full output value instead of the first
// TODO:  ... value only, and be given a return type of string[]

// this function takes an input URI and transforms it to a queryable URL
// the URI must follow https, http, ipfs, or ipns standard

export function uriToHttp(uri: string): string;
export function uriToHttp(uri: string, retry: 'retry'): string[];

export function uriToHttp(uri: string, retry?: string): string | string[] {
    // declare a variable to hold the value to return
    // will be an array with one or two strings
    const outputURLs: string[] = [];

    try {
        // make basic fixes to input for processing
        const fixedURI: string = uri.trim().toLowerCase();

        // special-case URIs which should not be processed by this function
        // any URIs in this array will be returned as-is
        const excludedURIs: string[] = [
            '/ambient-token-list.json',
            '/broken-list.json',
            '/testnet-token-list.json',
        ];

        // if URI is in the excluded array, return it and terminate the function
        if (excludedURIs.includes(fixedURI)) return [fixedURI];

        // get the prefix of the URI
        const protocol: string = fixedURI.split(':')[0];

        // base URLs for IPFS queries
        const ipfsBases: string[] = [
            'https://cloudflare-ipfs.com/ipfs/',
            'https://ipfs.io/ipfs/',
        ];

        // base URLs for IPNS queries
        const ipnsBases: string[] = [
            'https://cloudflare-ipfs.com/ipns/',
            'https://ipfs.io/ipns/',
        ];

        // fn to isolate hash from a IPFS or IPNS URI
        const makeHash = (rawURI: string): string => rawURI.substring(7);

        // execute differential actions based on the protocol URI prefix
        switch (protocol) {
            // handle https URIs
            case 'https':
                // uri is acceptable in its unaltered form
                outputURLs.push(uri);
                break;
            // handle http URIs
            case 'http':
                // create an https version of the URI
                outputURLs.push('https' + uri.slice(4));
                // create a backup URI using the unaltered http form
                outputURLs.push(uri);
                break;
            // handle ipfs URIs
            case 'ipfs':
                ipfsBases.forEach((base: string) =>
                    outputURLs.push(base + makeHash(uri)),
                );
                break;
            // handle ipns URIs
            case 'ipns':
                ipnsBases.forEach((base: string) =>
                    outputURLs.push(base + makeHash(uri)),
                );
                break;
            default:
                outputURLs.push('');
                break;
        }
    } catch (err) {
        console.warn(err);
    }
    return retry ? outputURLs : outputURLs[0];
}
