const createError = require('http-errors');
const express = require('express');
const Router = require('./routes/routes');
const db = require('./lib/dbConn');
const app = express();
const path = require('path');

global.__basedir = __dirname;

db.connect();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/', Router);
app.use(express.static(path.join(__dirname, 'public')));

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
