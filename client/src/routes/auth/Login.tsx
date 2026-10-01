import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMediaQuery } from "@mantine/hooks";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Anchor,
  Button,
  Center,
  Image,
  Loader,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";

import {
  getAuthenticationStateAsync,
  loginAsync,
  setAuthenticationToken,
} from "../../requests/requests_v2";
import AppProviders from "../AppProviders";
import { clearRootLoaderCache } from "../utility/Loaders";

export default function Login() {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 48em)");
  const isHttp = window.location.protocol === "http:";
  const httpsLoginUrl = new URL(window.location.href);
  httpsLoginUrl.protocol = "https:";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const authStateQuery = useQuery({
    queryKey: ["authenticationState", "login"],
    queryFn: () => getAuthenticationStateAsync(),
  });

  const loginMutation = useMutation({
    mutationFn: async () => loginAsync(username.trim(), password),
    onSuccess: (csrfToken) => {
      setAuthenticationToken(csrfToken);
      clearRootLoaderCache();
      navigate("/", { replace: true });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error ? mutationError.message : "Failed to log in.",
      );
    },
  });

  if (authStateQuery.isLoading) {
    return (
      <AppProviders>
        <Center mih="100dvh">
          <Loader color="teal" type="bars" size="lg" />
        </Center>
      </AppProviders>
    );
  }

  return (
    <AppProviders>
      <Center
        mih="100dvh"
        p="md"
        style={{ backgroundColor: "var(--mantine-color-body)" }}
      >
        <Paper
          withBorder
          radius="lg"
          shadow="sm"
          p="xl"
          maw={420}
          w="100%"
          style={{ transform: isMobile ? "translateY(-4vh)" : undefined }}
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);

              if (!username.trim() || !password) {
                setError("Enter both your username and password.");
                return;
              }

              loginMutation.mutate();
            }}
          >
            <Stack gap="lg">
              <Stack gap="sm" align="center">
                <Image
                  src="/sproot-pot.png"
                  alt="Sproot logo"
                  h={96}
                  w="auto"
                  fit="contain"
                />
                <Title order={2}>Sign In</Title>
              </Stack>

              {isHttp && (
                <Alert color="yellow" title="Unencrypted connection">
                  Consider upgrading to{" "}
                  <Anchor href={httpsLoginUrl.toString()} fw={600}>
                    HTTPS
                  </Anchor>{" "}
                  (end-to-end encryption).
                </Alert>
              )}

              {authStateQuery.isError && (
                <Alert color="red" title="Could not load authentication state">
                  {authStateQuery.error instanceof Error
                    ? authStateQuery.error.message
                    : "The server did not return usable authentication state."}
                </Alert>
              )}

              {error && (
                <Alert color="red" title="Sign in failed">
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

              <Button type="submit" loading={loginMutation.isPending}>
                Sign in
              </Button>
            </Stack>
          </form>
        </Paper>
      </Center>
    </AppProviders>
  );
}