const express = require('express');
const Router = require('./routes/routes');
const db = require('./lib/dbConn');
const app = express();
const path = require('path');
const Status = require('http-status-codes');

global.__basedir = __dirname;

db.connect();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', Router);
app.use(express.static(path.join(__dirname, 'public')));

// catch 404 and forward to error handler
app.use(function (req, res) {
    res.status(Status.NOT_FOUND);
    res.json();
});

// error handler
app.use(function (err, req, res) {
    console.error(err);
    res.status(err.status || Status.INTERNAL_SERVER_ERROR);
    res.json({ err });
});

module.exports = app;
