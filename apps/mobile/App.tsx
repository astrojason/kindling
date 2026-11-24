import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { hasAppAccess } from "@random-knowledge/shared/auth-guard";
import { AuthProvider, useAuth } from "./src/lib/auth-context";
import { useTheme } from "./src/lib/theme";
import { useAccessStatus } from "./src/hooks/useAccessStatus";
import { configureAdminAlerts } from "./src/lib/adminAlerts";
import { AccessPendingScreen } from "./src/screens/AccessPendingScreen";
import { MainScreen } from "./src/screens/MainScreen";
import { LoadingView } from "./src/components/LoadingView";
import { SignInScreen } from "./src/screens/SignInScreen";

function Root() {
  const theme = useTheme();
  const { user, claims } = useAuth();
  const { status, loading: accessLoading } = useAccessStatus(user, claims);

  // The signed-in app puts its own tab bar at the very bottom (it fills the home-indicator strip itself), so only the top is inset here.
  const signedIn = !!user && !accessLoading && hasAppAccess(status ?? "pending");
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={signedIn ? ["top"] : ["top", "bottom"]}>
      <StatusBar style="auto" />
      <Body user={user} accessLoading={accessLoading} status={status} />
    </SafeAreaView>
  );
}

function Body({
  user,
  accessLoading,
  status,
}: {
  user: ReturnType<typeof useAuth>["user"];
  accessLoading: boolean;
  status: ReturnType<typeof useAccessStatus>["status"];
}) {
  if (!user) return <SignInScreen />;
  if (accessLoading) return <LoadingView text="Loading" />;
  if (!hasAppAccess(status ?? "pending")) return <AccessPendingScreen status={status === "revoked" ? "revoked" : "pending"} />;
  return <MainScreen key={user.uid} />;
}

export default function App() {
  useEffect(() => configureAdminAlerts(), []);
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
