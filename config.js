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
    },
    replace : {
		'position(km)': 'position',
		'sensor_timestep_(min)': 'sensor_timestep_min',
		'conductivity_range_(μs/cm)': 'conductivity_range',
		'turbidity_range_(ntu)': 'turbidity_range'
	},
	ignore: ['NA', 'Not applicable']
};

module.exports = config;
