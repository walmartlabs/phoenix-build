/*global Loader, LocalCache, Mocha, lumbarLoadPrefix, chai, mocha, mochaPhantomJS, sinon, qunitShim */
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
});
afterEach(function() {
  this.clock && this.clock.tick(1000);
  this.sandbox.verifyAndRestore();

  Phoenix.setView = this._setView;
  LocalCache.reset(true);
});

var _failHook = Mocha.Runner.prototype.failHook;
Mocha.Runner.prototype.failHook = function() {
  if (console.log.restore) {
    console.log.restore();
  }
  if (console.error.restore) {
    console.error.restore();
  }
  return _failHook.apply(this, arguments);
};

// Create the qunit-style fixure
var fixture;
beforeEach(function() {
  fixture = document.getElementById('qunit-fixture').innerHTML || '';
});
afterEach(function() {
  (document.getElementById('qunit-fixture') || {}).innerHTML = fixture;
});

if (typeof qunitShim !== 'undefined') {
  qunitShim();
}

var execModule = Mocha.utils.parseQuery(window.location.search || '').module;
function runModule(name) {
  return !execModule || execModule === name;
}

// Register the init logic
Loader.loader.loadComplete = function(moduleName) {
  // Prevent exec when not in test mode or after already executed
  if (moduleName !== 'base' || !window.phoenixTest) {
    return;
  }

  if (window.Backbone) {
    var fragment = '';
    Backbone.history.options = { root: '/' };

    var $getFragment = Backbone.History.prototype.getFragment;
    Backbone.History.prototype.getFragment = function(_fragment) {
      if (_fragment) {
        return $getFragment.apply(this, arguments);
      } else {
        return fragment;
      }
    };
    Backbone.History.prototype.navigate = function(_fragment) { fragment = _fragment; };
  }

  // Force setTimeout via indirect call for nextTick to allow for stubbing.
  if (typeof nextTick !== 'undefined') {
    nextTick = function() {
      return setTimeout.call(this, arguments);
    };
  }

  if (runModule('loader') && Loader.tests) {
    Loader.tests();
  }

  if (runModule('base') && Phoenix.tests) {
    Phoenix.tests();
  }

  function run() {
    (document.getElementById('mocha-stats') || {}).innerHTML = expected + ' modules loaded<br>Version: ' + lumbarLoadPrefix;
    if (window.mochaPhantomJS) {
      mochaPhantomJS.run();
    } else {
      sauceHelper(mocha.run());
    }
  }

  var modules = _.filter(_.keys(Loader.loader.modules || {}), function(module) { return runModule(module); }),
      expected = modules.length,
      count = 0;
  if (expected === count) {
    expected++;

    // Run any modules that may have been inlined if we are in combined mode
    _.each(Phoenix, function(obj, name) {
      if (obj.tests) {
        obj.tests();
      }
    });

    run();
  }
  _.each(modules, function(name) {
    if (name === 'style-doc') {
      // Ignore style-doc!
      if (++count >= expected) {
        run();
      }
      return;
    }

    Loader.loader.loadModule(name, function() {
      if (runModule(name) && Phoenix[name] && Phoenix[name].tests) {
        Phoenix[name].tests();
      }
      if (++count >= expected) {
        run();
      }
    });
  });
};
