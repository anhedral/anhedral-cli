// Enable methods deliberately after configuring credentials, email and policies.
// OAuth, passkeys, MFA and organizations each need their matching provider/plugin,
// schema generation, reviewed migrations and client configuration before use.
export const authFeatures = { emailPassword: false };
