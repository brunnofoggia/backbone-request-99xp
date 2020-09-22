import _ from 'underscore-99xp';
import https from 'https';
import http from 'http';
import AppException from 'app-exception';

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
        throw new AppException(JSON.stringify(data), 0, response.statusCode || 200);
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
            throw new AppException(JSON.stringify(data), 0, status);
        } catch (e) {
            throw AppException.internalServerError(e);
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
                    resolve({resp, data, req, res, options});
                } else {
                    reject({resp, data, options, output: {
                      data,
                      status: resp.statusCode,
                      response: resp
                    }});
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
            reject({resp: r, message, options, output: {
                data: message,
                status: 500,
                response: r
            }});
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

    }, reqOpts)).then((o)=>{
        o.options.then(o.resp, o.data, o.req, o.res, o.options);
    }).catch((o)=>{
        o.options.catch(o.resp, o.data, o.options, o.output);
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
