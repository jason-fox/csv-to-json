const debug = require('debug')('server:db');
const mongoose = require('mongoose');
const config = require('../config');

const MONGO_DB = process.env.MONGO_URL || config.mongodb;

let defaultDb;

function connectWithRetry() {
    mongoose
        .connect(MONGO_DB, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        })
        .catch((err) => {
            debug('MongoDB connection unsuccessful: ' + JSON.stringify(err));
            debug('retry after 5 seconds.');
            setTimeout(connectWithRetry, 5000);
        });

    defaultDb = mongoose.connection;
    defaultDb.once('open', function () {
        debug('Connection Successful!');
    });
}

function connectDB() {
    connectWithRetry();
}

module.exports = {
    connect: connectDB
};
