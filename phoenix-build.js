/*global jake */
var async = require('async'),
    build = require('./lib/build'),
    cssTestRunner = require('./lib/css-test-runner'),
    glob = require('glob'),
    growl = require('growl'),
    packageGenerator = require('./lib/package-generator'),
    server = require('./lib/server'),
    sourceMap = require('./lib/source-map'),
    testRunner = require('./lib/test-runner'),
    wrench = require('wrench');

exports.build = function(options) {
  options.lumbarFile = options.lumbarFile || exports.lumbarFile;
  build.build(options);
};
exports.startServer = function(options) {
  options.projectDir = exports.projectDir;
  options.forceCORS = exports.forceCORS;
  return server.start(options);
};
exports.watch = function(server, mocks, test, compiled) {
  glob.sync('build/dev').forEach(wrench.rmdirSyncRecursive);

  var run;
  exports.startServer({
    test: test,
    proxy: server,
    mocks: mocks,
    data: function() {
      if (run) {
        return;
      }
      run = true;

      exports.build({
        dir: 'build/dev',
        sourceMap: true,
        watch: true,
        compiled: compiled,
        server: exports.buildServer,
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
    sourceMap: true,
    server: exports.buildServer,
    complete: function(code) {
      if (code) {
        console.error('Build failed with code ' + code);
        process.exit(code);
      } else {
        complete();
      }
    }
  });
}, true);

desc('Watches for build changes without a server instance.');
task('lumbar-watch', [], function() {
  exports.build({
    dir: 'build/dev',
    sourceMap: true,
    watch: true,
    server: exports.buildServer,
    complete: function(code) {
      process.exit(code);
    }
  });
}, true);

desc('Builds production packages');
task('release', [], function(prefix, pkg, branch) {
  prefix = prefix || 'phoenix';

  exports.build({
    dir: 'build/' + prefix,
    package: pkg,
    minimize: true,
    server: exports.buildServer,
    removeTests: true,
    sourceMap: 'build/source-map/' + prefix,
    configFile: './config/production.json',
    complete: function(code) {
      if (code) {
        process.exit(code);
      } else {
        if (exports.generatePackage) {
          packageGenerator.generate('./package.json', branch, 'build/' + prefix + '/package.json', function(err) {
            if (err) {
              throw err;
            }
            complete();
          });
        } else {
          complete();
        }
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
  var options = {
    projectDir: exports.projectDir,
    forceCORS: exports.forceCORS,
    testPlatforms: exports.testPlatforms,
    mochaTests: exports.mochaTests,
    webOnly: webOnly,
    xunit: xunit
  };
  testRunner.run(options);
});

desc('Testing');
task('css-test-runner', [], function(webOnly) {
  var options = {
    projectDir: exports.projectDir,
    forceCORS: exports.forceCORS,
    testPlatforms: exports.testPlatforms,
    webOnly: webOnly
  };
  cssTestRunner.run(options);
});


desc('Runs both builds and tests in response to watch changes.');
task('test-watch', [], function(server, mocks) {
  var queue = async.queue(function(task, callback) { task(callback); }, 1);
  exports.watch((exports.serverName || function() {}).apply(exports, arguments), mocks, true, function(module) {
    var options = {
      projectDir: exports.projectDir,
      forceCORS: exports.forceCORS,
      testPlatforms: exports.testPlatforms,
      mochaTests: exports.mochaTests,
      webOnly: true,
      module: module,
    };
    queue.push(function(callback) {
      // Cleanup any junk content that we might have
      sourceMap.reset();

      testRunner.run(options, function(code) {
        if (code) {
          growl('Test ' + module + ' failed: ' + code, { title: 'Test Failed', sticky: true });
        }
        callback();
      });
    });
  });
});

desc('Testing');
task('test', ['lumbar', 'test-runner'], function() {});
desc('Testing');
task('css-test', ['lumbar', 'css-test-runner'], function() {});

task('test-xunit', ['lumbar'], function() {
  jake.Task['test-runner'].invoke(undefined, true);
});
