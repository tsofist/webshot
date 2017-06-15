#webshot

Быстрый, а главное _эффективный_, способ "сфотографировать" веб-страницу.

### Ключевые моменты

* Источник: html-строка, url (включая ``file:``)
* Приемник: бинарный поток записи, бинарный файл, бинарный буфер  
* Формат данных: ``pdf, png, jpeg, bitmap``
  
## Установка

``TODO``

## Зачем?!

Абсолютное большинство реализаций либо не эффективны при потоковом использовании, либо не имеют казалось бы очевидный функционал

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
function shotHTMLToBinaryBuffer(url: string, format: ShotFormat): Promise<Buffer> {
    return myShooter
        .then((shooter) => shooter.shotHTML(format, url));
}

/**
 * Page as HTML-string to local file
 */
function shotHTMLURLToFile(url: string, format: ShotFormat, filename: string): Promise<string> {
    return myShooter
        .then((shooter) => shooter.shotHTML(format, url, filename));
}

/**
 * Page as HTML-string to stream (e.g. Express.Response)
 */
function shotHTMLURLToStream(url: string, format: ShotFormat, destination: NodeJS.WritableStream): Promise<NodeJS.WritableStream> {
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
}

// JPEG

{
    type: "jpeg",
    quality: number;
}

// BITMAP

{
    type: "bmp",
    scaleFactor: number;
}
```

---

### TODO

* Тесты, много тестов!
* Очереди, пулы страниц, пулы electron-экземпляров
* Больше документации?