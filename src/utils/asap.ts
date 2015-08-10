/*

ASAP
https://github.com/kriskowal/asap

*/

/// <reference path="../../typings/node/node.d.ts" />

export interface Domain {
    active: Domain;
}

export interface Task {
    (): void;
}

export interface RawTask {
    task: Task;
    domain: Domain;
}

export interface RequestFlush {
    (): void;
}

export interface ASAP {
    (task: Task): void;
    onerror: (error: any) => void;
}

export interface RawASAP {
    (task: RawTask): void;
    requestFlush: RequestFlush;
    makeRequestCallFromTimer: (callback: any) => () => void;
}

export var asap: ASAP;

if (
    typeof process === 'object' &&
    process.toString() === "[object process]" &&
    process.nextTick
) {
    // Node.js
    asap = getNodeASAP();
} else {
    asap = getBrowserASAP();
}

function getNodeASAP(): ASAP {
    // raw.js
    
    var domain: Domain;
    var hasSetImmediate = typeof setImmediate === "function";
    
    var rawAsap: RawASAP = <any>function (task: Task) {
        if (!queue.length) {
            requestFlush();
            flushing = true;
        }
        queue[queue.length] = task;
    };
    
    var queue: Task[] = [];
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
        var parentDomain = (<any>process).domain;
        if (parentDomain) {
            if (!domain) {
                domain = require("domain");
            }
            domain.active = (<any>process).domain = null;
        }
    
        if (flushing && hasSetImmediate) {
            setImmediate(flush);
        } else {
            process.nextTick(flush);
        }
    
        if (parentDomain) {
            domain.active = (<any>process).domain = parentDomain;
        }
    }
    
    // asap.js
    
    var freeTasks: RawTask[] = [];
    
    var asap: ASAP = <any>function (task: Task) {
        var rawTask: RawTask;
        if (freeTasks.length) {
            rawTask = freeTasks.pop();
        } else {
            rawTask = new RawTask();
        }
        rawTask.task = task;
        rawTask.domain = (<any>process).domain;
        rawAsap(rawTask);
    };
    
    var RawTask: {
        new (): RawTask;
    } = <any>function () {
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
        } finally {
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

function getBrowserASAP(): ASAP {
    // browser-raw.js
    
    var rawAsap: RawASAP = <any>function (task: Task) {
        if (!queue.length) {
            requestFlush();
            flushing = true;
        }
        queue[queue.length] = task;
    };
    
    var queue: Task[] = [];
    var flushing = false;
    var requestFlush: RequestFlush;
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
    
    var BrowserMutationObserver: typeof MutationObserver = (<any>global).MutationObserver || (<any>global).WebKitMutationObserver;
    
    if (typeof BrowserMutationObserver === "function") {
        requestFlush = makeRequestCallFromMutationObserver(flush);
    } else {
        requestFlush = makeRequestCallFromTimer(flush);
    }
    
    rawAsap.requestFlush = requestFlush;
    
    function makeRequestCallFromMutationObserver(callback: () => void) {
        var toggle = 1;
        var observer = new BrowserMutationObserver(callback);
        var node = document.createTextNode("");
        observer.observe(node, {characterData: true});
        return function requestCall() {
            toggle = -toggle;
            node.data = <any>toggle;
        };
    }
    
    function makeRequestCallFromTimer(callback: () => void) {
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
    
    var freeTasks: RawTask[] = [];
    var pendingErrors: any[] = [];
    var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);
    
    function throwFirstError() {
        if (pendingErrors.length) {
            throw pendingErrors.shift();
        }
    }
    
    var asap: ASAP = <any>function (task: Task) {
        var rawTask: RawTask;
        if (freeTasks.length) {
            rawTask = freeTasks.pop();
        } else {
            rawTask = new RawTask();
        }
        rawTask.task = task;
        rawAsap(rawTask);
    };
    
    var RawTask: {
        new (): RawTask;
    } = <any>function () {
        this.task = null;
    };
    
    RawTask.prototype.call = function () {
        try {
            this.task.call();
        } catch (error) {
            if (asap.onerror) {
                asap.onerror(error);
            } else {
                pendingErrors.push(error);
                requestErrorThrow();
            }
        } finally {
            this.task = null;
            freeTasks[freeTasks.length] = this;
        }
    };
    
    return asap;
}
