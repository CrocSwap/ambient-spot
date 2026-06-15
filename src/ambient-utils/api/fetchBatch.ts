/* eslint-disable camelcase */
/* eslint-disable @typescript-eslint/no-explicit-any  */
import {
    ANALYTICS_URL,
    BATCH_ENS_CACHE_EXPIRY,
    BATCH_SIZE,
} from '../constants';
import {
    FetchBatchOptions,
    RequestData,
    RequestKeys,
    RequestResponseMap,
} from '../types';
import { fetchTimeout } from './fetchTimeout';

class AnalyticsBatchRequestManager {
    static pendingRequests: Record<
        string,
        RequestData<keyof RequestResponseMap>
    > = {};
    static sendFrequency = 1000;
    static sentBatches = 0;
    static parsedBatches = 0;
    static intervalHandle: ReturnType<typeof setInterval> | null = null;
    static BATCH_ANALYTICS_URL =
        ANALYTICS_URL +
        new URLSearchParams({
            service: 'run',
            config_path: 'batch_requests',
            include_data: '0',
        });

    static async sendBatch(): Promise<void> {
        const requests = AnalyticsBatchRequestManager.pendingRequests;
        const sendableNonce: string[] = [];

        for (const nonce in requests) {
            const request = requests[nonce];
            if (
                !request.timestamp ||
                Date.now() - request.timestamp > request.expiry
            ) {
                sendableNonce.push(nonce);
                // Send requests in batches of BATCH_SIZE
                if (sendableNonce.length >= BATCH_SIZE) {
                    return await AnalyticsBatchRequestManager.send(
                        sendableNonce,
                    );
                }
            }
        }

        // Send any remaining requests
        if (sendableNonce.length > 0) {
            return await AnalyticsBatchRequestManager.send(sendableNonce);
        }
    }

    static async send(nonces: string[]): Promise<void> {
        const queryObject = {
            service: 'run',
            config_path: 'batch_requests',
            include_data: '0',
            data: {
                req: nonces.map((nonce) => {
                    const request =
                        AnalyticsBatchRequestManager.pendingRequests[nonce];
                    return {
                        config_path: request.body['config_path'],
                        req_id: nonce,
                        args: request.body,
                    };
                }),
            },
        };

        const requests = AnalyticsBatchRequestManager.pendingRequests;

        try {
            AnalyticsBatchRequestManager.sentBatches += 1;

            const isPriceQuery =
                queryObject.data.req[0].config_path === 'price';
            const response = await fetchTimeout(
                AnalyticsBatchRequestManager.BATCH_ANALYTICS_URL,
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(queryObject),
                },
                AnalyticsBatchRequestManager.sendFrequency +
                    (isPriceQuery ? 2200 : 4500),
            );

            if (!response.ok) {
                throw new Error(
                    `Error: ${response.status}: ${response.statusText}`,
                );
            }

            const jsonResponse = await response.json();
            const innerResponse = jsonResponse.value.data;

            innerResponse.forEach((resp: any) => {
                const req = requests[resp.req_id];
                if (req && req.resolve) {
                    req.timestamp = Date.now(); // Updating timestamp
                    req.resolve(resp.results); // Resolving with the response
                    req.response = resp.results;
                    req.retryCount = 0; // Reset retry count on success
                }
            });

            AnalyticsBatchRequestManager.parsedBatches += 1;
        } catch (error) {
            console.error('Request failed for:', nonces);

            nonces.forEach((nonce) => {
                const req = requests[nonce];
                if (req) {
                    req.retryCount = (req.retryCount || 0) + 1;

                    if (req.retryCount >= 2) {
                        console.error(
                            `Request ${nonce} failed 2 times, removing from queue.`,
                        );
                        if (req.reject) {
                            req.reject(error); // Rejecting after 3 failures
                        }
                        delete requests[nonce]; // Stop retrying
                    } else {
                        req.timestamp = Date.now(); // Update timestamp for retry
                        req.expiry = 0; // Mark as expired
                    }
                }
            });
        }
    }

    static startManagingRequests(): void {
        AnalyticsBatchRequestManager.intervalHandle = setInterval(async () => {
            await AnalyticsBatchRequestManager.sendBatch();
            AnalyticsBatchRequestManager.clean();
        }, AnalyticsBatchRequestManager.sendFrequency);
    }

    static stopManagingRequests(): void {
        if (AnalyticsBatchRequestManager.intervalHandle != null) {
            clearInterval(AnalyticsBatchRequestManager.intervalHandle);
            AnalyticsBatchRequestManager.intervalHandle = null;
        }
    }

    static clean(): void {
        const requests = AnalyticsBatchRequestManager.pendingRequests;

        Object.keys(requests).forEach((nonce) => {
            const request = requests[nonce];
            if (
                request.timestamp &&
                Date.now() - request.timestamp > request.expiry
            ) {
                if (request.reject) {
                    request.reject(new Error(`Request ${nonce} expired`));
                }
                delete requests[nonce];
            }
        });
    }

    static async register<K extends RequestKeys>(
        body: RequestResponseMap[K]['request'],
        { nonce, expiry }: { nonce: string; expiry: number },
    ): Promise<RequestResponseMap[K]['response']> {
        if (!AnalyticsBatchRequestManager.pendingRequests[nonce]) {
            AnalyticsBatchRequestManager.pendingRequests[nonce] = {
                body,
                timestamp: null, // This should get updated with each send()
                promise: null, // This will hold the promise itself
                resolve: null, // Store the resolve function
                reject: null, // Store the reject function
                response: null, // Store the response
                expiry: expiry, // Default expiry in BATCH_ENS_CACHE_EXPIRY ms
                retryCount: null, // Default expiry in BATCH_ENS_CACHE_EXPIRY ms
            };
            AnalyticsBatchRequestManager.pendingRequests[nonce].promise =
                new Promise((resolve, reject) => {
                    AnalyticsBatchRequestManager.pendingRequests[
                        nonce
                    ].resolve = resolve;
                    AnalyticsBatchRequestManager.pendingRequests[nonce].reject =
                        reject;
                });
            if (AnalyticsBatchRequestManager.intervalHandle == null) {
                AnalyticsBatchRequestManager.startManagingRequests();
            }
        }
        return AnalyticsBatchRequestManager.pendingRequests[nonce]
            .promise as Promise<RequestResponseMap[K]['response']>;
    }
}

