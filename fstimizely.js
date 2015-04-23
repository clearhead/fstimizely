#! /usr/bin/env node

var UPLOAD = process.argv[2] === 'up';

var fs = require('fs');
var slug = require('slug');
var git = require('git-promise');
var gitUtil = require('git-promise/util');
var optimizely = require('optimizely-node');
var inquirer = require('inquirer');
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
  if (!conf.tokens) logErrorAndExit('.fstimizelyrc requires tokens object');
  Object.keys(conf).forEach(function(key) {
    if (['_', 'config', 'tokens'].indexOf(key) === -1) {
      API_TOKEN = conf.tokens[key];
      EXPERIMENT_ID = conf[key];
    }
  });
  if (!API_TOKEN) logErrorAndExit('.fstimizelyrc api_token missing');
  if (!EXPERIMENT_ID) logErrorAndExit('.fstimizelyrc experiment_id missing');
})();

optimizely = optimizely(API_TOKEN);

/**
 * Avoid losing non-commited changes by failing unless
 * you're on a clean git tree
 */
git('status --porcelain', gitUtil.extractStatus)
  .then(function(status) {
    ['modified', 'added', 'deleted', 'renamed', 'copied'].forEach(function(b) {
      if (status.workingTree[b].length) {
        logErrorAndExit('dirty git tree - please stash/commit first');
      }
    });
    return true;
  }).then(function() { // Yay now we can run!
    // globaljs and css
    return optimizely.getExperiment(EXPERIMENT_ID)
      .then(function(experiment) {
        // if (experiment.status === 'Running') {
        //   logErrorAndExit('experiment running! please use the editor to edit\n' +
        //     'https://www.optimizely.com/edit?experiment_id=' + EXPERIMENT_ID);
        // }
        writeOrUpload(experiment, 'experiments/' + experiment.id, 'global.js', 'custom_js');
        writeOrUpload(experiment, 'experiments/' + experiment.id, 'global.css', 'custom_css');
        // variation js
        return optimizely.getVariations(EXPERIMENT_ID)
          .then(function(variations) {
            variations.forEach(function(variation) {
              writeOrUpload(variation, 'variations/' + variation.id,
                slug(variation.description).toLowerCase() + '.js', 'js_component');
            });
            return true;
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
      upload(err, data, url, fileName, obj, key);
    } else {
      // Print diff of obj[key] and fileText & write file
      write(err, data, fileName, obj, key);
    }
  });
}

function upload(err, data, url, fileName, obj, key) {
  if (err) return;
  data = data.toString(); // idk
  if (isDifferent(fileName, obj[key], data)) {
    return asyncAnswer('Upload diff to ' + fileName, function() {
      var stingy = {};
      stingy[key] = data;
      optimizely.put(url, stingy).then(function() {
        console.log('Uploaded to: https://www.optimizely.com/edit?experiment_id=' + EXPERIMENT_ID);
        return true;
      });
    });
  }
}

function write(err, data, fileName, obj, key) {
  if (err) data = '';
  if (isDifferent(fileName, data.toString(), obj[key])) {
    fs.writeFile(fileName, obj[key]);
  }
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
  console.log('\n');
  if (start !== end) {
    var diff = jsdiff.diffLines(start, end);
    diff.forEach(function(part) {
      var color = part.added ? 'green' :
        part.removed ? 'red' : 'grey';
      process.stderr.write(part.value[color]);
    });
  } else {
    console.log('same!'.grey);
  }
  console.log('\n');
  return start !== end;
}

/**
 * prompt for an answer
 * @param  {string} q question to ask [y/N]?
 * @param  {function} callback(true|false)
 */
function asyncAnswer(q, callback) {
  inquirer.prompt([{
    type: 'confirm',
    name: 'q',
    message: q
  }], function(answers) {
    if (answers.q) callback(true);
  });
}

function logErrorAndExit(str) {
  console.error(str.red);
  throw str;
}
