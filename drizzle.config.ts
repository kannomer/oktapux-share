import { defineConfig } from "drizzle-kit";

export default defineConfig({
    out: "./drizzle/migrations",
    dialect: "sqlite",
    schema: "./server/db/schema.ts",
    dbCredentials: {
        url: "./data/oktapux.db"
    }
})
