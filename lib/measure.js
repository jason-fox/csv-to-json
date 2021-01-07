const got = require('got');
const debug = require('debug')('server:json');
const config = require('../config');

const DEVICE_API_KEY = process.env.DEVICE_API_KEY || config.apiKey;

const IOT_AGENT_URL =
    'http://' +
    (process.env.IOTA_HTTP_HOST || config.http.host) +
    ':' +
    (process.env.IOTA_HTTP_PORT || config.http.port) +
    (process.env.IOTA_DEFAULT_RESOURCE || config.http.resource);

class JSONMeasure {
    constructor(headers) {
        this.headers = headers;
        this.headers['Content-Type'] = 'application/json';
    }

    // measures sent over HTTP are POST requests with params
    sendAsHTTP(deviceId, state, timestamp) {
        const options = {
            searchParams: { k: DEVICE_API_KEY, i: deviceId, t: timestamp },
            json: state,
            responseType: 'json'
        };

        console.error(options);

        return got.post(IOT_AGENT_URL, options);
    }

    // measures sent over MQTT are posted as topics (animal collars, temperature sensor, filling sensor etc.)
    sendAsMQTT(deviceId, state) {
        const topic = '/' + DEVICE_API_KEY + '/' + deviceId + '/attrs';
        MQTT_CLIENT.publish(topic, state);
    }
}

module.exports = JSONMeasure;
