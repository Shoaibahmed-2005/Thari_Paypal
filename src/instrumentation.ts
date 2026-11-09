export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkEnvAtStartup } = await import("@/lib/env");
    checkEnvAtStartup();
  }
}
