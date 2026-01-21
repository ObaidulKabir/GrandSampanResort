declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL: string;
    DOMAIN: string;
    NODE_ENV: "development" | "production" | "test";
    PORT?: string;
  }
}
