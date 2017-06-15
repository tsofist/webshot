"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const path_1 = require("path");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const stream_1 = require("stream");
const defaultElectronPath = require("electron");
const util_1 = require("./util");
const interaction_channel_1 = require("./interaction-channel");
const DEF_SHOOTER_OPTIONS = {
    paths: {},
    switches: {},
    loadTimeout: 30 * 60 * 1000 //30sec
};
const ipcServerPath = path_1.resolve(__dirname, "ipc-server.js");
class ShooterImpl {
    static startup(options = {}, environment = {}) {
        return new Promise((resolve, reject) => {
            const shooter = new ShooterImpl(options, environment), onOnline = () => {
                shooter.proc.removeListener("error", onError);
                resolve(shooter);
            }, onError = (error) => {
                shooter.proc.removeListener("online", onOnline);
                reject(error);
            };
            shooter.proc
                .once("error", onError);
            setImmediate(() => {
                if (shooter.proc.connected)
                    onOnline();
                else
                    onError(new Error("Child process not started"));
            });
        });
    }
    constructor(options = {}, environment = {}) {
        const proc = this.proc = child_process_1.spawn(defaultElectronPath, [ipcServerPath].concat(JSON.stringify(util_1.deepMixin({}, DEF_SHOOTER_OPTIONS, options))), {
            stdio: [null, null, null, "ipc"],
            env: util_1.deepMixin({}, process.env, environment)
        });
        // todo debug
        // ---
        // proc.stdout.on("data", (data: any) => {
        //     console.log(`[${proc.pid}]`, data + "");
        // });
        // proc.stderr.on("data", (data: any) => {
        //     console.error(`[${proc.pid}]`, data + "");
        // });
        // proc.once("close", () => {
        //     console.log(`[${proc.pid}]`, "closed");
        // });
        // ---
        const child = this.child = interaction_channel_1.default(proc);
        // todo UE
        child.on("uncaughtException", (stack) => {
            //todo restart proc?
            //tslint:disable-next-line:no-console
            console.error("webshot detect uncaughtException in ipc-server. This can be detrimental.");
            //tslint:disable-next-line:no-console
            if (stack)
                console.error("\n\t" + stack.replace(/\n/g, "\n\t"));
        });
    }
    shutdown() {
        return this
            .invokeChild("shutdown")
            .then(() => {
            if (!this.proc.connected)
                return;
            return new Promise((resolve) => {
                this.proc.once("close", () => { resolve(); });
            });
        });
    }
    halt() {
        this.proc.kill("SIGKILL");
    }
    shotHTML(format, source, to) {
        return this.shot("html", format, source, to);
    }
    shotURL(format, source, to) {
        return this.shot("url", format, source, to);
    }
    shot(sourceFormat, format, source, to) {
        const typeOfTo = typeof to, toIsString = typeOfTo === util_1.TS_STRING;
        return this.invokeChild("shot", {
            filename: (to ? ((toIsString && to) || (to instanceof stream_1.Stream && (to = `${os_1.tmpdir()}/webshot-${Math.random()}`))) : false) || undefined,
            [sourceFormat === "url"
                ? "sourceUrl"
                : "sourceHTML"]: source,
            format
        }).then((data) => {
            if (!to)
                return Buffer.from(data, "binary");
            else if (toIsString)
                return data;
            else
                return new Promise((resolve, reject) => {
                    to
                        .once("error", reject)
                        .once("finish", () => {
                        resolve(to);
                    });
                    fs_1.createReadStream(data)
                        .once("error", reject)
                        .pipe(to);
                });
        });
    }
    invokeChild(method, ...args) {
        return new Promise((resolve, reject) => {
            this.child.invoke.call(this.child, method, ...args, (error, data) => {
                if (error)
                    reject(error);
                else
                    resolve(data);
            });
        });
    }
}
exports.default = ShooterImpl;
