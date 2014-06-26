#! /usr/bin/env node

var UPLOAD = process.argv[2] === 'up';

var request = require('request-json');
var fs = require('fs');
var Q = require('q');
var slug = require('slug');
var conf = require('rc')('fstimizely', {});
var prompt = require('sync-prompt').prompt;
var yesNo = require('yes-no').parse;
var jsdiff = require('diff');
require('colors');

var onError = function (err) {
  console.log('ERROR :( / Docs: https://github.com/tomfuertes/fstimizely');
  console.log(err);
};

var different = function (start, end) {
  // console.log(start, end);
  var diff = jsdiff.diffLines(start, end);
  diff.forEach(function (part) {
    // green for additions, red for deletions
    // grey for common parts
    var color = part.added ? 'green' :
      part.removed ? 'red' : 'grey';
    process.stderr.write(part.value[color]);
  });
  console.log();
  return start != end; // jshint ignore:line
};

if (!conf.api_token || conf.api_token === 'abcdefghijklmnopqrstuvwxyz:123456' ||
  !conf.experiment_id || conf.experiment_id === '123456789') {
  console.error('.fstimizelyrc needs to have an api_token and experiment_id');
  console.error('EXAMPLE: https://github.com/tomfuertes/fstimizely/blob/master/.fstimizelyrc');
  throw new Error('rc config error');
}


var client = request.newClient('https://www.optimizelyapis.com/experiment/v1/', {
  headers: {
    'Token': conf.api_token
  },
  rejectUnauthorized: false
});

var get = function (url) {
  var defer = Q.defer();
  client.get(url, function (err, res, body) {
    if (err) defer.reject(err);
    else defer.resolve(body);
  });
  return defer.promise;
};
var put = function (url, data) {
  var defer = Q.defer();
  client.put(url, data, function (err, res, body) {
    if (err) defer.reject(err);
    else defer.resolve(body);
  });
  return defer.promise;
};

var getAnswer = function (q) {
  var a = prompt(q + '? [Y/n]: ');
  if (a === '') a = true;
  else a = yesNo(a);
  return a;
};

var conditionalWriteFile = function (name, txt) {
  fs.readFile(name, function (err, data) {
    if (err) data = '';
    console.log(('############ diff of ' + name + ' ############').blue);
    if (different(data.toString(), txt)) {
      if (getAnswer('Write diff to ' + name))
        fs.writeFile(name, txt);
    }
  });
};


get('experiments/' + conf.experiment_id + '/')
  .then(function (experiment) {
    function processGlobal(fileName, key) {
      fs.readFile(fileName, function (err, data) {
        if (different(experiment[key], data.toString())) {
          if (getAnswer('Upload diff to ' + fileName)) {
            var x = {};
            x[key] = data.toString();
            put('experiments/' + experiment.id, x).fail(onError);
          }
        }
      });
    }

    if (UPLOAD) {
      processGlobal('global.js', 'custom_js');
      processGlobal('global.css', 'custom_css');
    } else {
      conditionalWriteFile('global.js', experiment.custom_js);
      conditionalWriteFile('global.css', experiment.custom_css);
    }
  }, onError);

get('experiments/' + conf.experiment_id + '/variations/')
  .then(function (variations) {
    if (UPLOAD) {
      variations.forEach(function (variation) {
        var name = slug(variation.description).toLowerCase() + '.js';
        fs.readFile(name, function (err, data) {
          if (different(variation.js_component, data.toString())) {
            if (getAnswer('Upload diff to ' + name)) {
              variation.js_component = data.toString();
              put('variations/' + variation.id, variation).fail(onError);
            }
          }
        });
      });
    } else {
      variations.forEach(function (variation) {
        conditionalWriteFile(slug(variation.description).toLowerCase() + '.js', variation.js_component);
      });
    }
  }, onError);
