import { Server } from "https://deno.land/x/kilat@1.1.0/mod.ts";
import { makeExecutableSchema, GraphQLHTTP, gql } from 'https://deno.land/x/kilat@1.1.0/middlewares/graphql/mod.ts'

// TEST curl -X POST localhost:3000/graphql -d '{ "query": "{ hello }" }'

const port = 3000;
const typeDefs = gql`
  type Query {
    hello: String
  }
`

const resolvers = { Query: { hello: () => `Hello World!` } };
const schema = makeExecutableSchema({ resolvers, typeDefs });
const server = new Server();
server.post(
    "/graphql",
    async (ctx: any, next: any) => {
      const resp = await GraphQLHTTP<Request>({ schema, context: (request) => ({ request }), graphiql: true })(ctx.req);
      console.log(resp.status);
      ctx.res = resp;
      await next();
    },
);
console.log(`server listen to http://localhost:${port}`);
await server.listen({ port });