import Backbone from 'backbone';
import _ from 'underscore-99xp';
import https from 'https';
import http$1 from 'http';

var exec = function (options, req = null, res = null) {
  if (typeof options.url !== 'string' || // Accept to execute http requests without receiving res object if callbacks are present in options
  !res && _.size(_.pick(options, 'then', 'catch')) < 2) {
    return false;
  }

  var reqOpts = _.defaults(_.pick(options, 'url', 'method', 'headers', 'data', 'timeout'), {
    method: 'GET',
    rejectUnauthorized: false,
    headers: {},
    timeout: 18000000
  }, !options.url ? {} : _.parseUrl(options.url)); // default promise calls


  typeof options.then !== 'function' && (options.then = (response, data, _req, _res) => {
    _res.status(response.statusCode).send(data);
  });
  typeof options.finally !== 'function' && (options.finally = () => {});
  typeof options.catch !== 'function' && (options.catch = (response, data, _req, _res) => {
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
  }, reqOpts)).catch(e => {});
};

var defineLib = function (o) {
  if (o.url) {
    if (/https/.test(o.url)) {
      return https;
    }

    return http$1;
  }
};

var parseBuffer = function (b) {
  try {
    return JSON.parse(b);
  } catch (e) {
    return b;
  }
};

var http = {
  exec,
  defineLib,
  parseBuffer
};

// [backbone-request-99xp](https://github.com/brunnofoggia/backbone-request-99xp) is an integration that makes possible to use

var BackboneRequest = _.extend(_.clone(Backbone), _.clone(http));

delete BackboneRequest.VERSION; // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
// will fake `"PATCH"`, `"PUT"` and `"DELETE"` requests via the `_method` parameter and
// set a `X-Http-Method-Override` header.

BackboneRequest.emulateHTTP = false; // Turn on `emulateJSON` to support legacy servers that can't deal with direct
// `application/json` requests ... this will encode the body as
// `application/x-www-form-urlencoded` instead and will send the model in a
// form param named `model`.

BackboneRequest.emulateJSON = false; // Sync engine modeled over default backbone.js ajax syncing engine
// It will make model rest methods to work for both, node and browser

BackboneRequest.sync = function (method, model, options) {
  var type = methodMap[method]; // Default options, unless specified.

  _.defaults(options || (options = {}), {
    emulateHTTP: BackboneRequest.emulateHTTP,
    emulateJSON: BackboneRequest.emulateJSON,
    headers: {}
  }); // Default JSON-request options.


  var params = _.extend({}, options, {
    type: type,
    dataType: 'json'
  }); // Ensure that we have a URL.


  if (!options.url) {
    params.url = _.result(model, 'url') || BackboneRequest.urlError();
  } // Ensure that we have the appropriate request data.


  if (model && (method === 'create' || method === 'update' || method === 'patch')) {
    params.contentType = 'application/json';

    if (options.data == null) {
      params.data = options.attrs || model.toJSON(options);
    } else {
      params.data = options.data;
    }
  } // For older servers, emulate JSON by encoding the request into an HTML-form.


  if (options.emulateJSON) {
    params.contentType = 'application/x-www-form-urlencoded';
    params.data = params.data ? {
      model: params.data
    } : {};
  } // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
  // And an `X-HTTP-Method-Override` header.


  if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
    params.type = 'POST';

    if (options.emulateJSON) {
      params.data._method = type;
    }

    params.headers['X-HTTP-Method-Override'] = type;
  } // Don't process data on a non-GET request.


  if (params.type !== 'GET' && !options.emulateJSON) {
    params.processData = false;
  } // Request & Parse engine


  var reqOpts = _.extend({
    url: params.url,
    method: params.type,
    headers: params.headers
  }, _.omit(options, 'type', 'dataType', 'emulateHTTP', 'emulateJSON'));

  if (params.data) {
    reqOpts.data = JSON.stringify(params.data);
  }

  reqOpts.headers['content-type'] = params.contentType || 'application/json'; // Promise calls

  reqOpts.then = _.partial((m, o, response, data) => {
    typeof o.success === 'function' && o.success(data, response);
  }, this, options);
  reqOpts.catch = _.bind(_.partial((m, o, response, err) => {
    this._reqErr = response;
    typeof o.error === 'function' && o.error({
      response: response,
      error: err
    });
  }, this, options), this);
  return BackboneRequest.exec(reqOpts);
}; // Map from CRUD to HTTP for our default `Backbone.sync` implementation.


var methodMap = {
  'create': 'POST',
  'update': 'PUT',
  'patch': 'PATCH',
  'delete': 'DELETE',
  'read': 'GET'
}; // Throw an error when a URL is needed, and none is supplied.

BackboneRequest.urlError = function () {
  throw new Error('A "url" property or function must be specified');
};

_.map(['Events'], x => BackboneRequest[x] = _.clone(Backbone[x])); // Custom behaviors


var ext = {
  'Model': {
    // constructor
    initialize(data = {}, options = {}) {
      this.setRouterParameters(options.req, options.res);
    },

    // easier way to have express variables inside the object to use them in callbacks
    setRouterParameters(req = null, res = null) {
      this._req = req;
      this._res = res;
    },

    // Replacing prototype of sync to call custom sync method
    sync() {
      return BackboneRequest.sync.apply(this, arguments);
    },

    // Shortcuts for promise use
    fetchp(fn, o = {}) {
      o.success = fn;
      return this.fetch(o);
    },

    savep(fn, o = {}) {
      o.success = fn;
      return this.save(null, o);
    },

    destroyp(fn, o = {}) {
      o.success = fn;
      return this.destroy(o);
    }

  },
  'Collection': {
    // Replacing prototype of sync to call custom sync method
    sync() {
      return BackboneRequest.sync.apply(this, arguments);
    }

  }
};

_.map(['Model', 'Collection'], x => BackboneRequest[x] = Backbone[x].extend(ext[x]));

export default BackboneRequest;
