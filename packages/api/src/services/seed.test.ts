import { execSync } from "node:child_process";
import { resolve } from "node:path";

import { prisma } from "@repo/db";
import { institutionSlug } from "@repo/domain";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDatabase } from "../test/db";

const databaseUrl = process.env.DATABASE_URL ?? "";

const runSeed = () =>
  execSync("pnpm exec prisma db seed", {
    cwd: resolve(import.meta.dirname, "../../../db"),
    env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: databaseUrl },
    stdio: "pipe",
  });

beforeEach(resetDatabase);

describe("seed", () => {
  it("elimina la Organización demo del template y deja a demo@example.com en la institución", async () => {
    await prisma.user.create({
      data: { id: "demo-user", name: "Demo", email: "demo@example.com" },
    });
    await prisma.organization.create({
      data: {
        id: "demo-org",
        name: "Organización demo",
        slug: "demo-org",
        createdAt: new Date(),
        members: {
          create: { id: "demo-member", userId: "demo-user", role: "owner", createdAt: new Date() },
        },
      },
    });

    runSeed();

    expect(await prisma.organization.findUnique({ where: { id: "demo-org" } })).toBeNull();
    expect(await prisma.member.count({ where: { id: "demo-member" } })).toBe(0);
    const memberships = await prisma.member.findMany({
      where: { userId: "demo-user" },
      include: { organization: true },
    });
    expect(memberships.map((member) => member.organization.slug)).toEqual([institutionSlug]);
  }, 60_000);
});
