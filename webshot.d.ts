import * as typings from "./src/typings";
import * as index from "./src/index";

declare module "webshot" {
    export * from "./src/index";
    export * from "./src/typings";
}

declare module "dojo/node!webshot" {
    export * from "./src/index";
    export * from "./src/typings";
}