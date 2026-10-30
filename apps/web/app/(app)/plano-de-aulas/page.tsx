import { redirect } from "next/navigation";

export default function PlanoDeAulasPage() {
  redirect("/aulas?vista=plano");
}
