import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getServerAuthToken } from "@/lib/auth";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  if (getServerAuthToken()) {
    redirect("/dashboard");
  }

  return <LoginForm autoRedirect={!searchParams?.error} errorCode={searchParams?.error} />;
}
