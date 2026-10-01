import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Center,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import {
  createFirstUserAsync,
  getAuthenticationStateAsync,
  setAuthenticationToken,
} from "../../requests/requests_v2";
import AppProviders from "../AppProviders";
import { clearRootLoaderCache } from "../utility/Loaders";

export default function FirstTimeSetup() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const authStateQuery = useQuery({
    queryKey: ["authenticationState", "setup"],
    queryFn: () => getAuthenticationStateAsync(),
  });

  const setupMutation = useMutation({
    mutationFn: async () =>
      createFirstUserAsync({
        username: username.trim(),
        password,
        enableAuthentication: authStateQuery.data?.authenticationEnabled ?? true,
      }),
    onSuccess: (result) => {
      if (result["csrf-token"]) {
        setAuthenticationToken(result["csrf-token"]);
      }

      clearRootLoaderCache();
      navigate("/", { replace: true });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to create the first user.",
      );
    },
  });

  if (authStateQuery.isLoading) {
    return (
      <AppProviders>
        <Center mih="100vh">
          <Loader color="teal" type="bars" size="lg" />
        </Center>
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <Center mih="100vh" p="md" bg="gray.0">
        <Paper withBorder radius="lg" shadow="sm" p="xl" maw={520} w="100%">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);

              if (!username.trim() || !password) {
                setError("Complete every field before continuing.");
                return;
              }

              if (password !== confirmPassword) {
                setError("Passwords do not match.");
                return;
              }

              setupMutation.mutate();
            }}
          >
            <Stack gap="lg">
              <div>
                <Title order={2}>First-Time Setup</Title>
                <Text size="sm" c="dimmed" mt="xs">
                  Authentication is enabled, but no user exists yet. Create the first account to unlock the app.
                </Text>
              </div>

              {authStateQuery.isError && (
                <Alert color="red" title="Could not load setup state">
                  {authStateQuery.error instanceof Error
                    ? authStateQuery.error.message
                    : "The server did not return usable setup state."}
                </Alert>
              )}

              {error && (
                <Alert color="red" title="Setup failed">
                  {error}
                </Alert>
              )}

              <TextInput
                label="Username"
                value={username}
                onChange={(event) => setUsername(event.currentTarget.value)}
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
              />
              <PasswordInput
                label="Confirm password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.currentTarget.value)}
              />

              <Button type="submit" loading={setupMutation.isPending}>
                Create account
              </Button>
            </Stack>
          </form>
        </Paper>
      </Center>
    </AppProviders>
  );
}