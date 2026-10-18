// RACHA · v88 — o que a plataforma de teste pega do código de verdade da plataforma (app/api): o router inteiro (as
// mesmas rotas que vão para a produção), o contexto, o servidor das salas montado na plataforma (ligaSalas), o banco e o
// schema. O tests/plataforma/compila.cjs junta isto com o esbuild, trocando só o drizzle, o tRPC e o superjson pelos de
// teste (tests/plataforma/*_lite.mjs). Nada daqui vai para a produção.
export { appRouter } from "../../app/api/router";
export { createContext } from "../../app/api/context";
export { ligaSalas } from "../../app/api/lib/salas";
export { getDb } from "../../app/api/queries/connection";
export * as schema from "../../app/db/schema";
export { hashSenha } from "../../app/api/racha/security";
export { assina, confere, garanteSegredoSalas, segredoSalas } from "../../app/api/lib/selo";
export { fetchRequestHandler } from "@trpc/server/adapters/fetch";
export { _bancoDeTeste } from "drizzle-orm/mysql2";
export { eq, and, or, desc, sql } from "drizzle-orm";   // (os operadores da MESMA cópia que o código usa: o servidor de teste e os testes montam consultas com eles)
