import { Context, NextFunc } from "../server.ts";
export function redirect(url: string) {
  return async (ctx: Context, next: NextFunc) => {
    ctx.redirect(url);
    await next();
  };
}
