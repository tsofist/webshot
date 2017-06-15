import * as electron from "electron";
import { writeFile } from "fs";
import makeIPCChannel from "./interaction-channel";
import { vIn, TS_FUNCTION } from "./util";
import { PromiseMay, ShotFormat } from "./typings";

type BrowserWindow = Electron.BrowserWindow;
const
    electronApp = electron.app,
    parent = makeIPCChannel(process);

(() => {
    const
        processArgs = JSON.parse(process.argv[2]),
        paths = processArgs.paths,
        switches = processArgs.switches;

    if (paths) for (const i in paths)
        electronApp.setPath(i, paths[i]);
    if (switches) for (const i in switches)
        electronApp.commandLine.appendSwitch(i, switches[i]);

    if (!processArgs.dock && electronApp.dock)
        electronApp.dock.hide();
})();

process.on("uncaughtException", (error) => {
    parent.emit("uncaughtException", error.stack);
});

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

function useBrowserWindow(url: string,
                          onLoaded: (win: BrowserWindow) => PromiseMay<void>,
                          onError: (error: any) => void,
                          allowJS = false): void {
    let win: BrowserWindow|undefined = new electron.BrowserWindow({
        show:           true,
        alwaysOnTop:    false,
        webPreferences: {
            nodeIntegration:             false,
            javascript:                  allowJS,
            allowRunningInsecureContent: true,
            webgl:                       false,
            webaudio:                    false,
            defaultEncoding:             "utf8"
        }
    });
    const onFinalize = (): void => {
        if (win) win.close();
        win = undefined;
    };
    try {
        win.webContents.setAudioMuted(true);
        win.webContents
           .once("did-fail-load", () => {
               onFinalize();
               onError(new Error(`Failed to load ${url}`));
           })
           .once("did-finish-load", () => {
               try {
                   const promiseMay = onLoaded(win!);
                   if (promiseMay && typeof promiseMay.then === TS_FUNCTION) {
                       promiseMay.then(
                           onFinalize,
                           onFinalize
                       );
                   } else
                       onFinalize();
               } catch (error) {
                   onError(error);
               }
           });
        win.loadURL(url, { /*todo*/ });
    } catch (error) {
        onError(error);
    }
}

const SUP_FMT_TYPES = ["pdf", "png", "jpeg", "bmp"];

parent.respondTo(
    "shot",
    function (options: {
                  sourceUrl?: string;
                  sourceHTML?: string;
                  filename?: string;
                  format: ShotFormat;
              },
              done: (error: any, result?: string|Buffer) => void) {
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
            useBrowserWindow(
                options.sourceUrl || "about:blank",
                (win) => {
                    return (options.sourceHTML
                            ? (win.webContents
                                  .executeJavaScript(`document.documentElement.innerHTML=decodeURIComponent("${ encodeURIComponent(options.sourceHTML) }");`))
                            : Promise.resolve()
                    ).then(() => {
                        if (options.format.type === "pdf") {
                            win.webContents.printToPDF(options.format as any, (error, data) => {
                                win.close();
                                if (error) {
                                    done(error);
                                } else {
                                    if (options.filename) writeFile(options.filename, data, (error) => {
                                        if (error) done(error); else
                                            done(undefined, options.filename);
                                    }); else
                                        done(undefined, data);
                                }
                            });
                        } else {
                            win.capturePage((image) => {
                                win.close();
                                switch (options.format.type) {
                                    case "png":
                                        done(undefined, image.toPNG(options.format));
                                        break;
                                    case "jpeg":
                                        done(undefined, image.toJPEG(options.format.quality));
                                        break;
                                    case "bmp":
                                        done(undefined, image.toBitmap(options.format));
                                        break;
                                }
                            });
                        }
                    });
                },
                done,
                options.sourceUrl == null
            );
        }
    }
);