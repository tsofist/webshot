"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const util_1 = require("./util");
const selfInstance = Symbol();
function createIPCChannel(process) {
    if (selfInstance in process)
        return process[selfInstance];
    const emitter = process[selfInstance] = new events_1.EventEmitter();
    if (!process.send)
        return emitter;
    const emit = emitter.emit, responders = {};
    let callId = 0;
    process.on("message", function (data) {
        emit.apply(emitter, util_1.sliced(data));
    });
    emitter.emit = function () {
        if (process.connected)
            process.send(util_1.sliced(arguments));
        return this;
    };
    emitter.invoke = function (name) {
        const args = util_1.sliced(arguments, 1);
        let callback = args.pop();
        if (typeof callback !== "function") {
            args.push(callback);
            callback = undefined;
        }
        const id = callId++;
        let progress = new events_1.EventEmitter();
        emitter.on(`IVK_DATA_${id}`, function () {
            progress.emit.apply(progress, ["data"].concat(util_1.sliced(arguments)));
        });
        emitter.once(`IVK_RESULT_${id}`, function () {
            const resultArgs = util_1.sliced(arguments);
            progress.emit.apply(progress, ["end"].concat(resultArgs));
            emitter.removeAllListeners(`IVK_DATA_${id}`);
            progress.removeAllListeners();
            progress = undefined;
            if (callback) {
                callback.apply(null, resultArgs);
            }
        });
        emitter.emit.apply(emitter, ["INVOKE", id, name].concat(args));
        return progress;
    };
    emitter.respondTo = function (name, responder) {
        responders[name] = responder;
        return this;
    };
    emitter.on("INVOKE", function (id, name) {
        const responder = responders[name];
        const done = function () {
            emitter.emit.apply(emitter, [`IVK_RESULT_${id}`].concat(util_1.sliced(arguments)));
        };
        done.progress = function () {
            emitter.emit.apply(emitter, [`IVK_DATA_${id}`].concat(util_1.sliced(arguments)));
        };
        if (!responder)
            return done(`Nothing responds to "${name}"`);
        try {
            responder.apply(null, util_1.sliced(arguments, 2).concat([done]));
        }
        catch (error) {
            done(error);
        }
    });
    return emitter;
}
exports.default = createIPCChannel;
