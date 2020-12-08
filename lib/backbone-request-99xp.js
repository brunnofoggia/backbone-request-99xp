/**
* @license
* backbone-request 99xp
* ----------------------------------
* v1.5.0-beta
*
* Copyright (c)2020 Bruno Foggia, 99xp.
* Distributed under MIT license
*
* https://backbone-request.99xp.org
*/


(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('backbone'), require('app-exception'), require('backbone-99xp'), require('underscore-99xp'), require('https'), require('http'), require('app-exception/src/Response')) :
    typeof define === 'function' && define.amd ? define(['exports', 'backbone', 'app-exception', 'backbone-99xp', 'underscore-99xp', 'https', 'http', 'app-exception/src/Response'], factory) :
    (global = global || self, factory(global.BackboneRequest = {}, global.Backbone, global.AppException, global.bbx, global._, global.https, global.http, global.ExceptionResponse));
}(this, function (exports, Backbone, AppException, bbx, _, https, http$1, ExceptionResponse) { 'use strict';

    Backbone = Backbone && Backbone.hasOwnProperty('default') ? Backbone['default'] : Backbone;
    AppException = AppException && AppException.hasOwnProperty('default') ? AppException['default'] : AppException;
    bbx = bbx && bbx.hasOwnProperty('default') ? bbx['default'] : bbx;
    _ = _ && _.hasOwnProperty('default') ? _['default'] : _;
    https = https && https.hasOwnProperty('default') ? https['default'] : https;
    http$1 = http$1 && http$1.hasOwnProperty('default') ? http$1['default'] : http$1;
    ExceptionResponse = ExceptionResponse && ExceptionResponse.hasOwnProperty('default') ? ExceptionResponse['default'] : ExceptionResponse;

    // current version commented

    var exec = async function (options, req = null, res = null) {
      if (typeof options.url !== 'string' || // Accept to execute http requests without receiving res object if callbacks are present in options
      !res && _.size(_.pick(options, 'then', 'catch')) < 2) {
        return false;
      }

      var defaults = _.defaults({
        method: 'GET',
        rejectUnauthorized: false,
        headers: {
          'content-type': 'application/json'
        },
        timeout: 18000000
      }, !options.url ? {} : _.parseUrl(options.url)); // default promise calls


      typeof options.then !== 'function' && (options.then = async (response, data, _req, _res) => {
        if (_res) {
          return !_res._headerSent && _res.status(response.statusCode || 200).send(data);
        }

        throw new ExceptionResponse(JSON.stringify(data), 0, response.statusCode || 200);
      });
      typeof options.finally !== 'function' && (options.finally = async () => {});
      typeof options.catch !== 'function' && (options.catch = async (response, data, _req, _res) => {
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

          if (_res) {
            return !_res._headerSent && _res.status(status).send(data);
          }

          throw new ExceptionResponse(JSON.stringify(data), 0, status);
        } catch (e) {
          if (_res) {
            return !_res._headerSent && _res.status(_.isObject(e) ? e.statusCode || 500 : 500).send(e);
          }

          throw new ExceptionResponse(e, 0, _.isObject(e) ? e.statusCode || 500 : 500);
        }
      });

      var reqOpts = _.defaults2(_.pick(options, 'url', 'method', 'headers', 'data', 'timeout', 'secureProtocol', 'minVersion', 'maxVersion', 'then', 'catch'), defaults);

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
        const r = httprequest.request(_.omit(_o, 'data'), async resp => {
          let chunks = [];
          resp.setEncoding('utf8');
          resp.on('data', chunk => {
            chunks.push(chunk);
          });
          /*resp.setEncoding('utf8');*/

          resp.on('end', async () => {
            try {
              var rawData = chunks[0] instanceof Buffer || chunks[0] instanceof Uint8Array ? Buffer.concat(chunks) : chunks.join('');
              var data = rawData ? JSON.parse(rawData) : '';

              if (resp.statusCode < 400) {
                resolve({
                  resp,
                  data,
                  req,
                  res,
                  options: _o
                });
              } else {
                reject({
                  resp,
                  data,
                  req,
                  res,
                  options: _o
                });
              }
            } catch (e) {
              reject({
                resp,
                options: _o,
                data: {
                  data: e.message,
                  status: 500
                },
                req,
                res
              });
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

          reject({
            resp: r,
            data: message,
            options: _o,
            req,
            res
          }); // output: {
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
      }, reqOpts)).then(async o => {
        o.options.then(o.resp, o.data, o.req, o.res, o.options);
      }).catch(async o => {
        o.options.catch(o.resp, o.data, o.req, o.res, o.options);
      });
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
      throw AppException.internalServerError('A "url" property or function must be specified');
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

    _.map(['Model', 'Collection'], x => BackboneRequest[x] = bbx[x.toLowerCase()].extend(ext[x]));

    exports.default = BackboneRequest;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=backbone-request-99xp.js.map
