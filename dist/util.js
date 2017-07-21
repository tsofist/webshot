"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TS_STRING = "string", TS_FUNCTION = "function";
exports.TS_STRING = TS_STRING;
exports.TS_FUNCTION = TS_FUNCTION;
const prototypeOfObject = Object.prototype, toString = prototypeOfObject.toString;
const TOS_FUNCTION = toString.call(noop), TOS_OBJECT = toString.call({});
function noop() {
}
exports.noop = noop;
function vIn(value, list) {
    for (const v of list)
        if (v === value)
            return true;
    return false;
}
exports.vIn = vIn;
function sliced(args, slice, sliceEnd) {
    const result = [];
    let len = args.length;
    if (0 === len)
        return result;
    const start = slice == null
        ? 0
        : slice < 0
            ? Math.max(0, slice + len)
            : slice;
    if (sliceEnd !== undefined)
        len = sliceEnd < 0
            ? sliceEnd + len
            : sliceEnd;
    while (len-- > start)
        result[len - start] = args[len];
    return result;
}
exports.sliced = sliced;
function isPlainObject(it) {
    if (it == null
        || Array.isArray(it)
        || toString.call(it) !== TOS_OBJECT)
        return false;
    const ctor = it.constructor;
    if (typeof ctor !== TS_FUNCTION
        || toString.call(ctor) !== TOS_FUNCTION)
        return false;
    const proto = ctor.prototype;
    return proto
        && toString.call(proto) === TOS_OBJECT;
}
exports.isPlainObject = isPlainObject;
function deepMixin() {
    const target = arguments[0], length = arguments.length;
    let src, copyIsArray = false, copy, options, clone, i = 0;
    let name;
    for (; i < length; i++) {
        if ((options = arguments[i]) != null) {
            for (name in options) {
                src = target[name];
                copy = options[name];
                if (target === copy)
                    continue;
                if (copy
                    && (isPlainObject(copy)
                        || (copyIsArray = Array.isArray(copy)))) {
                    if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && Array.isArray(src) ? src : [];
                    }
                    else {
                        clone = src && isPlainObject(src) ? src : {};
                    }
                    target[name] = deepMixin(clone, copy);
                }
                else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }
    return target;
}
exports.deepMixin = deepMixin;
