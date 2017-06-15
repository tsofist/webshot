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
const SUP_FMT_TYPES = ["pdf", "png", "jpeg", "bmp"];
function useBrowserWindow(url, onBrowserWindow, allowJS = false) {
    return new Promise((resolve, reject) => {
        let win = new electron.BrowserWindow({
            show: false,
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
        const dispose = () => {
            if (win)
                win.close();
            win = undefined;
        };
        try {
            win.webContents.setAudioMuted(true);
            win.webContents
                .once("did-fail-load", () => {
                dispose();
                reject(new Error(`Failed to load ${url}`));
            })
                .once("did-finish-load", () => {
                try {
                    const promiseMay = onBrowserWindow(win);
                    if (promiseMay && typeof promiseMay.then === util_1.TS_FUNCTION) {
                        promiseMay.then((data) => {
                            dispose();
                            resolve(data);
                        }, dispose);
                    }
                    else {
                        dispose();
                        resolve(promiseMay);
                    }
                }
                catch (error) {
                    dispose();
                    reject(error);
                }
            });
            win.loadURL(url, {});
        }
        catch (error) {
            dispose();
            reject(error);
        }
    });
}
function doPrint(win, options) {
    return (options.sourceHTML
        ? (win.webContents
            .executeJavaScript(`document.documentElement.innerHTML=decodeURIComponent("${encodeURIComponent(options.sourceHTML)}");`))
        : Promise.resolve()).then(() => new Promise((resolve, reject) => {
        if (options.format.type === "pdf")
            win
                .webContents
                .printToPDF(options.format, (error, data) => {
                if (error) {
                    reject(error);
                }
                else {
                    if (options.filename)
                        fs_1.writeFile(options.filename, data, (error) => {
                            if (error)
                                reject(error);
                            else
                                resolve(options.filename);
                        });
                    else
                        resolve(data);
                }
            });
        else
            win
                .capturePage((image) => {
                switch (options.format.type) {
                    case "png":
                        resolve(image.toPNG(options.format));
                        break;
                    case "jpeg":
                        resolve(image.toJPEG(options.format.quality));
                        break;
                    case "bmp":
                        resolve(image.toBitmap(options.format));
                        break;
                }
            });
    }));
}
parent.respondTo("shot", (options, done) => {
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
        useBrowserWindow(options.sourceUrl || "about:blank", (win) => doPrint(win, options), options.sourceUrl == null).then((data) => { done(undefined, data); }, done);
    }
});
