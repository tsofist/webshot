import * as electron from "electron";
import { writeFile } from "fs";
import makeIPCChannel from "./interaction-channel";
import { TS_FUNCTION, vIn, noop, deepMixin } from "./util";
import { PromiseMay, ShotFormat, ShooterOptions } from "./typings";

type BrowserWindow = Electron.BrowserWindow;

const
    electronApp = electron.app,
    parent = makeIPCChannel(process);

(() => {
    const
        processArgs: ShooterOptions = JSON.parse(process.argv[2]),
        paths = processArgs.paths,
        switches = processArgs.switches;

    if (paths) for (const i in paths)
        electronApp.setPath(i, paths[i]);
    if (switches) for (const i in switches)
        electronApp.commandLine.appendSwitch(i, switches[i]);

    if (electronApp.dock)
        electronApp.dock.hide();
})();

process.on("uncaughtException", (error) => {
    parent.emit("uncaughtException", error.stack);
});

process.on("SIGINT", noop);

electronApp.on("ready", () => {
    parent.emit("ready", {
        electron: process.versions["electron"],
        chrome:   process.versions["chrome"]
    });
});

let shutdownInitiated = false;

electronApp.on("before-quit", (event) => {
    if (!shutdownInitiated)
        event.preventDefault();
});

parent.respondTo("shutdown", (done: (error?: any, result?: string|Buffer) => void) => {
    shutdownInitiated = true;
    electronApp.quit();
    process.nextTick(() => {
        done();
    });
});

interface ShotOptions {
    sourceUrl?: string;
    sourceHTML?: string;
    filename?: string;
    format: ShotFormat;
}

const SUP_FMT_TYPES = ["pdf", "png", "jpeg"];

function useBrowserWindow<T>(url: string,
                             onBrowserWindow: (win: BrowserWindow) => PromiseMay<T>,
                             options: Partial<Electron.BrowserWindowConstructorOptions>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        let win: BrowserWindow|undefined = new electron.BrowserWindow(deepMixin({
            show:                   false,
            alwaysOnTop:            false,
            useContentSize:         false,
            enableLargerThanScreen: true,
            thickFrame:             false,
            titleBarStyle:          "hidden",
            webPreferences:         {
                nodeIntegration:             false,
                javascript:                  false,
                allowRunningInsecureContent: true,
                webgl:                       false,
                webaudio:                    false,
                defaultEncoding:             "utf8"
            }
        }, options));
        const
            dispose = (): void => {
                if (win) win.close();
                win = undefined;
            },
            onError = (error: any): void => {
                dispose();
                reject(error);
            };
        try {
            win.webContents.setAudioMuted(true);
            win.webContents
               .once("did-fail-load", () => onError(new Error(`Failed to load ${url}`)))
               .once("did-finish-load", () => {
                   try {
                       const promiseMay = onBrowserWindow(win!);
                       if (promiseMay && typeof (promiseMay as Promise<T>).then === TS_FUNCTION) {
                           (promiseMay as Promise<T>).then(
                               (data) => {
                                   dispose();
                                   resolve(data);
                               },
                               onError
                           );
                       } else {
                           dispose();
                           resolve(promiseMay);
                       }
                   } catch (error) {
                       onError(error);
                   }
               });
            win.loadURL(url, { /*todo?*/ });
        } catch (error) {
            onError(error);
        }
    });
}

function doCapture(win: BrowserWindow, options: ShotOptions): Promise<string|Buffer> {
    return (options.sourceHTML
            ? (win.webContents
                  .executeJavaScript(`document.documentElement.innerHTML=decodeURIComponent("${ encodeURIComponent(options.sourceHTML) }");`))
            : Promise.resolve()
    ).then(() => new Promise<string|Buffer>((resolve, reject) => {
        const
            done = (data: string|Buffer) => {
                if (options.filename) writeFile(options.filename, data, (error) => {
                    if (error) reject(error); else
                        resolve(options.filename);
                }); else
                    resolve(data);
            },
            capturePage = () => {
                win.capturePage((image) => {
                    let data: Buffer|undefined;
                    switch (options.format.type) {
                        case "png":
                            data = image.toPNG(options.format);
                            break;
                        case "jpeg":
                            data = image.toJPEG(options.format.quality || 75);
                            break;
                    }
                    done(data!);
                });
            };
        if (options.format.type === "pdf") {
            win.webContents
               .printToPDF(options.format as any, (error, data) => {
                   if (error) reject(error); else
                       done(data);
               });
        } else if (!options.format.size || options.format.size === "auto") {
            win.webContents
               .executeJavaScript(`(Promise.resolve({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))`)
               .then((winSize: { width: number; height: number; }) => {
                   win.once("resize", () => {
                       setTimeout(() => {
                           capturePage();
                       }, 0/*todo?*/);
                   });
                   win.setSize(winSize.width, winSize.height, false);
               })
               .catch(reject);
        } else {
            capturePage();
        }
    }));
}

parent.respondTo(
    "shot",
    (options: ShotOptions, done: (error: any, result?: string|Buffer) => void) => {
        //todo check format options
        if ((options.sourceUrl && options.sourceHTML) || !(options.sourceUrl || options.sourceHTML)) {
            done("Ambiguously SHOT options");
        } else if (!options.format
            || (
                options.format
                && (!options.format.type || !vIn(options.format.type, SUP_FMT_TYPES))
            )) {
            done("Invalid SHOT format");
        } else {
            const windowSize = { width: 1024, height: 768 };
            if (options.format.type !== "pdf" && options.format.size && options.format.size !== "auto") {
                windowSize.width = options.format.size.width;
                windowSize.height = options.format.size.height;
            }
            useBrowserWindow(
                options.sourceUrl || "about:blank",
                (win) => doCapture(win, options),
                {
                    width:          windowSize.width,
                    height:         windowSize.height,
                    webPreferences: {
                        javascript: options.sourceUrl == null || options.format.type !== "pdf"
                    }
                }
            ).then(
                (data) => { done(undefined, data); }
            ).catch(done);
        }
    }
);