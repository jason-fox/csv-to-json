const config = {
    idmPort: 3000,
    idmUrl: 'http://localhost',
    idmIPAddress: 'http://127.0.0.1',
    clientId: 'ditaot-dckr-site-0000-xpresswebapp',
    clientSecret: 'ditaot-dkcr-site-0000-clientsecret',
    callbackURL: 'http://localhost:3000/login',
    authenticateActions: ['review'],
    permitActions: ['draft']
};

module.exports = config;
