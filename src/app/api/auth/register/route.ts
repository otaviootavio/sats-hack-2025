import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";
import { genSalt, hash } from "bcryptjs";

export const runtime = "nodejs";

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters long.")
      .max(64, "Username must be 64 characters or fewer.")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
    password: z.string().min(8, "Password must be at least 8 characters long."),
  })
  .strict();

export async function POST(req: Request) {
  try {
    const body: unknown = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { username, password } = parsed.data;

    const existing = await db.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: { message: "Username is already taken." } },
        { status: 409 },
      );
    }

    const salt = await genSalt(12);
    const passwordHash = await hash(password, salt);

    await db.user.create({
      data: {
        username,
        passwordSalt: salt,
        passwordHash,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: { message: "Unexpected error creating account." } },
      { status: 500 },
    );
  }
}
