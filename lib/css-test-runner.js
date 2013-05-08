var ANSIBuffer = require('./ansi-buffer'),
    async = require('async'),
    child_process = require('child_process'),
    fs = require('fs'),
    sourceMap = require('./source-map'),
    testServer = require('./test-server'),
    util = require('./util');

var ANDROID_UA = 'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';
var IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3';

exports.run = function(options, complete) {
  var superCode = 0,
      queue = async.queue(function(task, callback) { task(callback); }, 1);

  var mochaTests = options.mochaTests,
      testPlatforms = options.testPlatforms.slice(),
      webOnly = options.webOnly,
      moduleName = options.module;

  complete = complete || function(code) { process.exit(code); };

  function runPhantom(platform, androidUserAgent, callback) {
    console.log(
        'Running platform: ' + platform
        + (androidUserAgent ? ' androidUserAgent ' : '')
        + (moduleName ? ' module: ' + moduleName : ''));
    var userAgent = androidUserAgent ? ANDROID_UA : IPHONE_UA,
        phantom = child_process.spawn(
            'phantomjs', [
                '--ignore-ssl-errors=yes',
                '--web-security=false',
                __dirname + '/../test/run-css.js',
                port,
                platform,
                userAgent]);


    phantom.stdout.on('data', function (data) {
      queue.push(function(callback) {
        util.streamData('  phantom: ', data);
        callback();
      });
    });
    phantom.stderr.on('data', function (data) {
      queue.push(function(callback) {
        util.streamData('  phantom err: ', data);
        callback();
      });
    });
    phantom.on('exit', function(code) {
      queue.push(function(queueCallback) {
        superCode = superCode || code;
        if (code) {
          util.streamData('  phantom: exit code: ', code + '\n');
        }
        queueCallback();
        callback(code);
      });
    });
  }

  var port;
  function exec() {
    var platform = testPlatforms.shift();
    if (webOnly && !platform.webOnly) {
      complete(superCode);
      return;
    }

    runPhantom(platform.platform, platform.androidUA, function(code) {
      if (!testPlatforms.length) {
        complete(superCode);
      } else {
        exec();
      }
    });
  }
  testServer.exec(options.projectDir, function(_port) {
    port = _port;
    exec();
  });
};
