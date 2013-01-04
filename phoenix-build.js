/*global jake */
var build = require('./lib/build'),
    glob = require('glob'),
    packageGenerator = require('./lib/package-generator'),
    server = require('./lib/server'),
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
        if (exports.generatePackage) {
          packageGenerator.generate('./package.json', 'build/' + prefix + '/package.json', function(err) {
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
task('test', ['lumbar', 'test-runner'], function() {});

task('test-xunit', ['lumbar'], function() {
  jake.Task['test-runner'].invoke(undefined, true);
});
