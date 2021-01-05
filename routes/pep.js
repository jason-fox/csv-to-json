const express = require('express');
const router = express.Router();
const debug = require('debug')('server:pep');
const OAuth2 = require('../lib/oauth2').OAuth2;
const config = require('../config');

const idmPort = process.env.IDM_PORT || config.idmPort;
const idmUrl = (process.env.IDM_URL || config.idmUrl) + ':' + idmPort;
const idmIPAddress = (process.env.IDM_IP_ADDRESS || config.idmIPAddress) + ':' + idmPort;
const clientId = process.env.IDM_CLIENT_ID || config.clientId;
const clientSecret = process.env.IDM_CLIENT_SECRET || config.clientSecret;
const callbackURL = process.env.CALLBACK_URL || config.callbackURL;

let authenticateActions = config.authenticateActions;
let permitActions = config.permitActions;

if (process.env.AUTHENTICATE_ACTIONS) {
    authenticateActions = process.env.AUTHENTICATE_ACTIONS.split(',');
}

if (process.env.PERMIT_ACTIONS) {
    permitActions = process.env.PERMIT_ACTIONS.split(',');
}

/* eslint-disable no-unused-vars */

// Creates oauth library object with the config data
const oa = new OAuth2(
    clientId,
    clientSecret,
    idmUrl,
    idmIPAddress,
    '/oauth2/authorize',
    '/oauth2/token',
    callbackURL
);

// If the user exists in the app then permit
function authentication(token) {
    debug('authentication: ' + token);
    const idmUserUrl = idmIPAddress + '/user?access_token=' + token + '&app_id=' + clientId;
    return oa
        .get(idmUserUrl)
        .then((response) => {
            return true;
        })
        .catch((error) => {
            return false;
        });
}

// If the user exists in the app and has rights then permit
function authorization(token, resource) {
    debug('authorization: ' + token + ' ' + resource);
    const idmUserUrl =
        idmIPAddress +
        '/user' +
        '?access_token=' +
        token +
        '&app_id=' +
        clientId +
        '&resource=' +
        resource +
        '&action=GET';
    return oa
        .get(idmUserUrl)
        .then((response) => {
            const user = JSON.parse(response);
            return user.authorization_decision === 'Permit';
        })
        .catch((error) => {
            return false;
        });
}

router.get('/:product/:action', async function (req, res, next) {
    let token = req.headers['x-auth-token'];
    token = req.headers.authorization.replace('Bearer ', '') || token;

    if (permitActions.includes(req.params.action)) {
        return res.status(200).send('permit');
    }
    if (!token) {
        return res.status(401).send('Auth-token not found in request header');
    }

    let allow;
    if (authenticateActions.includes(req.params.action)) {
        allow = await authentication(token);
    } else {
        allow = await authorization(token, req.params.product + '/' + req.params.action);
    }
    return allow ? res.status(200).send('permit') : res.status(403).send('deny');
});

/* eslint-disable consistent-return */
router.post('/login', function (req, res, next) {
    if (!('username' in req.body && 'password' in req.body)) {
        return res.status(403).send('forbidden');
    }
    oa.getOAuthPasswordCredentials(req.body.username, req.body.password)
        .then((results) => {
            console.log(results);
            return res.status(200).send(results.access_token);
        })
        .catch((error) => {
            debug(error);
            return res.status(403).send(error);
        });
});

module.exports = router;
