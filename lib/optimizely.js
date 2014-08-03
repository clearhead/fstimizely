#! /usr/bin/env node

var request = require('request-json');
var Q = require('q');

var client;

var q = function (action, url, data) {
  var defer = Q.defer();
  client[action].apply(url, data, function (err, res, body) {
    if (err || res.statusCode > 204) defer.reject(err || body);
    else defer.resolve(body);
  });
  return defer.promise;
};

var get = function (url) {
  return q('get', url);
};
var put = function (url, data) {
  return q('put', url, data);
};
var post = function (url, data) {
  return q('post', url, data);
};
var del = function (url) {
  return q('del', url);
};


module.exports = {
  init: function (token) {
    client = request.newClient('https://www.optimizelyapis.com/experiment/v1/', {
      headers: {
        'Token': token
      }
    });
  },

  /**
   * fstimizely helpers
   */
  getProjects: function () {
    return get('projects/');
  },
  getExperiments: function (projectId) {
    return get('experiments/' + projectId + '/');
  },

  /**
   * expose b/c why not
   */
  get: get,
  put: put,
  post: post,
  del: del
};
