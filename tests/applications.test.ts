import { describe, expect, it } from "vitest";
import type { RequestHandler, Router } from "express";
import {
  getApplicationsByStatus,
  getApplicationsMissingNextAction,
  getDueSoonApplications,
  type JobApplication
} from "../src/domain/applications";
import { createApplicationRouter } from "../src/server/api/applications";
import { InMemoryApplicationRepository } from "../src/server/storage/repositories/in-memory-applications";

describe("application recommendations", () => {
  it("returns active applications due within the given window", () => {
    const applications: JobApplication[] = [
      makeApplication({ id: "app-1", company: "B Corp", deadline: "2026-06-29" }),
      makeApplication({ id: "app-4", company: "A Corp", deadline: "2026-06-29" }),
      makeApplication({ id: "app-2", company: "B Corp", deadline: "2026-07-05" }),
      makeApplication({ id: "app-3", company: "C Corp", deadline: "2026-06-30", status: "archived" })
    ];

    const dueSoon = getDueSoonApplications(
      applications,
      new Date("2026-06-28T00:00:00.000Z"),
      3
    );

    expect(dueSoon.map((application) => application.id)).toEqual(["app-4", "app-1"]);
  });

  it("returns active applications with no next action", () => {
    const applications: JobApplication[] = [
      makeApplication({ id: "app-1", nextAction: "이력서 수정" }),
      makeApplication({ id: "app-2", nextAction: "" }),
      makeApplication({ id: "app-3", status: "rejected" })
    ];

    const missingNextAction = getApplicationsMissingNextAction(applications);

    expect(missingNextAction.map((application) => application.id)).toEqual(["app-2"]);
  });

  it("sorts status matches by deadline, company, and id", () => {
    const applications: JobApplication[] = [
      makeApplication({ id: "app-3", company: "Beta", status: "applied", deadline: "2026-07-01" }),
      makeApplication({ id: "app-2", company: "Alpha", status: "applied", deadline: "2026-06-30" }),
      makeApplication({ id: "app-1", company: "Alpha", status: "applied", deadline: "2026-06-30" }),
      makeApplication({ id: "app-4", company: "Ignored", status: "preparing" })
    ];

    const applied = getApplicationsByStatus(applications, "applied");

    expect(applied.map((application) => application.id)).toEqual(["app-1", "app-2", "app-3"]);
  });
});

describe("applications API", () => {
  it("patches job applications and filters the list", async () => {
    const repository = new InMemoryApplicationRepository();
    const router = createApplicationRouter(repository);

    const created = await invokeRoute<JobApplication>(router, "post", "/applications", {
      body: {
        company: "Wanted Labs",
        role: "Backend Developer",
        status: "preparing",
        deadline: todayPlusDays(2),
        nextAction: "이력서 수정"
      }
    });

    const patched = await invokeRoute<JobApplication>(router, "patch", "/applications/:id", {
      params: { id: created.body.data.id },
      body: {
        status: "applied",
        nextAction: "",
        notes: "지원 완료"
      }
    });

    const listed = await invokeRoute<JobApplication[]>(router, "get", "/applications", {
      query: {
        status: "applied",
        dueWithinDays: "3",
        missingNextAction: "true"
      }
    });

    expect(patched.statusCode).toBe(200);
    expect(patched.body.data).toMatchObject({
      id: created.body.data.id,
      company: "Wanted Labs",
      role: "Backend Developer",
      status: "applied",
      nextAction: "",
      notes: "지원 완료"
    });
    expect(listed.body.data.map((application) => application.id)).toEqual([created.body.data.id]);
  });
});

function makeApplication(overrides: Partial<JobApplication> = {}): JobApplication {
  return {
    id: "app-1",
    company: "Wanted Labs",
    role: "Backend Developer",
    status: "preparing",
    ...overrides
  };
}

function todayPlusDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

type RouteMethod = "get" | "post" | "patch";

type RouteLayer = {
  route?: {
    path: string;
    methods: Partial<Record<RouteMethod, boolean>>;
    stack: Array<{ handle: RequestHandler }>;
  };
};

type RouteRequest = {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: unknown;
};

async function invokeRoute<TData extends JobApplication | JobApplication[]>(
  router: Router,
  method: RouteMethod,
  path: string,
  request: RouteRequest
): Promise<{ statusCode: number; body: { data: TData } }> {
  const stack = (router as unknown as { stack: RouteLayer[] }).stack;
  const route = stack.find(
    (layer) => layer.route?.path === path && layer.route.methods[method]
  )?.route;

  if (!route) {
    throw new Error(`Route not found: ${method.toUpperCase()} ${path}`);
  }

  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };

  await route.stack[0].handle(
    {
      params: request.params ?? {},
      query: request.query ?? {},
      body: request.body
    } as Parameters<RequestHandler>[0],
    response as unknown as Parameters<RequestHandler>[1],
    (error?: unknown) => {
      if (error) {
        throw error;
      }
    }
  );

  return response as { statusCode: number; body: { data: TData } };
}
