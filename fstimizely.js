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
var git = require('git-promise');
var gitUtil = require('git-promise/util');
require('colors');

/**
 * globals
 */
var
  log = function () {
    if (arguments[0] !== undefined)
      console.log(arguments[0]);
  },
  onError = function (err) {
    log('ERROR :( / Docs: https://github.com/clearhead/fstimizely');
    log(err);
  };

/**
 * compares text / prints diff
 */
var different = function (start, end) {
  var diff = jsdiff.diffLines(start, end);
  var lastLine; // force newline print on lastLine
  diff.forEach(function (part) {
    var color = part.added ? 'green' :
      part.removed ? 'red' : 'grey';
    process.stderr.write(part.value[color]);
    lastLine = part;
  });
  if (!lastLine.value.match(/\n$/)) console.log('\n');
  return start != end; // jshint ignore:line
};

/**
 * Token API for multiple projects
 * cat ~/.fstimizelyrc # {'tokens': {'$name':'$token'}}
 * cat ./.fstimizelyrc # {'$name':'$experiment_id'}
 */
if (!conf.tokens) throw new Error('.fstimizelyrc requires tokens object');
Object.keys(conf).forEach(function (key) {
  if (['_', 'config', 'tokens'].indexOf(key) === -1) {
    conf.api_token = conf.tokens[key];
    conf.experiment_id = conf[key];
  }
});
if (!conf.api_token) throw new Error('.fstimizelyrc api_token missing');
if (!conf.experiment_id) throw new Error('.fstimizelyrc experiment_id missing');

var client = request.newClient('https://www.optimizelyapis.com/experiment/v1/', {
  headers: {
    'Token': conf.api_token
  },
  rejectUnauthorized: false
});

var get = function (url) {
  var defer = Q.defer();
  client.get(url, function (err, res, body) {
    if (err || res.statusCode !== 200) defer.reject(err || body);
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
  var a = prompt(q + '? [y/N]: ');
  if (a === '') a = false;
  else a = yesNo(a);
  return a;
};

var conditionalWriteFile = function (name, txt) {
  fs.readFile(name, function (err, data) {
    if (err) data = '';
    log(('DIFF: ' + name).blue);
    if (different(data.toString(), txt)) {
      fs.writeFile(name, txt);
    }
  });
};

function getExperiments(eid) {
  get('experiments/' + eid + '/')
    .then(function (experiment) {
      function processGlobal(fileName, key) {
        fs.readFile(fileName, function (err, data) {
          if (err) return;
          log(('DIFF: ' + fileName).blue);
          if (different(experiment[key], data.toString())) {
            if (getAnswer('Upload diff to ' + fileName)) {
              var x = {};
              x[key] = data.toString();
              put('experiments/' + experiment.id, x, log).then(function () {
                log('Uploaded to: https://www.optimizely.com/edit?experiment_id=' + eid);
              });
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
}

function getVariations(eid) {
  get('experiments/' + eid + '/variations/')
    .then(function (variations) {
      if (UPLOAD) {
        variations.forEach(function (variation) {
          var name = slug(variation.description).toLowerCase() + '.js';
          fs.readFile(name, function (err, data) {
            if (err) return;
            log(('DIFF: ' + name).blue);
            if (different(variation.js_component, data.toString())) {
              if (getAnswer('Upload diff to ' + name)) {
                variation.js_component = data.toString();
                put('variations/' + variation.id, variation).then(function () {
                  log('Uploaded to: https://www.optimizely.com/edit?experiment_id=' + eid);
                });
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
}

git('status --porcelain', gitUtil.extractStatus).then(function (status) {
  var err;
  ['modified', 'added', 'deleted', 'renamed', 'copied'].forEach(function (b) {
    if (status.workingTree[b].length) {
      err = 'dirty git tree - please stash/commit first';
      console.error(err.red);
      throw err;
    }
  });
  getExperiments(conf.experiment_id);
  getVariations(conf.experiment_id);
});
