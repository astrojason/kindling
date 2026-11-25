import { redirect } from "next/navigation";

/** Settings live on the Profile page now, under the profile. */
export default function SettingsPage() {
  redirect("/profile");
}
