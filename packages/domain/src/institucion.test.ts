import { describe, expect, it } from "vitest";

import { pickMembership } from "./institucion";

const member = (organizationId: string, role = "member") => ({ organizationId, role });

describe("pickMembership", () => {
  it("prefiere la institución aunque haya otra más antigua, activa o propia", () => {
    const memberships = [member("otra", "owner"), member("institucion")];
    expect(pickMembership(memberships, "institucion", "otra")?.organizationId).toBe("institucion");
  });

  it("sin membresía en la institución, respeta la activa", () => {
    const memberships = [member("a", "owner"), member("b")];
    expect(pickMembership(memberships, "institucion", "b")?.organizationId).toBe("b");
  });

  it("sin institución ni activa, prefiere la propia y si no la primera", () => {
    expect(pickMembership([member("a"), member("b", "owner")], null, null)?.organizationId).toBe(
      "b",
    );
    expect(pickMembership([member("a"), member("b")], null, null)?.organizationId).toBe("a");
  });

  it("sin membresías no elige nada", () => {
    expect(pickMembership([], "institucion", null)).toBeUndefined();
  });
});
