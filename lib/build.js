var child_process = require('child_process'),
    growl = require('growl'),
    util = require('./util'),
      mkdir = util.mkdir,
      streamData = util.streamData;

exports.build = function(options) {
  var complete = options.complete,
      compiled = options.compiled;

  mkdir(options.dir);

  var args = [
    __dirname + '/../node_modules/lumbar/bin/lumbar',
    options.watch ? 'watch' : 'build',
    '--verbose',
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
    args.push('--sourceMap' + (options.sourceMap !== true ? '=' + options.sourceMap : ''));
  }
  if (options.server) {
    args.push('--use');
    args.push('server-scripts');
  }

  var lumbar = child_process.spawn('node', args, {stdio: ['ignore', null, 2]});
  lumbar.stdout.on('data', function (data) {
    /*jshint boss: true */
    if (compiled) {
      var re = /compiled.*\/(.*)\.js/g,
          lines = data.toString(),
          match;
      while (match = re.exec(lines)) {
        compiled(match[1]);
      }
    }

    streamData('lumbar: ', data);
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
