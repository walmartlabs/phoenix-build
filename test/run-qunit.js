/*jshint evil: true*/
/*global phantom, WebPage */
/**
 * Wait until the test condition is true or a timeout occurs. Useful for waiting
 * on a server response or for a ui change (fadeIn, etc.) to occur.
 *
 * @param testFx javascript condition that evaluates to a boolean,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param onReady what to do when testFx condition is fulfilled,
 * it can be passed in as a string (e.g.: "1 == 1" or "$('#bar').is(':visible')" or
 * as a callback function.
 * @param timeOutMillis the max amount of time to wait. If not specified, 3 sec is used.
 */
function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 15001, //< Default Max Timout is 15s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 100); //< repeat check every 250ms
}


if (phantom.args.length === 0 || phantom.args.length > 3) {
    console.log('Usage: run-qunit.js URL [userAgent]');
    phantom.exit();
}

var userAgent = phantom.args[1] || 'Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3';

var page = new WebPage();
page.settings = {
    javascriptEnabled: true,
    loadImages: true,
    webSecurityEnabled: true,
    userAgent: userAgent
};

page.onError = function (msg, trace) {
    console.log(msg);
    trace.forEach(function(item) {
        console.log('  ', item.file, ':', item.line);
    });
};

// Route "console.log()" calls from within the Page context to the main Phantom context (i.e. current "this")
page.onConsoleMessage = function(msg) {
    console.log(msg);
};

page.open(phantom.args[0], function(status){
    if (status !== "success") {
        console.log("Unable to access network");
        phantom.exit();
    } else {
        waitFor(function(){
            return page.evaluate(function(){
                var el = document.getElementById('qunit-testresult');
                if (el && el.innerText.match('completed')) {
                    var el = document.getElementById('phoenix-modules-loaded');
                    if (el && el.innerText.match('modules loaded')) {
                        return true;
                    }
                }
                return false;
            });
        }, function(){
            var failedNum = page.evaluate(function(){
                var failed = document.querySelectorAll('#qunit-tests > .fail');
                for (var i = 0, len = failed.length; i < len; i++) {
                  var el = failed[i];

                  var name = el.getElementsByTagName('strong')[0],
                      msg = [name.innerText];

                  Array.prototype.forEach.call(el.querySelectorAll('.fail'), function(el) {
                    var name = el.querySelector('.test-message'),
                        table = el.getElementsByTagName('table')[0];
                    if (!name || !table) {
                        msg.push('  ' + el.innerText);
                    } else {
                        msg.push('  ' + name.innerText + '\n' + table.innerText.replace(/^/gm, '    '));
                    }
                  });

                  console.log('failed: ' + msg.join('\n'));
                }

                var el = document.getElementById('qunit-testresult');
                console.log(el.innerText);
                try {
                    return el.getElementsByClassName('failed')[0].innerHTML;
                } catch (e) { }
                return 10000;
            });
            phantom.exit((parseInt(failedNum, 10) > 0) ? 1 : 0);
        });
    }
});
