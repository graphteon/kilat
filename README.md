# Kilat

## Contents

- [Benchmarks](#benchmarks)

- [Example](#example)
  - [Defining routes](#defining-routes)
  - [GraphQL support](#graphql-support)
  - [POST read and return JSON](#post-read-and-return-json)
  - [GET return HTML](#get-return-html)
  - [Get URL params](#get-url-params)
  - [Cookies](#cookies)
  - [Redirect](#redirect)
- [Middleares](#middleares)
  - [Logger](#logger)
  - [Body Parsers res and req](#body-Parsers-res-and-req)
  - [Rate Limit](#rate-limit)
  - [Serve Static](#serve-static)
  - [Set Cors](#set-cors)
  - [Token](#token)
  - [Redirect](#redirect)
  - [Session](#session)
  - [Proxy](#proxy)
  - [Upload](#upload)
    - [Upload usage](#upload-usage)
    - [Upload examples in frontend and backend](#upload-examples-in-frontend-and-backend)
- [All imports](#all-imports)
- [Example Deploy](#example-deploy)
  - [Configure HTTPS](#configure-https)

## Benchmarks

The middleware is built on top of Luwak's native HTTP APIs, see the benchmarks
('hello word' server):

**Machine**: 8 GiB, Intel® Core™ i5-10210U CPU @ 2.11GHz × 4

**method**: `autocannon -c 100 -d 40 -p 10 localhost:80`. Luwak v0.5.6, Ubuntu
20.04 LTS.

| Framework  | Version | Router? |                                   Results |
| ---------- | :-----: | :-----: | ----------------------------------------: |
| Express    | 4.17.3  |    ✓    |       167k requests in 40.11s, 29 MB read |
| Fastify    | 3.27.4  |    ✓    |     1105k requests in 40.07s ,193 MB read |
| Oak        | 10.4.0  |    ✓    |       260k requests in 40.09s, 45 MB read |
| **Kilat**  | **1.0** |  **✓**  | **1432k requests in 40.17s, 250 MB read** |

Note that in addition to performance, Kilat is a very complete framework
considering its middleware collection.

## Example

### Defining routes

Static (/foo, /foo/bar)

Parameter (/:title, /books/:title, /books/:genre/:title)

Parameter w/ Suffix (/movies/:title.mp4, /movies/:title.(mp4|mov))

Optional Parameters (/:title?, /books/:title?, /books/:genre/:title?)

Wildcards (\*, /books/\*, /books/:genre/\*)

### GraphQL support

```typescript
import { Server } from "https://deno.land/x/kilat/mod.ts";
import { buildSchema, GraphQLHTTP } from 'https://deno.land/x/kilatgraphql@16.6.0/mod.ts'

// TEST curl -X POST localhost:3000/graphql -d '{ "query": "{ hello }" }'

const port = 3000;
const schema = buildSchema(`
  type Query {
    hello: String
  }
`)

const rootValue = { hello: () => `Hello World!` } ;
const server = new Server();
server.post(
    "/graphql",
    async (ctx: any, next: any) => {
        const resp = await GraphQLHTTP<Request>({ schema, rootValue, context: (request) => ({ request }) })(ctx.req);
        ctx.res = resp;
        await next();
    },
);
console.log(`server listen to http://localhost:${port}`);
await server.listen({ port });
```

### POST read and return JSON

```typescript
import { req, res, Server } from "https://deno.land/x/kilat/mod.ts";
const server = new Server();
server.post(
  "/example_json",
  res("json"),
  req("json"),
  async (ctx: any, next: any) => {
    console.log(ctx.body);
    ctx.res.body = { msg: "json response example" };
    await next();
  },
);
await server.listen({ port: 80 });
```

### GET return HTML

```typescript
server.get(
  "/example_html",
  res("html"),
  async (ctx: any, next: any) => {
    ctx.res.body = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>title example</title>
        </head>
        </body>
          HTML body example
        <body>
      </html>
    `;
    await next();
  },
);
```

### Get URL params

```typescript
server.get(
  "/example_params/:ex1?foo=bar",
  async (ctx: any, next: any) => {
    console.log(ctx.params.ex1);
    console.log(ctx.url.searchParams.get("foo")); //you can explore the URL (ctx.url) object
    await next();
  },
);
```

### Cookies

```typescript
import {
  Cookie,
  deleteCookie,
  getCookies,
  Server,
  setCookie,
} from "https://deno.land/x/kilat/mod.ts";
server.get(
  "/cookies",
  async (ctx: any, next: any) => {
    setCookie(ctx.res.headers, { name: "user_name", value: "San" }); //explore interface 'Cookie' for more options
    deleteCookie(ctx.res.headers, "last_order");
    console.log(getCookies(ctx.req.headers));
    await next();
  },
);
```

### Redirect

```typescript
server.get(
  "/redirect_example",
  async (ctx: any, next: any) => {
    ctx.redirect("/my_custom_url_or_path");
    await next();
  },
);
```

## Middleares

This project has a standard set of middleware useful for most cases.

### Logger

Example:

```typescript
server.use(logger());
```

You can pass custom log file:

```typescript
logger("./my_dir/my_custom_log.txt");
```

### Body Parsers res and req

Example:

```typescript
server.post(
  "/example_parsers",
  res("json"), //Response parser
  req("json"), //Request parser
  async (ctx: any, next: any) => {
    console.log(ctx.body); //the original (no parser) body is in ctx.req.body
    ctx.res.body = { msg: "json response example" };
    await next();
  },
);
```

The current supported options for "req" are: "arrayBuffer", "blob", "formData",
"json", "text".

The current supported options for "res" are: "json", "html", "javascript".

If there are no parsers for your data, don't worry, you can handle the data
manually, Ex:

```typescript
server.post(
  "/upload",
  async (ctx: any, next: any) => {
    ctx.res.headers.set(
      "Content-Type",
      "application/json",
    );
    const data = await exCustomParseBody(ctx.req.body); //do what you want with ctx.req.body
    ctx.res.body = JSON.stringify({ msg: "ok" }); // //ctx.res.body can also be other data types such as streams, bytes and etc.
    await next();
  },
);
```

### Rate Limit

Example:

```typescript
server.use(rateLimit());
```

OPTIONS (with default values):

```typescript
rateLimit({
  attempts: 30,
  interval: 10,
  maxTableSize: 100000,
  id: (ctx: Context) => JSON.stringify(ctx.conn.remoteAddr),
});
```

### Serve Static

Example (must end with "/*"):

```typescript
server.get(
  "/pub/*",
  serveStatic("./pub"),
);
```

### Set Cors

Example:

```typescript
server.options("/example_cors", setCORS()); //enable pre-fligh request
server.get(
  "/example_cors",
  setCORS(),
  async (ctx, next) => {
    await next();
  },
);
```

You can pass valid hosts to cors function:

```typescript
setCORS("http://my.custom.url:8080");
```

### Token

This middleware is encapsulated in an entire static class. It uses Bearer Token
and default options with the "HS256" algorithm, and generates a random secret
when starting the application (you can also set a secret manually). Ex:

```typescript
server.get(
  "/example_verify_token", //send token to server in Header => Authorization: Bearer TOKEN
  Token.middleware,
  async (ctx, next) => {
    console.log(ctx.extra.tokenPayload);
    console.log(ctx.extra.token);
    await next();
  },
);
```

Generate Token ex:

```typescript
await Token.generate({ user_id: "172746" }, null); //null to never expire, this parameter defaults to "1h"
```

Set secret ex:

```typescript
Token.setSecret("a3d2r366wgb3dh6yrwzw99kzx2"); //Do this at the beginning of your application
```

Get token payload out of middleware:

```typescript
await Token.getPayload("YOUR_TOKEN_STRING"); //Ex: use for get token data from token string in URL parameter.
```

You can also use the static method `Token.setConfigs`.

### Redirect

Ex:

```typescript
server.get(
  "/my_url_1",
  redirect("/my_url_2"), //or the full url
);
```

### Session

Ex:

```typescript
server.use(session());
//in routes:
server.get(
  "/session_example",
  async (ctx, next) => {
    console.log(ctx.extra.session); //get session data
    ctx.extra.session.foo = "bar"; //set session data
    await next();
  },
);
```

OPTIONS (with default values):

```
session(engine: SessionStorageEngine = new SQLiteStorageEngine(60)) //60 is 60 minutes to expire session
```

### Proxy

Ex:

```typescript
server.use(proxy({ url: "https://my-url-example.com" }));
```

In routes:

```typescript
server.get(
  "/proxy_example",
  async (ctx, next) => {
    console.log(ctx.req); //req has changed as it now points to the proxy
    console.log(ctx.res); //res has changed because now it has the proxy answer

    //OR if replaceReqAndRes = false
    console.log(ctx.extra.proxyReq);
    console.log(ctx.extra.proxyRes);

    await next();
  },
);
```

Or proxy in specific route:

```typescript
server.get(
  "/proxy_example",
  proxy({
    url: "https://my-url-example.com/proxy_ex2",
    replaceProxyPath: false, //specific proxy route for the route "/proxy_example"
  }),
  async (ctx, next) => {
    console.log(ctx.req); //req has changed as it now points to the proxy
    console.log(ctx.res); //res has changed because now it has the proxy answer
    await next();
  },
);
```

Conditional proxy:

```typescript
server.get(
  "/proxy_example",
  proxy({
    url: "https://my-url-example.com/proxy_ex3",
    condition: (ctx) => {
      if (ctx.url.searchParams.get("foo")) {
        return true;
      } else {
        return false;
      }
    },
  }),
  async (ctx, next) => {
    console.log(ctx.extra.proxied); //will be true if proxy condition is true
    console.log(ctx.req); //req has changed as it now points to the proxy
    console.log(ctx.res); //res has changed because now it has the proxy answer
    await next();
  },
);
```

OPTIONS (with default values):

```
proxy(url: string, replaceReqAndRes: true, replaceProxyPath: true, condition: : (ctx: Context) => true )
```

**Do not use "res body parsers" with 'replaceReqAndRes: true' (default) !!!**

**If you don't use Request body information before the proxy or in your
condition, don't use "req body parsers" as this will increase the processing
cost !!!**

### Upload

This middleware automatically organizes uploads to avoid file system problems
and create dirs if not exists, perform validations and optimizes ram usage when
uploading large files using Luwak standard libraries!

#### Upload usage

Ex:

```typescript
.post("/upload", upload(), async (ctx: any, next: any) => { ...
```

Ex (with custom options):

```typescript
.post("/upload", upload({ path: 'uploads_custom_dir' , extensions: ['jpg', 'png'], maxSizeBytes: 20000000, maxFileSizeBytes: 10000000, saveFile: true, readFile: false, useCurrentDir: true }), async (ctx: any, next: any) => { ...
```

Request must contains a body with form type "multipart/form-data", and inputs
with type="file".

Ex (pre validation):

```javascript
.post("/pre_upload", preUploadValidate(["jpg", "png"], 20000000, 10000000), async (ctx: any, next: any) => { ...
```

Pre validation options:

```
preUploadValidate(
  extensions: Array<string> = [],
  maxSizeBytes: number = Number.MAX_SAFE_INTEGER,
  maxFileSizeBytes: number = Number.MAX_SAFE_INTEGER,
)
```

#### Upload examples in frontend and backend

Below an frontend example to work with <b>AJAX</b>, also accepting type="file"
<b>multiple</b>:

```javascript
var files = document.querySelector("#yourFormId input[type=file]").files;
var name = document.querySelector("#yourFormId input[type=file]").getAttribute(
  "name",
);

var form = new FormData();
for (var i = 0; i < files.length; i++) {
  form.append(`${name}_${i}`, files[i]);
}
var res = await fetch("/upload", { //Fetch API automatically puts the form in the format "multipart/form-data".
  method: "POST",
  body: form,
}).then((response) => response.json());
console.log(res);

//VALIDATIONS --------------

var validationData = {};
for (var i = 0; i < files.length; i++) {
  var newObj = { //newObj is needed, JSON.stringify(files[i]) not work
    "name": files[i].name,
    "size": files[i].size,
  };
  validationData[`${name}_${i}`] = newObj;
}
var validations = await fetch("/pre_upload", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(validationData),
}).then((response) => response.json());
console.log(validations);
```

In Luwak (backend):

```typescript
import {
  preUploadValidate,
  res,
  Server,
  upload,
} from "kilat/mod.ts";
const server = new Server();
server.post(
  "/upload",
  res("json"),
  upload({
    path: "my_uploads",
    extensions: ["jpg", "png"],
    maxSizeBytes: 20000000,
    maxFileSizeBytes: 10000000,
  }),
  async (ctx: any, next: any) => {
    ctx.res.body = ctx.extra.uploadedFiles;
    await next();
  },
);
server.post(
  "/pre_upload",
  res("json"),
  preUploadValidate(["jpg", "png"], 20000000, 10000000),
  async (ctx: any, next: any) => {
    ctx.res.body = { msg: "Passed upload validations." };
    await next();
  },
);
server.get("/", res("html"), async (ctx: any, next: any) => {
  ctx.res.body = `
  <form id="yourFormId" enctype="multipart/form-data" action="/upload" method="post">
    <input type="file" name="file1" multiple><br>
    <input type="submit" value="Submit">
  </form>
    `;
  await next();
});
await server.listen({ port: 80 });
```

## All imports

```typescript
import {
  Context,
  ContextResponse, //type
  Cookie, //type, alias to luwak std
  deleteCookie, //alias to luwak std
  getCookies, //alias to luwak std
  logger,
  NextFunc, //type
  Params, //type
  parse,
  preUploadValidate,
  ProcessorFunc, //type
  proxy,
  rateLimit,
  redirect,
  req,
  res,
  Route, //type
  RouteFn, //type
  Server,
  serveStatic,
  Session, //type
  session,
  SessionStorageEngine,
  setCookie, //alias to luwak std
  setCORS,
  SQLiteStorageEngine,
  Token,
  upload,
} from "kilat/mod.ts";
```

## Example Deploy

Example of depoly application "my-luwak-app" in ubuntu environment. Change the
"my-luwak-app" and the directories to yours.

### Configure HTTPS

Install certbot:

```console
sudo apt install certbot
```

Generate certificates:

```console
sudo certbot certonly --manual
```

In your application, to verify the domain you will need something like:

```typescript
import { Server, serveStatic } from "kilat/mod.ts";
const server = new Server();
server.get( //verify http://<YOUR_DOMAIN>/.well-known/acme-challenge/<TOKEN>
  "/.well-known/*",
  serveStatic("./.well-known"), // ex: create .well-known folder in yor app folder
);
await server.listen({ port: 80 });
```

To run your application on https (Change "yourdomain.link" to your domain):

```typescript
await server.listen({
  port: 443,
  certFile: "/etc/letsencrypt/live/yourdomain.link/fullchain.pem",
  keyFile: "/etc/letsencrypt/live/yourdomain.link/privkey.pem",
});
```

The certificate is valid for a short period. Set crontab to update
automatically. The command 'sudo crontab' opens roots crontab, all commands are
executed as sudo. Do like this:

```console
sudo crontab -e
```

Add to the end of the file (to check and renew if necessary every 12 hours):

```
0 */12 * * * certbot -q renew --standalone --preferred-challenges=http
```

Or also to check every 7 days:

```
0 0 * * 0 certbot -q renew --standalone --preferred-challenges=http
```
