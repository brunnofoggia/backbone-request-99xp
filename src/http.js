// current version commented

import _ from 'underscore-99xp';
import https from 'https';
import http from 'http';
import ExceptionResponse from 'app-exception/src/Response';

var exec = async function (options, req = null, res = null) {
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

    // default promise calls
    (typeof options.then !== 'function') && (options.then = async (response, data, _req, _res) => {
        if(_res) {
            return !_res._headerSent && _res.status(response.statusCode || 200).send(data);
        }
        throw new ExceptionResponse(JSON.stringify(data), 0, response.statusCode || 200);
    });
    (typeof options.finally !== 'function') && (options.finally = async () => {
    });
    (typeof options.catch !== 'function') && (options.catch = async (response, data, _req, _res) => {
        try {
            if (typeof data !== 'object') {
                try {
                    data = _.isString(data) ? JSON.parse(data) : data;
                } catch (e) {
                    data = {
                        message: data
                    };
                }
            }

            var status = _.isObject(response) ? response.statusCode || 500 : 500;
            if(_res) {
                return !_res._headerSent && _res.status(status).send(data);
            }
            throw new ExceptionResponse(JSON.stringify(data), 0, status);
        } catch (e) {
            if(_res) {
                return !_res._headerSent && _res.status(_.isObject(e) ? e.statusCode || 500 : 500).send(e);
            }
            throw new ExceptionResponse(e, 0, _.isObject(e) ? e.statusCode || 500 : 500);
        }
    });

    var reqOpts = _.defaults2(_.pick(options,
        'url', 'method', 'headers', 'data', 'timeout', 'secureProtocol', 'minVersion', 'maxVersion', 'then', 'catch'),
    defaults);

    if (!reqOpts.rejectUnauthorized) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    }

    if (reqOpts.method !== 'GET' && reqOpts.data) {
        if (_.isJSON(reqOpts.data)) {
            reqOpts.data = JSON.stringify(reqOpts.data);
        }
        reqOpts.headers['Content-Length'] = Buffer.byteLength(reqOpts.data);
    }

    return new Promise(_.partial(async (_o, resolve, reject) => {
        const httprequest = defineLib(_o);

        const r = httprequest.request(_.omit(_o, 'data'), async (resp) => {
            let chunks = [];
            resp.setEncoding('utf8');
            resp.on('data', chunk => { chunks.push(chunk);
            });

            /*resp.setEncoding('utf8');*/

            resp.on('end', async () => {
                try {
                    var rawData = (chunks[0] instanceof Buffer) || (chunks[0] instanceof Uint8Array) ? Buffer.concat(chunks) : chunks.join('');
                    var data = rawData ? JSON.parse(rawData) : '';
                    if(resp.statusCode<400) {
                        resolve({resp, data, req, res, options: _o});
                    } else {
                        reject({resp, data, req, res, options: _o});
                    }
                } catch (e) {
                    reject({resp, options: _o, data: {
                        data: e.message,
                        status: 500
                    }, req, res});
                }
            });
        });
        r.on('error', error => {
            var message;
            try {
                message = JSON.parse(error);
            } catch (e) {
                message = error;
            }
            reject({resp: r, data: message, options: _o, req, res});
            // output: {
            //     data: message,
            //     status: 500,
            //     response: r
            // }
        });

        r.on('timeout', () => {
            request.abort();
            _.partial((_req, _res, o, err, xhr) => _o.catch(err, _req, _res, xhr), req, res, _o)('timeout', r);
            reject('timeout');
        });

        if (_o.method !== 'GET' && _o.data) {
            r.write(_o.data);
        }

        r.end();

    }, reqOpts)).then(async (o)=>{
        o.options.then(o.resp, o.data, o.req, o.res, o.options);
    }).catch(async (o)=>{
        o.options.catch(o.resp, o.data, o.req, o.res, o.options);
    });

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
