"use client";

import Link from "next/link";
import { Loader2, UserPlus } from "lucide-react";
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

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters long.")
      .max(64, "Username must be 64 characters or fewer.")
      .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores are allowed."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"],
  });

const registerErrorSchema = z
  .object({
    error: z
      .object({
        message: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

type RegisterFormValues = z.infer<typeof registerSchema>;

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";

  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    resetField,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    setFormError(null);
  }, []);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: values.username, password: values.password }),
    });

    if (!res.ok) {
      let errorMessage = "Registration failed.";
      try {
        const data: unknown = await res.json();
        const parsed = registerErrorSchema.safeParse(data);
        if (parsed.success) {
          errorMessage = parsed.data.error?.message ?? errorMessage;
        }
      } catch {
        // Ignore JSON parsing errors and fall back to default message.
      }
      setFormError(errorMessage);
      resetField("password");
      resetField("confirmPassword");
      return;
    }

    const result = await signIn("credentials", {
      username: values.username,
      password: values.password,
      redirect: false,
      callbackUrl,
    });

    if (result?.error) {
      setFormError("Account created, but automatic sign-in failed. Please log in.");
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    router.push(result?.url ?? callbackUrl);
    router.refresh();
  });

  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.3),transparent_55%)] from-background to-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(147,197,253,0.08),rgba(167,139,250,0.12)_40%,rgba(248,113,113,0.04)_75%)]" />
      <div className="absolute inset-0 -z-10 backdrop-blur-[2px]" />

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <Card className="relative mx-auto max-w-md overflow-hidden border-border/60 bg-background/70 shadow-xl shadow-primary/5 backdrop-blur min-w-md">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-semibold tracking-tight">
              Create your account
            </CardTitle>
            <CardDescription>
              Choose a username and a secure password.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-2 text-left">
                <label className="block text-sm font-medium text-foreground" htmlFor="username">
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
                  <p className="text-sm font-medium text-destructive">{errors.username.message}</p>
                ) : null}
              </div>

              <div className="space-y-2 text-left">
                <label className="block text-sm font-medium text-foreground" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Your secure password"
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-4 py-2.5 text-sm shadow-inner outline-none transition focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                  disabled={isSubmitting}
                  {...register("password")}
                />
                {errors.password ? (
                  <p className="text-sm font-medium text-destructive">{errors.password.message}</p>
                ) : null}
              </div>

              <div className="space-y-2 text-left">
                <label className="block text-sm font-medium text-foreground" htmlFor="confirmPassword">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  className="w-full rounded-lg border border-border/60 bg-background/80 px-4 py-2.5 text-sm shadow-inner outline-none transition focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                  disabled={isSubmitting}
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword ? (
                  <p className="text-sm font-medium text-destructive">{errors.confirmPassword.message}</p>
                ) : null}
              </div>

              {formError ? (
                <p className="text-sm font-medium text-destructive">{formError}</p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 bg-foreground text-background transition-transform hover:scale-[1.01] disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                Create account
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-foreground underline-offset-4 hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading register…
          </div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
