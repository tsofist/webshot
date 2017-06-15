"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Schooter_1 = require("./Schooter");
function startupShooter(options = {}, environment = {}) {
    return Schooter_1.default.startup(options, environment);
}
exports.startupShooter = startupShooter;
