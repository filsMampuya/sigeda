import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getValidServerAuthToken } from "@/lib/server-auth";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getValidServerAuthToken()) {
    redirect("/dashboard");
  }

  return <LoginForm autoRedirect={!searchParams?.error} errorCode={searchParams?.error} />;
}
