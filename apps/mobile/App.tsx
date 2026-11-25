import { useEffect, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { startupScreen, type StartupScreen } from "@random-knowledge/shared/auth-guard";
import { AuthProvider, useAuth } from "./src/lib/auth-context";
import { useTheme } from "./src/lib/theme";
import { useAccessStatus } from "./src/hooks/useAccessStatus";
import { configureAdminAlerts } from "./src/lib/adminAlerts";
import { AccessPendingScreen } from "./src/screens/AccessPendingScreen";
import { MainScreen } from "./src/screens/MainScreen";
import { LoadingView } from "./src/components/LoadingView";
import { SignInScreen } from "./src/screens/SignInScreen";

// Keep the launch splash up until we know which screen to show (see Root), so a signed-in person
// never glimpses the sign-in screen while Firebase restores their session.
const SLOW_START_MS = 6000;
SplashScreen.preventAutoHideAsync().catch((err) => console.error("Could not hold the launch splash screen", err));

function Root() {
  const theme = useTheme();
  const { user, claims, loading: authLoading } = useAuth();
  const { status, loading: accessLoading } = useAccessStatus(user, claims);
  const screen = startupScreen({ authLoading, signedIn: !!user, accessLoading, access: status });
  const [splashHidden, setSplashHidden] = useState(false);
  // A launch that takes this long (a slow or dead network) swaps the splash for the visible Loading spinner, so the app never looks frozen.
  const [slowStart, setSlowStart] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlowStart(true), SLOW_START_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if ((screen === "starting" && !slowStart) || splashHidden) return;
    SplashScreen.hideAsync()
      .catch((err) => console.error("Could not hide the launch splash screen", err))
      .finally(() => setSplashHidden(true));
  }, [screen, slowStart, splashHidden]);

  // The signed-in app puts its own tab bar at the very bottom (it fills the home-indicator strip itself), so only the top is inset here.
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]} edges={screen === "app" ? ["top"] : ["top", "bottom"]}>
      <StatusBar style="auto" />
      <Body screen={screen} uid={user?.uid} splashHidden={splashHidden} />
    </SafeAreaView>
  );
}

function Body({ screen, uid, splashHidden }: { screen: StartupScreen; uid: string | undefined; splashHidden: boolean }) {
  switch (screen) {
    // Behind the splash at launch there is nothing to draw; later (e.g. just after signing in) show progress.
    case "starting":
      return splashHidden ? <LoadingView text="Loading" /> : <View />;
    case "sign-in":
      return <SignInScreen />;
    case "pending":
    case "revoked":
      return <AccessPendingScreen status={screen} />;
    case "app":
      return <MainScreen key={uid} />;
  }
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
