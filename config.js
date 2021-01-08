const config = {
    mongodb: 'mongodb://localhost:27017/iotagent-csv',
    contextBroker: {
        host: 'orion',
        port: '1026',
        jsonLdContext: 'http://csv-agent:3000/data-models/ngsi-context.jsonld'
    },
    replace: {
        'position(km)': 'position',
        'sensor_timestep_(min)': 'sensor_timestep_min',
        'conductivity_range_(μs/cm)': 'conductivity_range',
        'turbidity_range_(ntu)': 'turbidity_range',
        sensor_symbol: 'id',
        id: 'refDeviceModel'
    },
    ignore: ['NA', 'Not applicable'],
    float: ['x', 'y'],
    integer: ['position'],
    datetime: ['installation_time'],
    relationship: []
};

module.exports = config;
