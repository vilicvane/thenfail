/*

ASAP
https://github.com/kriskowal/asap

*/
(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    /// <reference path="../../typings/node/node.d.ts" />
    exports.asap;
    if (typeof process === 'object' &&
        process.toString() === '[object process]' &&
        process.nextTick) {
        // Node.js
        exports.asap = getNodeASAP();
    }
    else {
        exports.asap = getBrowserASAP();
    }
    function getNodeASAP() {
        // raw.js
        var domain;
        var hasSetImmediate = typeof setImmediate === 'function';
        var rawAsap = function (task) {
            if (!queue.length) {
                requestFlush();
                flushing = true;
            }
            queue[queue.length] = task;
        };
        var queue = [];
        var flushing = false;
        var index = 0;
        var capacity = 1024;
        function flush() {
            while (index < queue.length) {
                var currentIndex = index;
                index = index + 1;
                queue[currentIndex].call(undefined);
                if (index > capacity) {
                    for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                        queue[scan] = queue[scan + index];
                    }
                    queue.length -= index;
                    index = 0;
                }
            }
            queue.length = 0;
            index = 0;
            flushing = false;
        }
        rawAsap.requestFlush = requestFlush;
        function requestFlush() {
            var parentDomain = process.domain;
            if (parentDomain) {
                if (!domain) {
                    domain = require('domain');
                }
                domain.active = process.domain = null;
            }
            if (flushing && hasSetImmediate) {
                setImmediate(flush);
            }
            else {
                process.nextTick(flush);
            }
            if (parentDomain) {
                domain.active = process.domain = parentDomain;
            }
        }
        // asap.js
        var freeTasks = [];
        var asap = function (task) {
            var rawTask;
            if (freeTasks.length) {
                rawTask = freeTasks.pop();
            }
            else {
                rawTask = new RawTask();
            }
            rawTask.task = task;
            rawTask.domain = process.domain;
            rawAsap(rawTask);
        };
        var RawTask = function () {
            this.task = null;
            this.domain = null;
        };
        RawTask.prototype.call = function () {
            if (this.domain) {
                this.domain.enter();
            }
            var threw = true;
            try {
                this.task.call();
                threw = false;
                if (this.domain) {
                    this.domain.exit();
                }
            }
            finally {
                if (threw) {
                    rawAsap.requestFlush();
                }
                this.task = null;
                this.domain = null;
                freeTasks.push(this);
            }
        };
        return asap;
    }
    function getBrowserASAP() {
        // browser-raw.js
        var rawAsap = function (task) {
            if (!queue.length) {
                requestFlush();
                flushing = true;
            }
            queue[queue.length] = task;
        };
        var queue = [];
        var flushing = false;
        var requestFlush;
        var index = 0;
        var capacity = 1024;
        function flush() {
            while (index < queue.length) {
                var currentIndex = index;
                index = index + 1;
                queue[currentIndex].call(undefined);
                if (index > capacity) {
                    for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                        queue[scan] = queue[scan + index];
                    }
                    queue.length -= index;
                    index = 0;
                }
            }
            queue.length = 0;
            index = 0;
            flushing = false;
        }
        var BrowserMutationObserver = global.MutationObserver || global.WebKitMutationObserver;
        if (typeof BrowserMutationObserver === 'function') {
            requestFlush = makeRequestCallFromMutationObserver(flush);
        }
        else {
            requestFlush = makeRequestCallFromTimer(flush);
        }
        rawAsap.requestFlush = requestFlush;
        function makeRequestCallFromMutationObserver(callback) {
            var toggle = 1;
            var observer = new BrowserMutationObserver(callback);
            var node = document.createTextNode('');
            observer.observe(node, { characterData: true });
            return function requestCall() {
                toggle = -toggle;
                node.data = toggle;
            };
        }
        function makeRequestCallFromTimer(callback) {
            return function requestCall() {
                var timeoutHandle = setTimeout(handleTimer, 0);
                var intervalHandle = setInterval(handleTimer, 50);
                function handleTimer() {
                    clearTimeout(timeoutHandle);
                    clearInterval(intervalHandle);
                    callback();
                }
            };
        }
        rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;
        // browser-asap.js
        var freeTasks = [];
        var pendingErrors = [];
        var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);
        function throwFirstError() {
            if (pendingErrors.length) {
                throw pendingErrors.shift();
            }
        }
        var asap = function (task) {
            var rawTask;
            if (freeTasks.length) {
                rawTask = freeTasks.pop();
            }
            else {
                rawTask = new RawTask();
            }
            rawTask.task = task;
            rawAsap(rawTask);
        };
        var RawTask = function () {
            this.task = null;
        };
        RawTask.prototype.call = function () {
            try {
                this.task.call();
            }
            catch (error) {
                if (asap.onerror) {
                    asap.onerror(error);
                }
                else {
                    pendingErrors.push(error);
                    requestErrorThrow();
                }
            }
            finally {
                this.task = null;
                freeTasks[freeTasks.length] = this;
            }
        };
        return asap;
    }
});
//# sourceMappingURL=asap.js.map