export {
    PromiseMay,
    ShooterOptions, ShotFormat, Shooter
};

type PromiseMay<T> = T|Promise<T>;

type PDFMarginDef = 0;
type PDFMarginNo = 1;
type PDFMarginMin = 2;

type ShotFormat =
    {
        type: "pdf",
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
    |{
    type: "png",
    scaleFactor?: number;
}
    |{
    type: "jpeg",
    quality: number;
}
    |{
    type: "bmp",
    scaleFactor?: number;
};

interface ShooterOptions {
    paths?: { [pathName: string]: string; };
    switches?: { [switchName: string]: string; };
    loadTimeout?: number;
}

interface Shooter {
    shutdown(): Promise<void>;
    halt(): void;

    shotURL(format: ShotFormat, url: string): Promise<Buffer>;
    shotURL(format: ShotFormat, url: string, filename: string): Promise<string>;
    shotURL(format: ShotFormat, url: string, destinationStream: NodeJS.WritableStream): Promise<NodeJS.WritableStream>;

    shotHTML(format: ShotFormat, source: string): Promise<Buffer>;
    shotHTML(format: ShotFormat, source: string, filename: string): Promise<string>;
    shotHTML(format: ShotFormat, source: string, destinationStream: NodeJS.WritableStream): Promise<NodeJS.WritableStream>;
}