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
process.on("SIGINT", util_1.noop);
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
function useBrowserWindow(url, onBrowserWindow, options) {
    return new Promise((resolve, reject) => {
        let win = new electron.BrowserWindow(util_1.deepMixin({
            show: false,
            alwaysOnTop: false,
            useContentSize: false,
            enableLargerThanScreen: true,
            thickFrame: false,
            titleBarStyle: "hidden",
            webPreferences: {
                nodeIntegration: false,
                javascript: false,
                allowRunningInsecureContent: true,
                webgl: false,
                webaudio: false,
                defaultEncoding: "utf8"
            }
        }, options));
        const dispose = () => {
            if (win)
                win.close();
            win = undefined;
        }, onError = (error) => {
            dispose();
            reject(error);
        };
        try {
            win.webContents.setAudioMuted(true);
            win.webContents
                .once("did-fail-load", () => onError(new Error(`Failed to load ${url}`)))
                .once("did-finish-load", () => {
                try {
                    const promiseMay = onBrowserWindow(win);
                    if (promiseMay && typeof promiseMay.then === util_1.TS_FUNCTION) {
                        promiseMay.then((data) => {
                            dispose();
                            resolve(data);
                        }, onError);
                    }
                    else {
                        dispose();
                        resolve(promiseMay);
                    }
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
    });
}
function doPrint(win, options) {
    return (options.sourceHTML
        ? (win.webContents
            .executeJavaScript(`document.documentElement.innerHTML=decodeURIComponent("${encodeURIComponent(options.sourceHTML)}");`))
        : Promise.resolve()).then(() => new Promise((resolve, reject) => {
        const done = (data) => {
            if (options.filename)
                fs_1.writeFile(options.filename, data, (error) => {
                    if (error)
                        reject(error);
                    else
                        resolve(options.filename);
                });
            else
                resolve(data);
        }, capturePage = () => {
            win.capturePage((image) => {
                let data;
                switch (options.format.type) {
                    case "png":
                        data = image.toPNG(options.format);
                        break;
                    case "jpeg":
                        data = image.toJPEG(options.format.quality || 75);
                        break;
                }
                done(data);
            });
        };
        if (options.format.type === "pdf") {
            win.webContents
                .printToPDF(options.format, (error, data) => {
                if (error)
                    reject(error);
                else
                    done(data);
            });
        }
        else if (!options.format.size || options.format.size === "auto") {
            win.webContents
                .executeJavaScript(`(Promise.resolve({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }))`)
                .then((winSize) => {
                win.once("resize", () => {
                    setTimeout(() => {
                        capturePage();
                    }, 0 /*todo?*/);
                });
                win.setSize(winSize.width, winSize.height, false);
            })
                .catch(reject);
        }
        else {
            capturePage();
        }
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
        const windowSize = { width: 1024, height: 768 };
        if (options.format.type !== "pdf" && options.format.size && options.format.size !== "auto") {
            windowSize.width = options.format.size.width;
            windowSize.height = options.format.size.height;
        }
        useBrowserWindow(options.sourceUrl || "about:blank", (win) => doPrint(win, options), {
            width: windowSize.width,
            height: windowSize.height,
            webPreferences: {
                javascript: options.sourceUrl == null || options.format.type !== "pdf"
            }
        }).then((data) => { done(undefined, data); }).catch(done);
    }
});
