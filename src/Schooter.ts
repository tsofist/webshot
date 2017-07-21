import { tmpdir } from "os";
import { resolve as resolvePath } from "path";
import { createReadStream } from "fs";
import { ChildProcess, spawn } from "child_process";
import { Stream } from "stream";
import * as defaultElectronPath from "electron";
import { ShooterOptions, ShotFormat, Shooter } from "./typings";
import { deepMixin, TS_STRING } from "./util";
import createIPCChannel, { Interaction } from "./interaction-channel";

export {
    ShooterImpl as default
};

const DEF_SHOOTER_OPTIONS: ShooterOptions = {
    paths:      {},
    switches:   {}
};

const
    ipcServerPath = resolvePath(__dirname, "ipc-server.js");

class ShooterImpl implements Shooter {
    private child?: Interaction;
    private proc?: ChildProcess;

    public static startup(options: ShooterOptions = {},
                          environment: Object&object = {}): Promise<Shooter> {
        return new Promise((resolve, reject) => {
            const
                shooter = new ShooterImpl(options, environment),
                onOnline = (): void => {
                    shooter.proc!.removeListener("error", onError);
                    resolve(shooter);
                },
                onError = (error: any): void => {
                    shooter.proc!.removeListener("online", onOnline);
                    reject(error);
                };
            shooter.proc!
                .once("error", onError);
            setImmediate(() => {
                if (shooter.proc && shooter.proc.connected && shooter.child) {
                    shooter.child.once("ready", onOnline);
                } else
                    onError(new Error("Child process not started"));
            });
        });
    }

    // noinspection JSUnusedLocalSymbols
    private constructor(options: ShooterOptions = {},
                        environment: Object&object = {}) {
        const
            proc = this.proc = spawn(
                defaultElectronPath as any,
                [ipcServerPath].concat(JSON.stringify(deepMixin({}, DEF_SHOOTER_OPTIONS, options))),
                {
                    stdio: [null, null, null, "ipc"],
                    env:   deepMixin({}, process.env, environment)
                }
            );

        // todo debug
        // ---
        // proc.stdout.on("data", (data: any) => {
        //     console.log(`[${proc.pid}]`, data + "");
        // });
        // proc.stderr.on("data", (data: any) => {
        //     console.error(`[${proc.pid}]`, data + "");
        // });
        // ---

        proc.once("close", () => {
            this.proc = this.child = undefined;
        });

        const child = this.child = createIPCChannel(proc);

        // todo UE
        child.on("uncaughtException", (stack?: string) => {
            //todo restart proc?
            //tslint:disable-next-line:no-console
            console.error("webshot detect uncaughtException in ipc-server. This can be detrimental.");
            //tslint:disable-next-line:no-console
            if (stack) console.error("\n\t" + stack.replace(/\n/g, "\n\t"));
        });
    }

    public shutdown(): Promise<void> {
        return this
            .invokeChild("shutdown")
            .then<void>(() => {
                if (!this.proc!.connected) return;
                return new Promise<void>((resolve) => {
                    this.proc!.once("close", () => { resolve(); });
                });
            });
    }

    public halt(): void {
        if (this.proc) this.proc.kill("SIGKILL");
    }

    public shotHTML(format: ShotFormat, source: string, to?: string|NodeJS.WritableStream): Promise<any> {
        return this.shot("html", format, source, to);
    }

    public shotURL(format: ShotFormat, source: string, to?: string|NodeJS.WritableStream): Promise<any> {
        return this.shot("url", format, source, to);
    }

    private shot(sourceFormat: "html"|"url",
                 format: ShotFormat,
                 source: string,
                 to?: string|NodeJS.WritableStream): Promise<any> {
        const
            toIsString = typeof to === TS_STRING,
            filename = (to ? ((toIsString && to) || (to instanceof Stream && `${ tmpdir() }/webshot-${ Math.random() }`)) : false) || undefined;
        return this.invokeChild(
            "shot",
            {
                filename,
                [sourceFormat === "url"
                    ? "sourceUrl"
                    : "sourceHTML"]: source,
                format
            }
        ).then((data) => {
            if (!to)
                return Buffer.from(data, "binary");
            else if (toIsString)
                return data;
            else
                return new Promise((resolve, reject) => {
                    (to as NodeJS.WritableStream)
                        .once("error", reject)
                        .once("finish", () => {
                            resolve(to);
                        });
                    createReadStream(data)
                        .once("error", reject)
                        .pipe(to as NodeJS.WritableStream);
                });
        });
    }

    private invokeChild(method: string, ...args: any[]): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!this.child || !this.proc) reject(new Error("Shooter has stopped")); else this
                .child
                .invoke
                .call(this.child, method, ...args, (error: any, data: string) => {
                    if (error) reject(error); else
                        resolve(data);
                });
        });
    }
}