const config = {
    apiKey: 1234,
    transport: 'HTTP',
    mqtt: {
        url: 'mqtt://mosquitto'
    },
    http: {
        host: 'localhost',
        port: 7896,
        resource: '/iot/json'
    }
};

module.exports = config;
