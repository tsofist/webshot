## **DEPRECATED**

# webshot

Быстрый, а главное _эффективный_, способ "сфотографировать" веб-страницу.

### Ключевые моменты

* Источником может быть html-строка, url (включая ``file:``)
* Результатом может быть бинарный файл, бинарный буфер; бинарный поток записи может быть приемником  
* Поддерживаемые форматы результата: ``pdf, png, jpeg``

Под капотом [electron](https://github.com/electron-userland/electron-prebuilt) 
  
## Установка

``npm i @tsofist/webshot --save --production``

## Использование

```ts
import { startupShooter } "webshot";

const myShooter = startupShooter();

/**
 * Page from URL to binary Buffer
 */
function shotPageByURLToBinaryBuffer(url: string, format: ShotFormat): Promise<Buffer> {
    return myShooter
        .then((shooter) => shooter.shotURL(format, url));
}

/**
 * Page from URL to local file
 */
function shotPageByURLToFile(url: string, format: ShotFormat, filename: string): Promise<string> {
    return myShooter
        .then((shooter) => shooter.shotURL(format, url, filename));
}

/**
 * Page from URL to stream (e.g. Express.Response)
 */
function shotPageByURLToStream(url: string, format: ShotFormat, destination: NodeJS.WritableStream): Promise<NodeJS.WritableStream> {
    return myShooter
        .then((shooter) => shooter.shotURL(format, url, destination));
}
```

И это не все! Можно проделать тоже самое но с html!

```ts
import { startupShooter } "webshot";

const myShooter = startupShooter();

/**
 * Page as HTML-string to binary Buffer
 */
function shotHTMLToBinaryBuffer(html: string, format: ShotFormat): Promise<Buffer> {
    return myShooter
        .then((shooter) => shooter.shotHTML(format, url));
}

/**
 * Page as HTML-string to local file
 */
function shotHTMLToFile(html: string, format: ShotFormat, filename: string): Promise<string> {
    return myShooter
        .then((shooter) => shooter.shotHTML(format, url, filename));
}

/**
 * Page as HTML-string to stream (e.g. Express.Response)
 */
function shotHTMLToStream(html: string, format: ShotFormat, destination: NodeJS.WritableStream): Promise<NodeJS.WritableStream> {
    return myShooter
        .then((shooter) => shooter.shotHTML(format, url, destination));
}
```

Как только ~~вам надоест~~ потребность в конверторе иссякнет, его можно остановить, либо уничтожить вовсе.

```ts
// soft
myShooter.shutdown(() => console.log("Shooter is shutted down"));
// hard
myShooter.halt();
```

### Поддерживаемые форматы

Формат можно описывать следующим образом:

```ts
// PDF
{
    type: "pdf",
    marginsType?: 0 // default
        |1          // no
        |2;         // minimum
    pageSize?: "Legal"
        |"Letter"
        |"Tabloid"
        |"A3"|"A4"|"A5"
        |{ height: number; width: number; };
    printBackground?: boolean; // false by default
    landscape?: boolean;       // false by default
}

// PNG
{
    type: "png",
    scaleFactor?: number;
    size?: "auto"|{ height: number; width: number; };
}

// JPEG
{
    type: "jpeg",
    quality: number;
    size?: "auto"|{ height: number; width: number; };    
}
```

---

### TODO

* cli (?)
* Тесты, много тестов!
* Очереди, пулы страниц, пулы electron-экземпляров
* Больше документации (?)
