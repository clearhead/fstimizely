#! /usr/bin/env node

var UPLOAD = process.argv[2] === 'up';

var Optimizely = require('./lib/optimizely');

var fs = require('fs');
var slug = require('slug');
var git = require('git-promise');
var gitUtil = require('git-promise/util');
require('colors');

/**
 * Token API for multiple projects
 * cat ~/.fstimizelyrc # {'tokens': {'$name':'$token'}}
 * cat ./.fstimizelyrc # {'$name':'$experiment_id'}
 *
 * note: overarchitected for prep to move to account level sync
 */
var API_TOKEN, EXPERIMENT_ID; // ewww
(function() {
  var conf = require('rc')('fstimizely', {});
  if (!conf.tokens) throw new Error('.fstimizelyrc requires tokens object');
  Object.keys(conf).forEach(function (key) {
    if (['_', 'config', 'tokens'].indexOf(key) === -1) {
      API_TOKEN = conf.tokens[key];
      EXPERIMENT_ID = conf[key];
    }
  });
  if (!API_TOKEN) throw new Error('.fstimizelyrc api_token missing');
  if (!EXPERIMENT_ID) throw new Error('.fstimizelyrc experiment_id missing');
})();
var optimizely = new Optimizely(API_TOKEN);

/**
 * Avoid losing non-commited changes by failing unless
 * you're on a clean git tree
 */
git('status --porcelain', gitUtil.extractStatus)
  .then(function (status) {
    var err;
    ['modified', 'added', 'deleted', 'renamed', 'copied'].forEach(function (b) {
      if (status.workingTree[b].length) {
        err = 'dirty git tree - please stash/commit first';
        console.error(err.red);
        throw err;
      }
    });
    return true;
  }).then(function() { // Yay now we can run!
    // globaljs and css
    optimizely.getExperiment(EXPERIMENT_ID)
      .then(function (experiment) {
        writeOrUpload(experiment, 'experiments/' + experiment.id, 'global.js', 'custom_js');
        writeOrUpload(experiment, 'experiments/' + experiment.id, 'global.css', 'custom_css');
      });
    // variation js
    optimizely.getVariations(EXPERIMENT_ID)
      .then(function (variations) {
        variations.forEach(function (variation) {
          writeOrUpload(variation, 'variations/' + variation.id,
            slug(variation.description).toLowerCase() + '.js', 'js_component');
        });
      });
  });



/*jshint latedef:false*/

/**
 * Write or Upload files based on upload/download state
 * @param  {object} obj      object in question
 * @param  {string} url      url endpoint
 * @param  {string} fileName filename in question
 * @param  {string} key      key on object to check
 */
function writeOrUpload(obj, url, fileName, key) {
  fs.readFile(fileName, function(err, data) {
    // if in upload mode, confirm then
    //  modify put {`key`: `fsText`} to `url`
    if (UPLOAD) {
      if (err) return;
      data = data.toString(); // idk
      if (isDifferent(fileName, obj[key], data)) {
        if (getAnswer('Upload diff to ' + fileName)) { // sync / needs to be nested
          var stingy = {};
          stingy[key] = data;
          optimizely.put(url, stingy).then(function() {
            console.log('Uploaded to: https://www.optimizely.com/edit?experiment_id=' + EXPERIMENT_ID);
          });
        }
      }
    } else {
      // Print diff of obj[key] and fileText & write file
      if (err) data = '';
      if (isDifferent(fileName, data.toString(), obj[key])) {
        fs.writeFile(fileName, obj[key]);
      }
    }
  });
}

/**
 * Prints a diff
 * @param  {string}  name  name of diff
 * @param  {string}  start base to diff
 * @param  {string}  end   base to compare
 * @return {Boolean}       start != end
 */
function isDifferent(name, start, end) {
  var jsdiff = require('diff');
  console.log(('\nDIFF: ' + name + ' ->').blue);
  var diff = jsdiff.diffLines(start, end);
  var lastLine; // force newline print on lastLine
  diff.forEach(function(part) {
    var color = part.added ? 'green' :
      part.removed ? 'red' : 'grey';
    process.stderr.write(part.value[color]);
    lastLine = part;
  });
  if (!lastLine.value.match(/\n$/)) console.log('\n');
  return start !== end;
}

/**
 * prompt for an answer
 * @param  {string} q question to ask [y/N]?
 * @return {Boolean}   answer
 */
function getAnswer(q) {
  console.log('here');
  var prompt = require('readline-sync');
  var yesNo = require('yes-no').parse;
  var a = prompt.question(q + '? [y/N]: ');
  if (a === '') a = false;
  else a = yesNo(a);
  return a;
}
