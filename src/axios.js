import _ from 'underscore-99xp';

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
        _res.status(response.status).send(response.data);
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

            _res.status(error.response.status).send(JSON.stringify(data));
        } catch (e) {
            _res.status(500).send(JSON.stringify({
                message: 'Internal Failure'
            }));
        }
    });

    // Axios call
    return axios(reqOpts)
        .then(_.partial((_req, _res, o, r) => options.then(r, _req, _res), req, res, options))
        .catch(_.partial((_req, _res, o, err) => options.catch(err, _req, _res), req, res, options))
        .finally(_.partial((_req, _res, o) => options.finally(_req, _res), req, res, options));
};

export default {exec};
