/*global jake */
var child_process = require('child_process'),
    fs = require('fs'),
    glob = require('glob'),
    growl = require('growl'),
    path = require('path'),
    portscanner = require('portscanner'),
    util = require('util'),
    wrench = require('wrench');

// Recursive mkdir
// mkdirsSync(path, [mode=(0777^umask)]) -> pathsCreated
function mkdir(dirname, mode) {
  if (mode === undefined) {
    mode = 0777 ^ process.umask();
  }
  var pathsNotFound = [];
  var fn = dirname;
  while (true) {
    try {
      var stats = fs.statSync(fn);
      if (stats.isDirectory()) {
        break;
      }
      throw new Error('Unable to create directory at ' + fn);
    }
    catch (e) {
      pathsNotFound.push(fn);
      fn = path.dirname(fn);
    }
  }
  for (var i = pathsNotFound.length - 1; i > -1; i--) {
    var fn = pathsNotFound[i];
    console.log('mkdir:\t\033[90mmaking directory\033[0m ' + fn);
    fs.mkdirSync(fn, mode);
  }
}

function streamData(prefix, data) {
  var lines = data.toString().split(/\r\n|\n|\r/g);
  for (var i = 0, len = lines.length - 1; i < len; i++) {
    util.print(prefix);
    util.print(lines[i]);
    util.print('\n');
  }
  if (lines[lines.length - 1]) {
    util.print(prefix);
    util.print(lines[lines.length - 1]);
  }
}

exports.build = function(options) {
  var complete = options.complete;

  mkdir(options.dir);

  var args = [
    __dirname + '/node_modules/lumbar/bin/lumbar',
    options.watch ? 'watch' : 'build',
    '--config', options.configFile || './config/dev.json',
    '--use', __dirname + '/node_modules/lumbar-long-expires',
    '--use', __dirname + '/node_modules/lumbar-tester',
    '--with', '{"includeTests": ' + !options.removeTests + '}',
    '--use', __dirname + '/node_modules/lumbar-style-doc',
    '--with', '{"removeDocs": ' + !!options.removeTests + '}',
    '--use', 'conditional',
    '--with', '{"env": "' + (options.minimize ? 'production' : 'dev') + '"}',
    './lumbar.json',
    (options.dir || '.')
  ];
  if (options.package) {
    args.push('--package');
    args.push(options.package);
  }
  if (options.minimize) {
    args.push('--minimize');
  }

  var lumbar = child_process.spawn('node', args);
  lumbar.stdout.on('data', function (data) {
    streamData('lumbar: ', data);
  });
  lumbar.stderr.on('data', function (data) {
    streamData('lumbar err: ', data);
  });

  lumbar.on('exit', function(code) {
    if (!complete) {
      growl('Lumbar Borked', { title: 'Lumbar Borked', sticky: true });
    } else {
      complete(code);
    }
  });
  return lumbar;
};

exports.startServer = function(options) {
  var test = !!options.test,
      onData = options.data,
      complete = options.complete;

  if (options.mocks) {
    process.env.ENABLE_MOCKS = options.mocks;
  }
  var args = [
    __dirname + '/node_modules/mock-server/bin/mock-server',
    exports.projectDir,
    '--proxy-server=' + options.proxy,
    '--port=' + (options.port || 8080),
    '--secure-port=' + (options.securePort || 8081)
  ];
  if (exports.forceCORS) {
    args.push('--force-cors');
  }

  var server = child_process.spawn('node', args, {
    env: process.env
  });
  server.stdout.on('data', function (data) {
    if (onData) {
      onData(data);
    }

    // Do not output module, etc requests if in test mode
    if (!test || !/GET \/r\/phoenix/.test(data)) {
      streamData((test ? '  ' : '') + 'server: ', data);
    }
  });
  server.stderr.on('data', function (data) {
    if (onData) {
      onData(data);
    }
    streamData((test ? '  ' : '') + 'server: ', data);
  });

  if (!test) {
    server.on('exit', function(code) {
      growl('Server Borked', { title: 'Server Borked', sticky: true });

      if (complete) {
        complete(code);
      }
    });
  }

  // If we die we're taking the server with us (to prevent ports from hanging around)
  process.on('exit', function() {
    if (server) {
      server.kill();
    }
  });

  return server;
};

