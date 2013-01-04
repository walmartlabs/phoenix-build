var child_process = require('child_process'),
    fs = require('fs'),
    portscanner = require('portscanner'),
    server = require('./server'),
    util = require('./util');

var ANDROID_UA = 'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1';
var IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3';

exports.run = function(options) {
  var superCode = 0;

  var mochaTests = options.mochaTests,
      testPlatforms = options.testPlatforms.slice(),
      webOnly = options.webOnly,
      xunit = options.xunit;

  function runPhantom(platform, androidUserAgent, xunit, port, callback) {
    console.log('Running platform: ' + platform + ' androidUserAgent: ' + (!!androidUserAgent));
    var userAgent = androidUserAgent ? ANDROID_UA : IPHONE_UA,
        phantom;
    if (mochaTests) {
      var args = ['-A', userAgent, 'http://localhost:' + port + '/r/phoenix/' + platform + '/test.html'];
      if (xunit) {
        args.push('-R', 'xunit');
      }
      phantom = child_process.spawn(__dirname + '/../node_modules/.bin/mocha-phantomjs', args);
    } else {
      phantom = child_process.spawn('phantomjs', [__dirname + '/../test/run-qunit.js', 'http://localhost:' + port + '/r/phoenix/' + platform + '/test.html', userAgent]);
    }

    var buffer = '';
    phantom.stdout.on('data', function (data) {
      if (mochaTests && xunit) {
        buffer += data;
      } else {
        util.streamData('  phantom: ', data);
      }
    });
    phantom.stderr.on('data', function (data) {
      util.streamData('  phantom err: ', data);
    });
    phantom.on('exit', function(code) {
      superCode = superCode | code;
      if (!xunit && code) {
        util.streamData('  phantom: exit code: ', code + '\n');
      }
      callback(code, buffer);
    });
  }

  var run;
  findPorts(function(port, securePort) {
    server.start({
      projectDir: options.projectDir,
      mocks: true,
      test: true,
      port: port,
      securePort: securePort,
      data: function() {
        if (run) {
          return;
        }
        run = true;

        (function exec() {
          var platform = testPlatforms.shift();
          if (webOnly && !platform.webOnly) {
            process.exit(superCode);
            return;
          }

          runPhantom(platform.platform, platform.androidUA, xunit, port, function(code, buffer) {
            if (mochaTests && xunit) {
              fs.writeFileSync('build/' + platform.platform + (platform.androidUA ? '_android' : '') + '.xml', buffer);
            }

            if (!testPlatforms.length) {
              process.exit(superCode);
            } else {
              exec();
            }
          });
        })();
      }
    });
  });
};

function findPorts(callback) {
  portscanner.findAPortNotInUse(58080, 58090, 'localhost', function(err, port) {
    if (err) {
      throw err;
    }

    portscanner.findAPortNotInUse(port + 1, 58090, 'localhost', function(err, securePort) {
      if (err) {
        throw err;
      }

      callback(port, securePort);
    });
  });
}
