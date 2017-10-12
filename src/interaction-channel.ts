import { EventEmitter } from "events";
import { ChildProcess } from "child_process";
import { sliced } from "./util";

export {
    Interaction,
    createIPCChannel as default
};

interface Interaction {
    emit(event: string, ...data: any[]): this;
    on(event: string, listener: (...data: any[]) => void): this;
    once(event: string, listener: (...data: any[]) => void): this;
    removeAllListeners(event?: string): this;
    invoke(method: string, callback: (error: Error, data: any) => void): this;
    invoke(method: string, option1: Object, callback: (error: Error, data: any) => void): this;
    invoke(method: string, option1: Object, option2: Object, callback: (error: Error, data: any) => void): this;
    respondTo(method: string, responder: Function): this;
}

const selfInstance = Symbol();

function createIPCChannel(process: ChildProcess|NodeJS.Process): Interaction {
    if (selfInstance in process)
        return (process as any)[selfInstance];

    const emitter: Interaction = (process as any)[selfInstance] = new EventEmitter() as any;
    if (!process.send)
        return emitter;

    const
        emit = emitter.emit,
        responders: { [key: string]: Function } = {};
    let callId = 0;

    (process as ChildProcess).on("message", function (data: any) {
        emit.apply(emitter, sliced(data));
    });

    emitter.emit = function () {
        if (process.connected)
            (process as ChildProcess).send(sliced(arguments));
        return this;
    };

    emitter.invoke = function (name: string) {
        const args = sliced(arguments, 1);
        let callback: any = args.pop();
        if (typeof callback !== "function") {
            args.push(callback);
            callback = undefined;
        }

        const id = callId++;
        let progress: Interaction|undefined = new EventEmitter() as any;

        emitter.on(`IVK_DATA_${id}`, function () {
            progress!.emit.apply(progress, ["data"].concat(sliced(arguments)));
        });

        emitter.once(`IVK_RESULT_${id}`, function () {
            const resultArgs = sliced(arguments);
            progress!.emit.apply(progress, ["end"].concat(resultArgs));
            emitter.removeAllListeners(`IVK_DATA_${id}`);
            progress!.removeAllListeners();
            progress = undefined;
            if (callback) {
                callback.apply(null, resultArgs);
            }
        });

        emitter.emit.apply(emitter, ["INVOKE", id, name].concat(args));
        return progress!;
    };

    emitter.respondTo = function (name: string, responder: Function) {
        responders[name] = responder;
        return this;
    };

    emitter.on("INVOKE", function (id, name) {
        const responder = responders[name];
        const done: any = function () {
            emitter.emit.apply(emitter, [`IVK_RESULT_${id}`].concat(sliced(arguments)));
        };
        done.progress = function () {
            emitter.emit.apply(emitter, [`IVK_DATA_${id}`].concat(sliced(arguments)));
        };
        if (!responder)
            return done(`Nothing responds to "${name}"`);
        try {
            responder.apply(null, sliced(arguments, 2).concat([done]));
        } catch (error) {
            done(error);
        }
    });

    return emitter;
}