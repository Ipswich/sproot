export interface StartupOptions {
  resetAuthenticationUsersOnStartup: boolean;
}

export function parseStartupOptions(argv: string[]): StartupOptions {
  const normalizedArgs = new Set(argv.map((arg) => arg.trim()));

  return {
    resetAuthenticationUsersOnStartup:
      normalizedArgs.has("--reset-authentication-users") ||
      normalizedArgs.has("--reset-authentication-users-on-startup"),
  };
}