#! /usr/bin/env node

var request = require('request-json');
var Q = require('q');

/**
 * Constructor to wrap credentials for each project
 */
var Optimizely = function (apiToken) {
  this.client = request.newClient(
    'https://www.optimizelyapis.com/experiment/v1/', {
      headers: {
        'Token': apiToken
      }
    });
};

/**
 * Main async helper that runs rest `action`s
 * on `url` with `data` via a promises api
 */
Optimizely.prototype.go = function (action, url, data) {
  var defer = Q.defer();
  this.client[action](url, data,
    function (err, res, body) {
      if (err || res.statusCode > 204) defer.reject(err || body);
      else defer.resolve(body);
    });
  return defer.promise.fail(function (err) {
    console.log('ERROR :( / Docs: https://github.com/clearhead/fstimizely');
    console.log(err);
  });
};

/**
 * Helpers for get/put/post/delete around go
 */
Optimizely.prototype.get = function (url) {
  return this.go('get', url);
};
Optimizely.prototype.put = function (url, data) {
  return this.go('put', url, data);
};
Optimizely.prototype.post = function (url, data) {
  return this.go('post', url, data);
};
Optimizely.prototype.del = function (url) {
  return this.go('del', url);
};

/**
 * Common use case url mapping
 */
Optimizely.prototype.getProjects = function () {
  return this.get('projects/');
};
Optimizely.prototype.getExperiment = function (experimentId) {
  return this.get('experiments/' + experimentId);
};
Optimizely.prototype.getVariations = function (experimentId) {
  return this.get('experiments/' + experimentId + '/variations/');
};

module.exports = Optimizely;
