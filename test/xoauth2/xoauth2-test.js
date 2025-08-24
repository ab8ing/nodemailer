'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const XOAuth2 = require('../../lib/xoauth2');
const mockServer = require('./server');

describe('XOAuth2 tests', { timeout: 10000 }, () => {
    let server;
    let users = {};
    let XOAUTH_PORT = 8993;

    beforeEach((t, done) => {
        server = mockServer({
            port: XOAUTH_PORT,
            onUpdate: (username, accessToken) => {
                users[username] = accessToken;
            }
        });
        server.addUser('test@example.com', 'saladus');
        server.start(done);
    });

    afterEach((t, done) => {
        server.stop(done);
    });

    it('should get an existing access token', (t, done) => {
        let xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'saladus',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            accessToken: 'abc',
            timeout: 3600
        });

        xoauth2.getToken(false, (err, accessToken) => {
            assert.ok(!err);
            assert.strictEqual(accessToken, 'abc');
            done();
        });
    });

    it('should convert access token to XOAuth2 token', () => {
        let xoauth2 = new XOAuth2({
            user: 'test@example.com',
            accessToken: 'abc'
        });

        assert.strictEqual(xoauth2.buildXOAuth2Token(), 'dXNlcj10ZXN0QGV4YW1wbGUuY29tAWF1dGg9QmVhcmVyIGFiYwEB');
        assert.strictEqual(xoauth2.buildXOAuth2Token('bbb'), 'dXNlcj10ZXN0QGV4YW1wbGUuY29tAWF1dGg9QmVhcmVyIGJiYgEB');
    });

    it('should get an existing access token, no timeout', (t, done) => {
        let xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'saladus',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            accessToken: 'abc'
        });

        xoauth2.getToken(false, (err, accessToken) => {
            assert.ok(!err);
            assert.strictEqual(accessToken, 'abc');
            done();
        });
    });

    it('should generate a fresh access token', (t, done) => {
        let xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'saladus',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            timeout: 3600
        });

        xoauth2.getToken(false, (err, accessToken) => {
            assert.ok(!err);
            assert.strictEqual(accessToken, users['test@example.com']);
            done();
        });
    });

    it('should generate a fresh access token with custom method', (t, done) => {
        let xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'saladus',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            timeout: 3600,
            provisionCallback: (user, renew, cb) => {
                cb(null, 'zzz');
            }
        });

        xoauth2.getToken(false, (err, accessToken) => {
            assert.ok(!err);
            assert.strictEqual(accessToken, 'zzz');
            done();
        });
    });

    it('should fail generating a fresh access token with custom method', (t, done) => {
        let xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'saladus',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            timeout: 3600,
            provisionCallback: (user, renew, cb) => {
                cb(new Error('fail'));
            }
        });

        xoauth2.getToken(false, (err, accessToken) => {
            assert.ok(err);
            assert.ok(!accessToken);
            done();
        });
    });

    it('should generate a fresh access token after timeout', (t, done) => {
        let xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'saladus',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            accessToken: 'abc',
            timeout: 1
        });

        setTimeout(() => {
            xoauth2.getToken(false, (err, accessToken) => {
                assert.ok(!err);
                assert.strictEqual(accessToken, users['test@example.com']);
                done();
            });
        }, 3000);
    });

    it('should emit access token update', (t, done) => {
        let xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'saladus',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            timeout: 3600
        });

        xoauth2.once('token', tokenData => {
            assert.ok(tokenData.expires >= Date.now() + 3000 * 1000);
            assert.deepStrictEqual(tokenData, {
                user: 'test@example.com',
                accessToken: users['test@example.com'],
                expires: tokenData.expires
            });
            done();
        });

        xoauth2.getToken(false, () => {});
    });

    it('should sign payload', () => {
        let xoauth2 = new XOAuth2({
            user: 'test@example.com',
            serviceClient: '{Client ID}',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            timeout: 3600,
            privateKey:
                '-----BEGIN RSA PRIVATE KEY-----\n' +
                'MIIEpAIBAAKCAQEA6Z5Qqhw+oWfhtEiMHE32Ht94mwTBpAfjt3vPpX8M7DMCTwHs\n' +
                '1xcXvQ4lQ3rwreDTOWdoJeEEy7gMxXqH0jw0WfBx+8IIJU69xstOyT7FRFDvA1yT\n' +
                'RXY2yt9K5s6SKken/ebMfmZR+03ND4UFsDzkz0FfgcjrkXmrMF5Eh5UXX/+9YHeU\n' +
                'xlp0gMAt+/SumSmgCaysxZLjLpd4uXz+X+JVxsk1ACg1NoEO7lWJC/3WBP7MIcu2\n' +
                'wVsMd2XegLT0gWYfT1/jsIH64U/mS/SVXC9QhxMl9Yfko2kx1OiYhDxhHs75RJZh\n' +
                'rNRxgfiwgSb50Gw4NAQaDIxr/DJPdLhgnpY6UQIDAQABAoIBAE+tfzWFjJbgJ0ql\n' +
                's6Ozs020Sh4U8TZQuonJ4HhBbNbiTtdDgNObPK1uNadeNtgW5fOeIRdKN6iDjVeN\n' +
                'AuXhQrmqGDYVZ1HSGUfD74sTrZQvRlWPLWtzdhybK6Css41YAyPFo9k4bJ2ZW2b/\n' +
                'p4EEQ8WsNja9oBpttMU6YYUchGxo1gujN8hmfDdXUQx3k5Xwx4KA68dveJ8GasIt\n' +
                'd+0Jd/FVwCyyx8HTiF1FF8QZYQeAXxbXJgLBuCsMQJghlcpBEzWkscBR3Ap1U0Zi\n' +
                '4oat8wrPZGCblaA6rNkRUVbc/+Vw0stnuJ/BLHbPxyBs6w495yBSjBqUWZMvljNz\n' +
                'm9/aK0ECgYEA9oVIVAd0enjSVIyAZNbw11ElidzdtBkeIJdsxqhmXzeIFZbB39Gd\n' +
                'bjtAVclVbq5mLsI1j22ER2rHA4Ygkn6vlLghK3ZMPxZa57oJtmL3oP0RvOjE4zRV\n' +
                'dzKexNGo9gU/x9SQbuyOmuauvAYhXZxeLpv+lEfsZTqqrvPUGeBiEQcCgYEA8poG\n' +
                'WVnykWuTmCe0bMmvYDsWpAEiZnFLDaKcSbz3O7RMGbPy1cypmqSinIYUpURBT/WY\n' +
                'wVPAGtjkuTXtd1Cy58m7PqziB7NNWMcsMGj+lWrTPZ6hCHIBcAImKEPpd+Y9vGJX\n' +
                'oatFJguqAGOz7rigBq6iPfeQOCWpmprNAuah++cCgYB1gcybOT59TnA7mwlsh8Qf\n' +
                'bm+tSllnin2A3Y0dGJJLmsXEPKtHS7x2Gcot2h1d98V/TlWHe5WNEUmx1VJbYgXB\n' +
                'pw8wj2ACxl4ojNYqWPxegaLd4DpRbtW6Tqe9e47FTnU7hIggR6QmFAWAXI+09l8y\n' +
                'amssNShqjE9lu5YDi6BTKwKBgQCuIlKGViLfsKjrYSyHnajNWPxiUhIgGBf4PI0T\n' +
                '/Jg1ea/aDykxv0rKHnw9/5vYGIsM2st/kR7l5mMecg/2Qa145HsLfMptHo1ZOPWF\n' +
                '9gcuttPTegY6aqKPhGthIYX2MwSDMM+X0ri6m0q2JtqjclAjG7yG4CjbtGTt/UlE\n' +
                'WMlSZwKBgQDslGeLUnkW0bsV5EG3AKRUyPKz/6DVNuxaIRRhOeWVKV101claqXAT\n' +
                'wXOpdKrvkjZbT4AzcNrlGtRl3l7dEVXTu+dN7/ZieJRu7zaStlAQZkIyP9O3DdQ3\n' +
                'rIcetQpfrJ1cAqz6Ng0pD0mh77vQ13WG1BBmDFa2A9BuzLoBituf4g==\n' +
                '-----END RSA PRIVATE KEY-----'
        });
        assert.strictEqual(
            xoauth2.jwtSignRS256({
                some: 'payload'
            }),
            'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzb21lIjoicGF5bG9hZCJ9.yBo28P5qE8t8yMkN0hC6uWstUAGh8RGW-zLe1NHdtit8ZVlAEdnhXbZvjGEfDWjOeWe1aZ2eZ65i83awWsx02G9HDsI1xMOFTHpviSHLIWnOf1D2hqJxm0On9zYRjd6oFxuRlmJtI9PIDlMJltG7K3leqReLLC6ZOAYL1Au0WY5swdG2eA6Oi83BTEckLj9c-0TYYRYtyRSG9o298Iuc8JL2KhrAbM8d62JgAPuI3hN_NgEtxs36bidt3SHbuWSszAdt1lHR-bFCZ-kXy_DAGlGiYRHRNyvsLR_q_v4GhV2oVi3WSPR816UhHrTryA0NlbanACb8T22bJGRQ708m_g'
        );
    });

    it('should handle concurrent token requests', async () => {
        const xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'saladus',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            timeout: 1
        });

        // First call to expire the token
        await new Promise(resolve => xoauth2.getToken(false, resolve));

        // Multiple simultaneous calls after expiration
        const results = await Promise.all(
            Array.from(
                { length: 1000 },
                () =>
                    new Promise((resolve, reject) => {
                        xoauth2.getToken(false, (err, accessToken) => {
                            if (err) reject(err);
                            else resolve(accessToken);
                        });
                    })
            )
        );

        // They must all return the same valid token
        results.forEach(accessToken => {
            assert.ok(accessToken);
            assert.strictEqual(accessToken, users['test@example.com']);
        });
    });

    it('should propagate renewal errors to all concurrent requests', async () => {
        const xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'invalid',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            timeout: 1
        });

        // All calls should fail with the same error
        const promises = Array.from(
            { length: 1000 },
            () =>
                new Promise((resolve, reject) => {
                    xoauth2.getToken(true, (err, accessToken) => {
                        if (err) reject(err);
                        else resolve(accessToken);
                    });
                })
        );

        await assert.rejects(() => Promise.all(promises));
    });

    it('should handle sequential token requests with varying tokens', async () => {
        const xoauth2 = new XOAuth2({
            user: 'test@example.com',
            clientId: '{Client ID}',
            clientSecret: '{Client Secret}',
            refreshToken: 'saladus',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/',
            timeout: 1
        });

        const tokens = new Set();

        await [...Array(500).keys()].reduce(async prev => {
            await prev;
            const token = await new Promise((resolve, reject) => {
                xoauth2.getToken(true, (err, token) => {
                    if (err) reject(err);
                    else resolve(token);
                });
            });
            tokens.add(token);
        }, Promise.resolve());

        assert.strictEqual(tokens.size, 500);
    });

    it('should reuse existing token when no refresh mechanism is available', async () => {
        const xoauth2 = new XOAuth2({
            user: 'test@example.com',
            accessToken: 'existing_valid_token_123',
            expires: Date.now() + 3600000 // 1 hour from now
            // Note: No refreshToken, no provisionCallback, no serviceClient
        });

        // Mock logger to capture debug messages
        const debugLogs = [];
        xoauth2.logger.debug = (data, message, user) => {
            if (data.action === 'reuse') {
                debugLogs.push({ data, message, user });
            }
        };

        // Should reuse existing token even with renew=true
        const token = await new Promise((resolve, reject) => {
            xoauth2.getToken(true, (err, token) => {
                if (err) reject(err);
                else resolve(token);
            });
        });

        assert.strictEqual(token, 'existing_valid_token_123');
        assert.strictEqual(debugLogs.length, 1);
        assert.strictEqual(debugLogs[0].data.action, 'reuse');
        assert.strictEqual(debugLogs[0].user, 'test@example.com');
    });

    it('should return error when no token exists and no refresh mechanism', async () => {
        const xoauth2 = new XOAuth2({
            user: 'test@example.com'
            // Note: No accessToken, no refreshToken, no provisionCallback, no serviceClient
        });

        // Mock logger to capture error messages
        const errorLogs = [];
        xoauth2.logger.error = (data, message, user) => {
            if (data.action === 'renew') {
                errorLogs.push({ data, message, user });
            }
        };

        await assert.rejects(async () => {
            await new Promise((resolve, reject) => {
                xoauth2.getToken(true, (err, token) => {
                    if (err) reject(err);
                    else resolve(token);
                });
            });
        }, /Can't create new access token for user/);

        assert.strictEqual(errorLogs.length, 1);
        assert.strictEqual(errorLogs[0].data.action, 'renew');
        assert.strictEqual(errorLogs[0].user, 'test@example.com');
    });

    it('should attempt renewal when refresh mechanism is available', async () => {
        const xoauth2 = new XOAuth2({
            user: 'test@example.com',
            refreshToken: 'valid_refresh_token',
            clientId: 'test_client_id',
            clientSecret: 'test_client_secret',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/'
        });

        // Mock generateToken to track if it was called
        let generateTokenCalled = false;
        xoauth2.generateToken = callback => {
            generateTokenCalled = true;
            // Simulate successful token generation
            xoauth2.updateToken('new_generated_token', 3600);
            callback(null, 'new_generated_token');
        };

        const token = await new Promise((resolve, reject) => {
            xoauth2.getToken(true, (err, token) => {
                if (err) reject(err);
                else resolve(token);
            });
        });

        assert.strictEqual(token, 'new_generated_token');
        assert.strictEqual(generateTokenCalled, true);
    });

    it('should use provisionCallback when available instead of refresh', async () => {
        let provisionCallbackCalled = false;

        const xoauth2 = new XOAuth2({
            user: 'test@example.com',
            provisionCallback: (user, renew, cb) => {
                provisionCallbackCalled = true;
                cb(null, 'provisioned_token', 3600);
            }
        });

        const token = await new Promise((resolve, reject) => {
            xoauth2.getToken(true, (err, token) => {
                if (err) reject(err);
                else resolve(token);
            });
        });

        assert.strictEqual(token, 'provisioned_token');
        assert.strictEqual(provisionCallbackCalled, true);
    });

    it('should use serviceClient when available for token generation', async () => {
        const xoauth2 = new XOAuth2({
            user: 'test@example.com',
            serviceClient: 'test_service_client',
            privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
            accessUrl: 'http://localhost:' + XOAUTH_PORT + '/'
        });

        // Mock generateToken to track if it was called
        let generateTokenCalled = false;
        xoauth2.generateToken = callback => {
            generateTokenCalled = true;
            // Simulate successful token generation
            xoauth2.updateToken('service_token', 3600);
            callback(null, 'service_token');
        };

        const token = await new Promise((resolve, reject) => {
            xoauth2.getToken(true, (err, token) => {
                if (err) reject(err);
                else resolve(token);
            });
        });

        assert.strictEqual(token, 'service_token');
        assert.strictEqual(generateTokenCalled, true);
    });
});
