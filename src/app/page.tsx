import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

export default async function Home() {
  const session = await auth();

  if (session?.user) {
    return redirect("/playground");
  }

  return (
    <HydrateClient>
      <main className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-purple-50/30 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/20">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md dark:bg-gray-950/80">
          <div className="container mx-auto flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="text-3xl">⚡</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
                SimplifyIDE
              </span>
            </div>
            <Link href="/api/auth/signin">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <span className="mr-2">🚀</span> Login
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-2 text-sm font-medium text-purple-900 shadow-sm dark:border-purple-800 dark:from-blue-900/30 dark:to-purple-900/30 dark:text-purple-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500"></span>
              </span>
              SimplifyIDE - Now Live
            </div>
            <h1 className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent sm:text-6xl lg:text-7xl">
              The IDE for Simplicity
            </h1>
            <p className="text-3xl font-bold">
              Deploy Bitcoin contracts.
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                One click. Zero setup. ✨
              </span>
            </p>
            <div className="flex items-center justify-center gap-4 pt-6">
              <Link href="/api/auth/signin">
                <Button
                  size="lg"
                  className="group bg-gradient-to-r from-blue-600 to-purple-600 px-8 shadow-lg shadow-purple-500/30 transition-all hover:scale-105 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl hover:shadow-purple-500/40"
                >
                  Get Started{" "}
                  <span className="ml-1 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="container mx-auto px-4 py-20">
          <h2 className="mb-4 text-center text-4xl font-bold">How It Works</h2>
          <p className="text-muted-foreground mb-12 text-center text-lg">
            Six features that make Bitcoin development magical
          </p>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="group border-2 border-purple-100 transition-all hover:scale-105 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 dark:border-purple-900">
              <CardHeader>
                <div className="mb-2 text-4xl">🔐</div>
                <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  GitHub Login
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  One click. Pick example code. Hit compile.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-2 border-purple-100 transition-all hover:scale-105 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 dark:border-purple-900">
              <CardHeader>
                <div className="mb-2 text-4xl">⚙️</div>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  WASM Compiler
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Runs in your browser. Zero local setup.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-2 border-purple-100 transition-all hover:scale-105 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 dark:border-purple-900">
              <CardHeader>
                <div className="mb-2 text-4xl">🚀</div>
                <CardTitle className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                  Instant Deploy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Liquid Testnet in seconds. Pay-to-taproot ready.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-2 border-purple-100 transition-all hover:scale-105 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 dark:border-purple-900">
              <CardHeader>
                <div className="mb-2 text-4xl">🤖</div>
                <CardTitle className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  AI Co-Pilot
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Explains your contracts in plain English.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-2 border-purple-100 transition-all hover:scale-105 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 dark:border-purple-900">
              <CardHeader>
                <div className="mb-2 text-4xl">✅</div>
                <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Formally Verified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Bitcoin&apos;s security. Mathematical precision.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group border-2 border-purple-100 transition-all hover:scale-105 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-500/10 dark:border-purple-900">
              <CardHeader>
                <div className="mb-2 text-4xl">🎯</div>
                <CardTitle className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  No Setup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  No RPCs. No builds. Just code and deploy.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden border-t border-purple-100 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 py-24 dark:border-purple-900">
          <div className="bg-grid-white/10 absolute inset-0"></div>
          <div className="relative container mx-auto px-4 text-center">
            <div className="mx-auto max-w-3xl space-y-8">
              <div className="text-6xl">🎉</div>
              <h2 className="text-5xl font-extrabold text-white sm:text-6xl">
                Deploy Bitcoin Contracts
                <br />
                Like It&apos;s 2025
              </h2>
              <p className="text-2xl font-semibold text-white/90">
                Code to contract. Idea to blockchain. One click.
              </p>
              <div className="pt-6">
                <Link href="/api/auth/signin">
                  <Button
                    size="lg"
                    className="group bg-white px-10 py-6 text-lg font-bold text-purple-600 shadow-2xl transition-all hover:scale-110 hover:bg-gray-50"
                  >
                    Get Started Now{" "}
                    <span className="ml-2 transition-transform group-hover:translate-x-2">
                      🚀
                    </span>
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-white/70">
                Join hundreds of developers building the future of Bitcoin
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-purple-100 bg-gradient-to-b from-white to-blue-50/30 py-12 dark:border-purple-900 dark:from-gray-950 dark:to-blue-950/20">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center gap-6 text-center">
              <div className="flex items-center gap-2">
                <span className="text-3xl">⚡</span>
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-2xl font-bold text-transparent">
                  SimplifyIDE
                </span>
              </div>
              <p className="text-muted-foreground">
                Built for Bitcoin developers 🔶
              </p>
              <div className="text-muted-foreground flex gap-6 text-sm">
                <span>
                  Made with 💜 for the Bitcoin community @{" "}
                  <a
                    href="https://satshack3.devpost.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-purple-700 transition-colors"
                  >
                    SatsHack3
                  </a>
                </span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </HydrateClient>
  );
}
