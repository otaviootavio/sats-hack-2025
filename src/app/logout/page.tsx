"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

export default function LogoutPage() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.3),transparent_55%)] from-background to-background">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(147,197,253,0.08),rgba(167,139,250,0.12)_40%,rgba(248,113,113,0.04)_75%)]" />
      <div className="absolute inset-0 -z-10 backdrop-blur-[2px]" />

      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <Card className="relative mx-auto max-w-md overflow-hidden border-border/60 bg-background/70 shadow-xl shadow-primary/5 backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-linear-to-r from-blue-500 via-purple-500 to-pink-500" />
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-semibold tracking-tight">
              Ready to sign out?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              size="lg"
              className="w-full gap-3 bg-linear-to-r from-rose-500 via-red-500 to-orange-500 font-semibold text-white shadow-md shadow-rose-500/20 transition-transform hover:scale-[1.01] hover:shadow-lg"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="size-5" />
              Sign out and return home
            </Button>

            <Button variant="ghost" asChild className="w-full">
              <Link href="/">Stay logged in</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
