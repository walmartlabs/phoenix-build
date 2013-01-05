var child_process = require('child_process'),
    growl = require('growl'),
    util = require('./util');

var serverConfig;

exports.config = function() {
  return serverConfig;
};
exports.start = function(options) {
  var test = !!options.test,
      onData = options.data,
      complete = options.complete;

  if (options.mocks) {
    process.env.ENABLE_MOCKS = options.mocks;
  }
  serverConfig = {
    port: options.port || 8080,
    securePort: options.securePort || 8081,
    forceCORS: options.forceCORS
  };

  var args = [
    __dirname + '/../node_modules/mock-server/bin/mock-server',
    options.projectDir,
    '--proxy-server=' + options.proxy,
    '--port=' + serverConfig.port,
    '--secure-port=' + serverConfig.securePort
  ];
  if (options.forceCORS) {
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
      util.streamData((test ? '  ' : '') + 'server: ', data);
    }
  });
  server.stderr.on('data', function (data) {
    if (onData) {
      onData(data);
    }
    util.streamData((test ? '  ' : '') + 'server: ', data);
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
