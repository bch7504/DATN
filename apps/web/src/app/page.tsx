import { redirect } from "next/navigation";

export default function HomePage(): never {
  redirect("/student/dashboard");
}
