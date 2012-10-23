var child_process = require('child_process'),
    fs = require('fs'),
    glob = require('glob'),
    growl = require('growl'),
    path = require('path'),
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
      throw new Error('Unable to create directory at '+fn);
    }
    catch (e) {
      pathsNotFound.push(fn);
      fn = path.dirname(fn);
    }
  }
  for (var i=pathsNotFound.length-1; i>-1; i--) {
    var fn = pathsNotFound[i];
    console.log('mkdir:\t\033[90mmaking directory\033[0m ' + fn);
    fs.mkdirSync(fn, mode);
  }
}

function streamData(prefix, data) {
  var lines = data.toString().split(/\r\n|\n|\r/g);
  for (var i = 0, len = lines.length-1; i < len; i++) {
    util.print(prefix);
    util.print(lines[i]);
    util.print('\n');
  }
  if (lines[lines.length-1]) {
    util.print(prefix);
    util.print(lines[lines.length-1]);
  }
}

exports.build = function(options) {
  var complete = options.complete;

  mkdir(options.dir);

  var args = [
      __dirname + '/node_modules/lumbar/bin/lumbar',
      options.watch ? 'watch' : 'build',
      '--config', options.configFile || './config/dev.json',
      '--use', 'lumbar-long-expires',
      '--use', 'lumbar-tester',
      '--with', '{"includeTests": ' + !options.removeTests + '}',
      '--use', 'lumbar-style-doc',
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
    complete || growl('Lumbar Borked', { title: 'Lumbar Borked', sticky: true });

    complete && complete(code);
  });
  return lumbar;
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
task('release', [], function(prefix, package) {
  prefix = prefix || 'phoenix';

  exports.build({
    dir: 'build/' + prefix,
    package: package,
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

