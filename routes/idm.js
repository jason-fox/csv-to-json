const express = require('express');
const router = express.Router();
const debug = require('debug')('server:idm');
const CryptoJS = require('crypto-js');
const config = require('../config');

const clientId = process.env.IDM_CLIENT_ID || config.clientId;

const passwords = {
    alice: 'auth',
    bob: 'bobspassword',
    charlie: 'test',
    eve: 'secret'
};

const users = {
    eec3954b328ad6f73d33efcb93a96e67: {
        user: 'alice',
        displayName: 'Alice',
        email: 'alice@example.com'
    },
    '627fa25c7972302db34a7caaa35aa33b': {
        user: 'bob',
        displayName: 'Bob',
        email: 'bob@example.com'
    },
    '7993341a1f9f850ee8988bac2df3af7d': {
        user: 'charlie',
        displayName: 'Charlie',
        email: 'charlie@example.com'
    },
    '2c12606b1d356f4e51429957a4defc4f': {
        user: 'eve',
        displayName: 'Eve',
        email: 'eve@example.com'
    }
};

const privilegedUsers = ['alice', 'bob'];

debug('Using Dummy IDM');

router.post('/oauth2/token', function (req, res) {
    debug('token: ' + JSON.stringify(req.body));
    if (passwords[req.body.username] !== req.body.password) {
        return res.status(403).send('forbidden');
    }
    const token = CryptoJS.MD5(JSON.stringify(req.body)).toString();
    return res.json({ access_token: token });
});

router.get('/user', function (req, res) {
    debug('user: ' + JSON.stringify(req.query));
    const user = users[req.query.access_token];
    if (!user) {
        return res.status(404).send('not found');
    }
    if (req.query.app_id !== clientId) {
        return res.status(404).send('not found');
    }

    if (req.query.resource) {
        user.authorization_decision = 'Deny';
        if (req.query.resource.endsWith('final') || req.query.resource.endsWith('none')) {
            if (privilegedUsers.includes(user.user)) {
                user.authorization_decision = 'Permit';
            }
        }
    }
    return res.status(200).json(user);
});

module.exports = router;
