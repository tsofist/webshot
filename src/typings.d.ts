export {
    PromiseMay,
    ShooterOptions, ShotFormat, Shooter,
    PDFFormatOptions, PNGFormatOptions, JPEGFormatOptions
};

type PromiseMay<T> = T|Promise<T>;

type PDFMarginDef = 0;
type PDFMarginNo = 1;
type PDFMarginMin = 2;

interface PDFFormatOptions {
    marginsType?: PDFMarginDef
        |PDFMarginNo
        |PDFMarginMin;
    pageSize?: "Legal"
        |"Letter"
        |"Tabloid"
        |"A3"|"A4"|"A5"
        |{ height: number; width: number; };
    printBackground?: boolean;
    landscape?: boolean;
}

interface JPEGFormatOptions {
    quality?: number;
    size?: "auto"|{ height: number; width: number; };
}

interface PNGFormatOptions {
    scaleFactor?: number;
    size?: "auto"|{ height: number; width: number; };
}

type ShotFormat =
    ({ type: "pdf" }&PDFFormatOptions)
    |({ type: "png" }&PNGFormatOptions)
    |({ type: "jpeg" }&JPEGFormatOptions);

interface ShooterOptions {
    paths?: { [pathName: string]: string; };
    switches?: { [switchName: string]: string; };
}

interface Shooter {
    shutdown(): Promise<void>;
    halt(): void;

    shotURL(format: ShotFormat, url: string): Promise<Buffer>;
    shotURL(format: ShotFormat, url: string, filename: string): Promise<string>;
    shotURL(format: ShotFormat, url: string, destinationStream: NodeJS.WritableStream): Promise<NodeJS.WritableStream>;

    shotHTML(format: ShotFormat, html: string): Promise<Buffer>;
    shotHTML(format: ShotFormat, html: string, filename: string): Promise<string>;
    shotHTML(format: ShotFormat, html: string, destinationStream: NodeJS.WritableStream): Promise<NodeJS.WritableStream>;
}