exports.watch = function(server, mocks) {
  glob.sync('build/dev').forEach(wrench.rmdirSyncRecursive);

  var run;
  exports.startServer({
    proxy: server,
    mocks: mocks,
    data: function() {
      if (run) {
        return;
      }
      run = true;

      exports.build({
        dir: 'build/dev',
        watch: true,
        complete: function(code) {
          process.exit(code);
        }
      });
    },
    complete: function(code) {
      process.exit(code);
    }
  });
};

desc('The default task. Executes init');
task('default', ['lumbar'], function() {});

desc('Process all lumbar modules.');
task('lumbar', [], function() {
  exports.build({
    dir: 'build/dev',
    complete: complete
  });
}, true);

desc('Builds production packages');
task('release', [], function(prefix, pkg) {
  prefix = prefix || 'phoenix';

  exports.build({
    dir: 'build/' + prefix,
    package: pkg,
    minimize: true,
    removeTests: true,
    configFile: './config/production.json',
    complete: function(code) {
      if (code) {
        process.exit(code);
      } else {
        complete();
      }
    }
  });
});

desc('Cleans any generated content out of the application');
task('clean', [], function() {
  glob.sync('build').forEach(wrench.rmdirSyncRecursive);
});

desc('Builds the app in production test mode.');
task('heroku-test', [], function() {
  exports.build({
    dir: 'build/test',
    minimize: true,
    configFile: './config/production.json',
    complete: complete
  });
}, true);

desc('Initializes the file change watcher for stylus scripts');
task('watch', [], function(server, mocks) {
  exports.watch((exports.serverName || function() {}).apply(exports, arguments), mocks);
});

desc('Starts up the server in normal mode');
task('start', [], function(server, mocks) {
  exports.startServer({proxy: exports.serverName.apply(exports, arguments), mocks: mocks});
});


desc('Testing');
task('test-runner', [], function(webOnly, xunit) {
  var superCode = 0;

  function runPhantom(platform, androidUserAgent, xunit, port, callback) {
    console.log('Running platform: ' + platform + ' androidUserAgent: ' + (!!androidUserAgent));
    var userAgent = androidUserAgent ?
            'Mozilla/5.0 (Linux; U; Android 2.3.6; en-us; Nexus S Build/GRK39F) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1'
            : 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3',
        phantom;
    if (exports.mochaTests) {
      var args = ['-A', userAgent, 'http://localhost:' + port + '/r/phoenix/' + platform + '/test.html'];
      if (xunit) {
        args.push('-R', 'xunit');
      }
      phantom = child_process.spawn(__dirname + '/node_modules/.bin/mocha-phantomjs', args);
    } else {
      phantom = child_process.spawn('phantomjs', [__dirname + '/test/run-qunit.js', 'http://localhost:' + port + '/r/phoenix/' + platform + '/test.html', userAgent]);
    }

    var buffer = '';
    phantom.stdout.on('data', function (data) {
      if (exports.mochaTests && xunit) {
        buffer += data;
      } else {
        streamData('  phantom: ', data);
      }
    });
    phantom.stderr.on('data', function (data) {
      streamData('  phantom err: ', data);
    });
    phantom.on('exit', function(code) {
      superCode = superCode | code;
      callback(code, buffer);
    });
  }

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

  var run;
  findPorts(function(port, securePort) {
    exports.startServer({
      proxy: (exports.serverName || function() {}).call(exports),
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
          var platform = exports.testPlatforms.shift();
          if (webOnly && !platform.webOnly) {
            process.exit(superCode);
            return;
          }

          runPhantom(platform.platform, platform.androidUA, xunit, port, function(code, buffer) {
            if (exports.mochaTests && xunit) {
              fs.writeFileSync('build/' + platform.platform + (platform.androidUA ? '_android' : '') + '.xml', buffer);
            }

            if (!exports.testPlatforms.length) {
              process.exit(superCode);
            } else {
              exec();
            }
          });
        })();
      }
    });
  });
});


desc('Testing');
task('test', ['lumbar', 'test-runner'], function() {});

task('test-xunit', ['lumbar'], function() {
  jake.Task['test-runner'].invoke(undefined, true);
});
