"use client";

import Link from "next/link";
import { Github, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";

const loginSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters long.")
    .max(64, "Username must be 64 characters or fewer."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [formError, setFormError] = useState<string | null>(null);
  const [isGitHubPending, setIsGitHubPending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    resetField,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (!errorParam) {
      setFormError(null);
      return;
    }

    if (errorParam === "CredentialsSignin") {
      setFormError("Invalid username or password.");
      resetField("password");
      return;
    }

    setFormError("Unable to sign in. Please try again.");
  }, [errorParam, resetField]);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const result = await signIn("credentials", {
      ...values,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setFormError("Invalid username or password.");
      resetField("password");
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  });

  const handleGitHubSignIn = async () => {
    try {
      setIsGitHubPending(true);
      await signIn("github", { callbackUrl });
    } catch (error) {
      console.error(error);
      setIsGitHubPending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.3),transparent_55%)] from-background to-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(147,197,253,0.08),rgba(167,139,250,0.12)_40%,rgba(248,113,113,0.04)_75%)]" />
      <div className="absolute inset-0 -z-10 backdrop-blur-[2px]" />

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <Card className="relative mx-auto max-w-md overflow-hidden border-border/60 bg-background/70 shadow-xl shadow-primary/5 backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-semibold tracking-tight">
              Sign in to continue
            </CardTitle>
            <CardDescription>
              Use your credentials or continue with GitHub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2 text-left">
                <label
                  className="block text-sm font-medium text-foreground"
                  htmlFor="username"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="satoshi"
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-4 py-2.5 text-sm shadow-inner outline-none transition focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                  disabled={isSubmitting}
                  {...register("username")}
                />
                {errors.username ? (
                  <p className="text-sm font-medium text-destructive">
                    {errors.username.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2 text-left">
                <label
                  className="block text-sm font-medium text-foreground"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Your secure password"
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-4 py-2.5 text-sm shadow-inner outline-none transition focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                  disabled={isSubmitting}
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-sm font-medium text-destructive">
                    {errors.password.message}
                  </p>
                ) : null}
              </div>

              {formError ? (
                <p className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 bg-foreground text-background transition-transform hover:scale-[1.01] disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Sign in with credentials
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide text-muted-foreground">
                <span className="bg-background px-2">or continue with</span>
              </div>
            </div>

            <Button
              size="lg"
              type="button"
              className="w-full gap-3 bg-linear-to-r from-blue-600 via-purple-600 to-indigo-600 font-semibold text-white shadow-md shadow-purple-500/20 transition-transform hover:scale-[1.01] hover:shadow-lg disabled:cursor-wait"
              onClick={handleGitHubSignIn}
              disabled={isGitHubPending}
            >
              {isGitHubPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Github className="size-5" />
              )}
              Continue with GitHub
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              We only use your account details to authenticate you. No repository
              access required.
            </div>

            <div className="text-center text-sm text-muted-foreground">
              New here? <Link href="/register" className="text-foreground underline-offset-4 hover:underline">Create an account</Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading login…
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
