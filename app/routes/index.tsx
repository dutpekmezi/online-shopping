import { redirect } from "react-router";

export function loader() {
  return redirect("/home");
}

export default function Index() {
  return null;
}
