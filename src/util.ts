export {
    TS_STRING, TS_FUNCTION,
    noop, isPlainObject, deepMixin, sliced, vIn
};

const
    TS_STRING = "string",
    TS_FUNCTION = "function";

const
    prototypeOfObject = Object.prototype,
    toString = prototypeOfObject.toString;

const
    TOS_FUNCTION = toString.call(noop),
    TOS_OBJECT = toString.call({});

function noop(): void {
    //noop
}

function vIn(value: any, list: Iterable<any>): boolean {
    for (const v of list) if (v === value)
        return true;
    return false;
}

function sliced(args: IArguments|any[], slice?: number, sliceEnd?: number) {
    const result: any[] = [];
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

function isPlainObject<T extends {}>(it: T|null|undefined): it is T {
    if (it == null
        || Array.isArray(it)
        || toString.call(it) !== TOS_OBJECT) return false;
    const ctor = it.constructor;
    if (typeof ctor !== TS_FUNCTION
        || toString.call(ctor) !== TOS_FUNCTION) return false;
    const proto = ctor.prototype;
    return proto
        && toString.call(proto) === TOS_OBJECT;
}

function deepMixin<T>(target: Partial<T>|T, ...sources: (Partial<T>|T)[]): Partial<T>|T;
function deepMixin(): any {
    const
        target = arguments[0],
        length = arguments.length;
    let src: any, copyIsArray = false, copy: any, options: any, clone: any,
        i = 0;
    let name: string;
    for (; i < length; i++) {
        if ((options = arguments[i]) != null) {
            for (name in options) {
                //noinspection JSUnfilteredForInLoop
                src = target[name];
                //noinspection JSUnfilteredForInLoop
                copy = options[name];
                if (target === copy) continue;
                if (copy
                    && (
                        isPlainObject(copy)
                        || (copyIsArray = Array.isArray(copy))
                    )
                ) {
                    if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && Array.isArray(src) ? src : [];
                    } else {
                        clone = src && isPlainObject(src) ? src : {};
                    }
                    //noinspection JSUnfilteredForInLoop
                    target[name] = deepMixin(clone, copy);
                } else if (copy !== undefined) {
                    //noinspection JSUnfilteredForInLoop
                    target[name] = copy;
                }
            }
        }
    }
    return target;
}