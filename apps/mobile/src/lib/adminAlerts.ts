import * as Notifications from "expo-notifications";
import { Linking } from "react-native";
import { adminLinkFromNotification } from "@random-knowledge/shared/notification-link";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

/**
 * Makes an alert push (someone is waiting for access) show while the app is open, and opens the web access
 * page when it is tapped. Only an /admin link on this app's own site is ever opened. Returns the cleanup.
 */
export function configureAdminAlerts(): () => void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const link = adminLinkFromNotification(response.notification.request.content.data, API_BASE_URL);
    if (!link) return;
    Linking.openURL(link).catch((err) => console.error(`Could not open ${link} from a notification`, err));
  });
  return () => subscription.remove();
}
