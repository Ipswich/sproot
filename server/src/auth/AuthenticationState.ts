import type { IUsersRepository } from "../database/repositories/users/IUsersRepository";
import type { ISettingsRepository } from "../database/settings/ISettingsRepository";
import { SETTINGS } from "../database/settings/SettingsSchema";

export interface AuthenticationState {
  authenticationEnabled: boolean;
  userCount: number;
  requiresSetup: boolean;
}

export async function getAuthenticationStateAsync(
  settingsRepository: ISettingsRepository,
  usersRepository: IUsersRepository,
): Promise<AuthenticationState> {
  const authenticationEnabled =
    (await settingsRepository.getAsync(SETTINGS.system.authentication_enabled)) === true;
  const userCount = await usersRepository.countAsync();

  return {
    authenticationEnabled,
    userCount,
    requiresSetup: authenticationEnabled && userCount < 1,
  };
}