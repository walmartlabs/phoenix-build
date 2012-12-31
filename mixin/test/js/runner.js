/*global Loader, LocalCache, lumbarLoadPrefix, chai, mocha, mochaPhantomJS */
mocha.setup({
  ui: 'bdd',
  ignoreLeaks: true
});

window.expect = chai.expect;

chai.Assertion.includeStack = true;

sinon.config = {
  injectIntoThis: true,
  injectInto: null,
  properties: ['spy', 'stub', 'mock', 'clock', 'sandbox', 'server', 'requests', 'on'],
  useFakeTimers: [10],
  useFakeServer: true
};

beforeEach(function() {
  var config = sinon.getConfig(sinon.config);
  config.injectInto = this;
  this.sandbox = sinon.sandbox.create(config);

  // Mocking manually to ease the cases where we do want to mock this
  this._setView = Phoenix.setView;
  Phoenix.setView = function() { throw new Error('setView called without stub'); };

  if (!console._log) {
    _.each(['log', 'warn', 'error'], function(name) {
      console['_' + name] = console[name];
      console[name] = function() {
        throw new Error('console.' + name + ': ' + _.toArray(arguments).join(' '));
      }
    });
  }
});
afterEach(function() {
  this.clock.tick(1000);
  this.sandbox.verifyAndRestore();

  Phoenix.setView = this._setView;
  LocalCache.reset(true);
});

if (typeof qunitShim !== 'undefined') {
  qunitShim();
}

// Register the init logic
Loader.loader.loadComplete = function(moduleName) {
  // Prevent exec when not in test mode or after already executed
  if (moduleName !== 'base' || !window.phoenixTest) {
    return;
  }

  var fragment = '';
  Backbone.history.options = { root: '/' };
  Backbone.History.prototype.getFragment = function() { return fragment; };
  Backbone.History.prototype.navigate = function(_fragment) { fragment = _fragment; };

  if (Loader.tests) {
    Loader.tests();
  }

  if (Phoenix.tests) {
    Phoenix.tests();
  }

  function run() {
    $('#mocha-stats').html(expected + ' modules loaded<br>Version: ' + lumbarLoadPrefix);
    if (window.mochaPhantomJS) {
      mochaPhantomJS.run();
    } else {
      mocha.run();
    }
  }

  var expected = _.keys(Loader.loader.modules || {}).length,
      count = 0;
  if (expected === count) {
    expected++;
    run();
  }
  _.each(Loader.loader.modules, function(module, name) {
    if (name === 'style-doc') {
      // Ignore style-doc!
      count++;
      return;
    }

    Loader.loader.loadModule(name, function() {
      if (Phoenix[name] && Phoenix[name].tests) {
        Phoenix[name].tests();
      }
      if (++count >= expected) {
        run();
      }
    });
  });
};
