const got = require('got');
const config = require('../config');

const CONTEXT_BROKER_URL =
    'http://' +
    (process.env.IOTA_HTTP_HOST || config.contextBroker.host) +
    ':' +
    (process.env.IOTA_HTTP_PORT || config.contextBroker.port);

const LINKED_DATA = process.env.IOTA_JSON_LD_CONTEXT || config.contextBroker.jsonLdContext;

// measures sent over HTTP are POST requests with params
async function sendAsHTTP(state) {
    const url = CONTEXT_BROKER_URL + '/ngsi-ld/v1/entityOperations/upsert';
    const headers = {
        'Content-Type': 'application/json',
        Link: '<' + LINKED_DATA + '>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
    };
    const options = {
        headers,
        searchParams: { options: 'update' },
        json: Array.isArray(state)? state : [state],
        responseType: 'json',
        /*timeout: {
            lookup: 100,
            connect: 50,
            secureConnect: 50,
            socket: 1000,
            send: 10000,
            response: 10000
        }*/
    };
    const response = await got.post(url, options);
    console.log(response.statusCode)
    console.log(response.body)
    return response;
}

module.exports = {
    sendAsHTTP
};
