import { Context, NextFunc } from "../server.ts";
import { ensureFileSync } from "../deps.ts";
export function logger(
  file: string = "./log.txt",
) {
  ensureFileSync(file);
  const denoFile = Deno.openSync(file, { write: true, append: true });
  return async function (ctx: Context, next: NextFunc) {
    await Deno.write(
      denoFile.rid,
      new TextEncoder().encode(
        `${ctx.req.method} ${ctx.url.toString()} ${
          JSON.stringify(ctx.conn.remoteAddr)
        } ${new Date().toISOString()}\n`,
      ),
    );
    await next();
  };
}
