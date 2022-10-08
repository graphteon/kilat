import { req, res, Server } from "../mod.ts";

// curl -X POST -d '{"test":"test"}' http://localhost/example_json
const server = new Server();
server.post(
  "/example_json",
  res("json"),
  req("json"),
  async (ctx: any, next: any) => {
    console.log(ctx.req.headers);
    console.log(ctx.body);
    ctx.res.body = { msg: "json response example" };
    await next();
  },
);
await server.listen({ port: 80 });