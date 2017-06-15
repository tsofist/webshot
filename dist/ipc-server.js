"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const fs_1 = require("fs");
const interaction_channel_1 = require("./interaction-channel");
const util_1 = require("./util");
const electronApp = electron.app, parent = interaction_channel_1.default(process);
(() => {
    const processArgs = JSON.parse(process.argv[2]), paths = processArgs.paths, switches = processArgs.switches;
    if (paths)
        for (const i in paths)
            electronApp.setPath(i, paths[i]);
    if (switches)
        for (const i in switches)
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
        chrome: process.versions["chrome"]
    });
});
let shutdownInitiated = false;
electronApp.on("before-quit", (event) => {
    if (!shutdownInitiated)
        event.preventDefault();
});
parent.respondTo("shutdown", (done) => {
    shutdownInitiated = true;
    electronApp.quit();
    process.nextTick(() => {
        done();
    });
});
function useBrowserWindow(url, onLoaded, onError, allowJS = false) {
    let win = new electron.BrowserWindow({
        show: true,
        alwaysOnTop: false,
        webPreferences: {
            nodeIntegration: false,
            javascript: allowJS,
            allowRunningInsecureContent: true,
            webgl: false,
            webaudio: false,
            defaultEncoding: "utf8"
        }
    });
    const onFinalize = () => {
        if (win)
            win.close();
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
                const promiseMay = onLoaded(win);
                if (promiseMay && typeof promiseMay.then === util_1.TS_FUNCTION) {
                    promiseMay.then(onFinalize, onFinalize);
                }
                else
                    onFinalize();
            }
            catch (error) {
                onError(error);
            }
        });
        win.loadURL(url, {});
    }
    catch (error) {
        onError(error);
    }
}
const SUP_FMT_TYPES = ["pdf", "png", "jpeg", "bmp"];
parent.respondTo("shot", function (options, done) {
    //todo check format options
    if ((options.sourceUrl && options.sourceHTML) || !(options.sourceUrl || options.sourceHTML)) {
        done("Ambiguously SHOT options");
    }
    else if (!options.format
        || (options.format
            && (!options.format.type || !util_1.vIn(options.format.type, SUP_FMT_TYPES)))) {
        done("Invalid SHOT format");
    }
    else {
        useBrowserWindow(options.sourceUrl || "about:blank", (win) => {
            return (options.sourceHTML
                ? (win.webContents
                    .executeJavaScript(`document.documentElement.innerHTML=decodeURIComponent("${encodeURIComponent(options.sourceHTML)}");`))
                : Promise.resolve()).then(() => {
                if (options.format.type === "pdf") {
                    win.webContents.printToPDF(options.format, (error, data) => {
                        win.close();
                        if (error) {
                            done(error);
                        }
                        else {
                            if (options.filename)
                                fs_1.writeFile(options.filename, data, (error) => {
                                    if (error)
                                        done(error);
                                    else
                                        done(undefined, options.filename);
                                });
                            else
                                done(undefined, data);
                        }
                    });
                }
                else {
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
        }, done, options.sourceUrl == null);
    }
});