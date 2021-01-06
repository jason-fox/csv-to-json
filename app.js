const createError = require('http-errors');
const express = require('express');
const Router = require('./routes/routes');
const config = require('./config');
const mqtt = require('mqtt');
const app = express();
const DEVICE_TRANSPORT = process.env.TRANSPORT || config.transport;

global.__basedir = __dirname;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', Router);

if (DEVICE_TRANSPORT === 'MQTT') {
    const mqttBrokerUrl = process.env.MQTT_BROKER_URL || config.mqtt.url;
    global.MQTT_CLIENT = mqtt.connect(mqttBrokerUrl);
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.send();
});

module.exports = app;