function simpleHash(json: { [key: string]: any }): string {
    const str = JSON.stringify(json);
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return 'hash_' + Math.abs(hash).toString(16);
}

export async function cleanupBatchManager() {
    AnalyticsBatchRequestManager.stopManagingRequests();
}

export async function fetchBatch<K extends keyof RequestResponseMap>(
    requestBody: RequestResponseMap[K]['request'],
    options?: FetchBatchOptions,
): Promise<RequestResponseMap[K]['response']> {
    const nonce = options?.nonce || simpleHash(requestBody);
    const expiry = options?.expiry || BATCH_ENS_CACHE_EXPIRY;
    const request = AnalyticsBatchRequestManager.pendingRequests[nonce];
    let promise;
    if (
        request &&
        request.timestamp &&
        Date.now() - request.timestamp <= request.expiry
    ) {
        promise = request.promise as Promise<RequestResponseMap[K]['response']>;
    } else {
        promise = AnalyticsBatchRequestManager.register<K>(requestBody, {
            nonce,
            expiry,
        });
    }

    const timeoutPromise: Promise<any> = new Promise((_, reject) => {
        setTimeout(() => {
            reject(new Error('Request timed out'));
        }, 10000);
    });

    return await Promise.race([promise, timeoutPromise]);
}
// TODO - move to a test in ambient-utils
export async function testBatchSystem() {
    // Combined request and expected response data
    const testData = [
        {
            request: {
                config_path: 'ens_address',
                address: '0xE09de95d2A8A73aA4bFa6f118Cd1dcb3c64910Dc',
            },
            expected: { ens_address: 'benwolski.eth' },
        },
        {
            request: {
                config_path: 'ens_address',
                address: '0x262b58f94055B13f986722498597a43CA9f3BA6D',
            },
            expected: { ens_address: 'wuyansong.eth' },
        },
        {
            request: {
                config_path: 'ens_address',
                address: '0xD94F51053b9817bc2de4DBbaC647D9a784C24406',
            },
            expected: { ens_address: null },
        },
    ];

    const promises = testData.map((data) =>
        fetchBatch<'ens_address'>({
            config_path: 'ens_address',
            address: data.request.address,
        }),
    );

    Promise.all(promises).then((results) => {
        let matches = 0;
        results.forEach((result, index) => {
            if (
                JSON.stringify(result) ===
                JSON.stringify(testData[index].expected.ens_address)
            )
                matches = matches + 1;
            console.assert(
                JSON.stringify(result) ===
                    JSON.stringify(testData[index].expected.ens_address),
                `Test failed for request ${
                    index + 1
                }: Expected ${JSON.stringify(
                    testData[index].expected.ens_address,
                )}, got ${JSON.stringify(result)}`,
            );
        });
        if (matches == testData.length) console.log('All tests passed!');
        else console.error('Could not verify batch requests');
    });
    //
}

let testCount = 0;
export async function useBatchSystemIrresponsibly() {
    if (testCount != 0) return;

    AnalyticsBatchRequestManager.sendFrequency = 10000; // We allow batches every 10 seconds. This is a LITTLE slow. It can be changed dynamically anytime.
    // Meaning, if the network gets congested, this number can be randomly set, and it will govern all batch network behavior -- period.
    console.log('useBatchSystemIrresponsibly running... ');
    testCount = 1;
    const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

    // Simulate a situation where we send 40 record queries
    await testBatchSystem();
    // A simple one off test in the mix

    console.assert(
        Object.keys(AnalyticsBatchRequestManager.pendingRequests).length === 3,
        'Assertion failed: pendingRequests.length should be 3',
    );
    await sleep(3000);
    console.assert(
        Object.keys(AnalyticsBatchRequestManager.pendingRequests).length === 3,
        'Assertion failed post 3k sleep: pendingRequests.length should be 3',
    );
    await sleep(11000);
    console.assert(
        AnalyticsBatchRequestManager.sentBatches === 1,
        'Assertion failed: sentBatches should be 1',
    );
    console.assert(
        AnalyticsBatchRequestManager.parsedBatches === 1,
        'Assertion failed: parsedBatches should be 0',
    );
    console.assert(
        Object.keys(AnalyticsBatchRequestManager.pendingRequests).length === 0,
        'Assertion failed post processing: pendingRequests.length should be 0',
    );

    for (let i = 0; i < 8; i++) {
        testBatchSystem();
    }
    console.log('All tests of tests passed!!');

    await sleep(11000);
    console.assert(
        AnalyticsBatchRequestManager.sentBatches === 2,
        'Assertion failed: sentBatches should be 1',
    );
    console.assert(
        AnalyticsBatchRequestManager.parsedBatches === 2,
        'Assertion failed: parsedBatches should be 0',
    );
    console.assert(
        Object.keys(AnalyticsBatchRequestManager.pendingRequests).length === 0,
        'Assertion failed post processing: pendingRequests.length should be 0',
    );
}
