const createError = require('http-errors');
const express = require('express');
const bodyParser = require('body-parser');
const PEPRouter = require('./routes/pep');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use('/', PEPRouter);

if (!(process.env.IDM_URL && process.env.IDM_IP_ADDRESS)) {
    const IDMRouter = require('./routes/idm');
    app.use('/', IDMRouter);
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
