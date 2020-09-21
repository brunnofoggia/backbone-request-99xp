import _ from 'underscore-99xp';
import AppException from 'app-exception';

var exec = function(options, req = null, res = null) {
    if (typeof options.url !== 'string' ||
        // Accept to execute http requests without receiving res object if callbacks are present in options
        (!res && _.size(_.pick(options, 'then', 'catch')) < 2)) {
        return false;
    }

    var reqOpts = _.defaults(_.pick(options, 'url', 'method', 'headers', 'data'), {
        method: 'GET',
        headers: {}
    });

    // default promise calls
    (typeof options.then !== 'function') && (options.then = (response, _req, _res) => {
        throw new AppException(JSON.stringify(response.data), 0, response.status || 200);
    });
    (typeof options.finally !== 'function') && (options.finally = () => {});
    (typeof options.catch !== 'function') && (options.catch = (error, _req, _res) => {
        try {
            var data = error.response.data;
            if (typeof data !== 'object') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    data = {
                        message: data
                    };
                }
            }

            throw new AppException(JSON.stringify(data), 0, error?.response?.status || 500);
        } catch (e) {
            throw AppException.internalServerError(e);
        }
    });

    // Axios call
    return axios(reqOpts)
        .then(_.partial((_req, _res, o, r) => options.then(r, _req, _res), req, res, options))
        .catch(_.partial((_req, _res, o, err) => options.catch(err, _req, _res), req, res, options))
        .finally(_.partial((_req, _res, o) => options.finally(_req, _res), req, res, options));
};

export default {exec};
