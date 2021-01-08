const got = require('got');
const config = require('../config');

const CONTEXT_BROKER_URL =
    'http://' +
    (process.env.IOTA_HTTP_HOST || config.contextBroker.host) +
    ':' +
    (process.env.IOTA_HTTP_PORT || config.contextBroker.port);

const LINKED_DATA = process.env.IOTA_JSON_LD_CONTEXT || config.contextBroker.jsonLdContext;

class JSONMeasure {
    constructor(headers) {
        this.headers = headers;
        this.headers['Content-Type'] = 'application/json';
    }

    // measures sent over HTTP are POST requests with params
    sendAsHTTP(state) {
        const url = CONTEXT_BROKER_URL + '/ngsi-ld/v1/entityOperations/upsert';
        const headers = {
            'Content-Type': 'application/json',
            Link: '<' + LINKED_DATA + '>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"'
        };

        const options = {
            headers,
            searchParams: { options: 'update' },
            json: state,
            responseType: 'json'
        };
        return got.post(url, options);
    }
}

module.exports = JSONMeasure;
