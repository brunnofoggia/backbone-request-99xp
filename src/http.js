import _ from 'underscore-99xp';
import https from 'https';
import http from 'http';

var exec = function (options, req = null, res = null) {
    if (typeof options.url !== 'string' ||
            // Accept to execute http requests without receiving res object if callbacks are present in options
                    (!res && _.size(_.pick(options, 'then', 'catch')) < 2)) {
        return false;
    }

    var defaults = _.defaults({
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
            'content-type': 'application/json'
        },
        timeout: 18000000
    }, !options.url ? {} : _.parseUrl(options.url));

    var reqOpts = _.defaults2(_.pick(options, 'url', 'method', 'headers', 'data', 'timeout'), defaults);

    // default promise calls
    (typeof options.then !== 'function') && (options.then = (response, data, _req, _res) => {
        _res.status(response.statusCode).send(data);
    });
    (typeof options.finally !== 'function') && (options.finally = () => {
    });
    (typeof options.catch !== 'function') && (options.catch = (response, data, _req, _res) => {
        try {
            if (typeof data !== 'object') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    data = {
                        message: data
                    };
                }
            }

            var status = _.isObject(response) ? response.statusCode || 500 : 500;
            _res.status(status).send(JSON.stringify(data));
        } catch (e) {
            _res.status(500).send(JSON.stringify({
                message: 'Internal Failure'
            }));
        }
    });

    if (!reqOpts.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    }

    if (reqOpts.method !== 'GET' && reqOpts.data) {
        if (_.isJSON(reqOpts.data)) {
            reqOpts.data = JSON.stringify(reqOpts.data);
        }
        reqOpts.headers['Content-Length'] = Buffer.byteLength(reqOpts.data);
    }

    return new Promise(_.partial((_o, resolve, reject) => {

        const httprequest = defineLib(_o);
        const r = httprequest.request(_.omit(_o, 'data'), resp => {
            /*resp.setEncoding('utf8');*/

            resp.on('data', chunk => {
                var data = parseBuffer(Buffer.concat([chunk]).toString());
                if (/^2\d{2}/.test(resp.statusCode.toString())) {
                    options.then(resp, data, req, res, options);
                    resolve();
                } else {
                    options.catch(resp, data, options, {
                        data,
                        status: resp.statusCode,
                        response: resp
                    });
                    reject(data, resp);
                }
            });

            /*resp.on('end', error => {
             _.partial((_req, _res, o, err, xhr) => options.catch(err, _req, _res, xhr), req, res, options)(error, r);
             });*/
        });
        r.on('error', error => {
            var message;
            try {
                message = JSON.parse(error);
            } catch (e) {
                message = error;
            }
            options.catch(r, message, req, res, options);

            reject(message, r);
        });

        r.on('timeout', () => {
            request.abort();
            _.partial((_req, _res, o, err, xhr) => options.catch(err, _req, _res, xhr), req, res, options)('timeout', r);
            reject('timeout');
        });

        if (_o.method !== 'GET' && _o.data) {
            r.write(_o.data);
        }

        r.end();

    }, reqOpts));

};

var defineLib = function (o) {
    if (o.url) {
        if (/https/.test(o.url)) {
            return https;
        }
        return http;
    }
};
var parseBuffer = function (b) {
    try {
        return JSON.parse(b);
    } catch (e) {
        return b;
    }
};

export default {
    exec,
    defineLib,
    parseBuffer
};
