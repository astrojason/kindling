import { redirect } from "next/navigation";

/** Previous lessons and saved lessons live on Review now. */
export default function LibraryPage() {
  redirect("/review");
}
