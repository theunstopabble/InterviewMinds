declare module "@apollo/server/express4" {
  import { ApolloServer } from "@apollo/server";
  import { Request, Response, NextFunction } from "express";

  export function expressMiddleware<TContext extends Record<string, unknown> = Record<string, unknown>>(
    server: ApolloServer<TContext>,
    options?: {
      context?: (arg: { req: Request; res: Response }) => Promise<TContext> | TContext;
    },
  ): (req: Request, res: Response, next: NextFunction) => void;
}
