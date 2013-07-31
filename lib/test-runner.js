var ANSIBuffer = require('./ansi-buffer'),
    async = require('async'),
    child_process = require('child_process'),
    fs = require('fs'),
    server = require('./server'),
    sourceMap = require('./source-map'),
    testServer = require('./test-server'),
    util = require('./util');

require('colors');

var ANDROID_UA = 'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';
var IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3';

exports.run = function(options, complete) {
  var superCode = 0,
      queue = async.queue(function(task, callback) { task(callback); }, 1);

  var testPlatforms = options.testPlatforms.slice(),
      webOnly = options.webOnly,
      moduleName = options.module,
      xunit = options.xunit;

  complete = complete || function(code) { process.exit(code); };

  function runPhantom(platform, androidUserAgent, xunit, callback) {
    console.log(
        'Running platform: ' + platform
        + (androidUserAgent ? ' androidUserAgent ' : '')
        + (moduleName ? ' module: ' + moduleName : ''));

    var userAgent = androidUserAgent ? ANDROID_UA : IPHONE_UA;
    var args = ['-A', userAgent],
        url = 'http://localhost:' + port + '/r/phoenix/' + platform + '/test.html';
    if (moduleName) {
      url += '?module=' + moduleName;
    }
    args.push(url);
    if (xunit) {
      args.push('-R', 'xunit');
    } else {
      args.push('-R', 'dot');
    }

    var phantom = child_process.spawn(__dirname + '/../node_modules/.bin/mocha-phantomjs', args);

    var buffer = new ANSIBuffer();
    phantom.stdout.on('data', function (data) {
      queue.push(function(callback) {
        buffer.append(data);
        if (!xunit) {
          data = buffer.trim(0);
          if (data) {
            return rewriteLines(data, mochaTests && xunit, function(err, data) {
              util.streamData('  phantom: ', data);
              callback();
            });
          }

          callback();
        }
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
        if (!xunit) {
          util.streamData('  phantom: ', buffer.toString());
        }
        if (!xunit && code) {
          util.streamData('  phantom: exit code: ', code + '\n');
        }
        queueCallback();
        callback(code, buffer);
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

    runPhantom(platform.platform, platform.androidUA, xunit, function(code, buffer) {
      if (xunit) {
        fs.writeFileSync('build/' + platform.platform + (platform.androidUA ? '_android' : '') + '.xml', buffer);
      }

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

function rewriteLines(data, noFormat, callback) {
  // Parse the incoming data for exception urls
  var tokens = data.toString().split(/(https?:\/\/localhost:.+:\d+)/g);
  async.map(tokens, function(token, callback) {
      var match = /(https?:\/\/localhost:.+):(\d+)/.exec(token);
      if (match) {
        sourceMap.map(match[1], match[2], 1, function(err, file, line) {
          file = file + ':' + line;
          if (!noFormat && !/phoenix-build/.test(file)) {
            file = file.underline.bold;
          }
          // Replace the file reference
          callback(undefined, file);
        });
      } else {
        callback(undefined, token);
      }
    },
    function(err, data) {
      if (err) {
        throw err;
      }

      callback(undefined, data.join(''));
    });
}
