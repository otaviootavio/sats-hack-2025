import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { hash } from "bcryptjs";
import { env } from "~/env";
// import DiscordProvider from "next-auth/providers/discord";

import { db } from "~/server/db";

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      // ...other properties
      // role: UserRole;
    } & DefaultSession["user"];
  }

  // interface User {
  //   // ...other properties
  //   // role: UserRole;
  // }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */ 
export const authConfig = {
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        username: {
          label: "Username",
          type: "text",
          placeholder: "satoshi",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const { username, password } = credentials;

        if (typeof username !== "string" || typeof password !== "string") {
          return null;
        }

        const normalizedUsername = username.trim();

        if (!normalizedUsername) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { username: normalizedUsername },
        });

        if (!user?.passwordHash || !user.passwordSalt) {
          return null;
        }

        const hashedPassword = await hash(password, user.passwordSalt);

        if (hashedPassword !== user.passwordHash) {
          return null;
        }

        return {
          id: user.id,
          name: user.name ?? user.username ?? undefined,
          email: user.email ?? undefined,
        };
      },
    }),
    GitHub({
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    }),
    // DiscordProvider,
    /**
     * ...add more providers here.
     *
     * Most other providers require a bit more work than the Discord provider. For example, the
     * GitHub provider requires you to add the `refresh_token_expires_in` field to the Account
     * model. Refer to the NextAuth.js docs for the provider you want to use. Example:
     *
     * @see https://next-auth.js.org/providers/github
     */
  ],
  adapter: PrismaAdapter(db),
  pages: {
    signIn: "/login",
    signOut: "/logout",
  },
  callbacks: {
    session: ({ session, token }) => {
      if (session.user && token?.sub) {
        session.user.id = token.sub ?? session.user.id;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
