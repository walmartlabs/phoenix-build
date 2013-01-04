var child_process = require('child_process'),
    growl = require('growl'),
    util = require('./util'),
      mkdir = util.mkdir,
      streamData = util.streamData;

exports.build = function(options) {
  var complete = options.complete;

  mkdir(options.dir);

  var args = [
    __dirname + '/../node_modules/lumbar/bin/lumbar',
    options.watch ? 'watch' : 'build',
    '--config', options.configFile || './config/dev.json',
    '--use', __dirname + '/../node_modules/lumbar-long-expires',
    '--use', __dirname + '/../node_modules/lumbar-tester',
    '--with', '{"includeTests": ' + !options.removeTests + '}',
    '--use', __dirname + '/../node_modules/lumbar-style-doc',
    '--with', '{"removeDocs": ' + !!options.removeTests + '}',
    '--use', 'conditional',
    '--with', '{"env": "' + (options.minimize ? 'production' : 'dev') + '"}',
    options.lumbarFile || './lumbar.json',
    (options.dir || '.')
  ];
  if (options.package) {
    args.push('--package');
    args.push(options.package);
  }
  if (options.minimize) {
    args.push('--minimize');
  }
  if (options.sourceMap) {
    args.push('--sourceMap');
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
