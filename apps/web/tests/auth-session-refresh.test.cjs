const test = require("node:test");
const assert = require("node:assert/strict");
const loadApiClient = require("./helpers/load-api-client.cjs");

const apiBase = "https://java.test/api/v1";
const user = { id: "synthetic-student", displayName: "Sinh viên thử", role: "STUDENT" };

test("an expired access token refreshes once and retries the protected request", async () => {
  const calls = [];
  const client = loadApiClient(async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith("/auth/login")) return Response.json({ user, accessToken: "old-token" });
    if (url.endsWith("/auth/refresh")) return Response.json({ accessToken: "new-token" });
    if (url.endsWith("/me") && options.headers.get("Authorization") === "Bearer old-token") {
      return Response.json({ code: "INVALID_SESSION", message: "Expired" }, { status: 401 });
    }
    if (url.endsWith("/me") && options.headers.get("Authorization") === "Bearer new-token") return Response.json(user);
    throw new Error(`Unexpected request ${url}`);
  }, apiBase);

  await client.authApi.login({ identifier: "student@stu.ptit.edu.vn", password: "synthetic" });
  assert.equal((await client.authApi.getMe()).id, user.id);
  assert.deepEqual(calls.map((call) => call.url.slice(apiBase.length)), ["/auth/login", "/me", "/auth/refresh", "/me"]);
  assert.equal(calls[2].options.credentials, "include");
  assert.equal(calls[2].options.headers, undefined, "refresh must not send the expired bearer token");
  assert.equal(calls[3].options.headers.get("Authorization"), "Bearer new-token");
});

test("concurrent 401 responses rotate the refresh cookie only once", async () => {
  let refreshCount = 0;
  const client = loadApiClient(async (url, options) => {
    if (url.endsWith("/auth/login")) return Response.json({ user, accessToken: "old-token" });
    if (url.endsWith("/auth/refresh")) {
      refreshCount++;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return new Response(null, { status: 204 });
    }
    if (url.endsWith("/me") && options.headers.has("Authorization")) return new Response(null, { status: 401 });
    if (url.endsWith("/me")) return Response.json(user);
    throw new Error(`Unexpected request ${url}`);
  }, apiBase);

  await client.authApi.login({ identifier: "student@stu.ptit.edu.vn", password: "synthetic" });
  const profiles = await Promise.all([client.authApi.getMe(), client.authApi.getMe()]);
  assert.equal(refreshCount, 1);
  assert.deepEqual(profiles.map((profile) => profile.id), [user.id, user.id]);
});

test("a rejected refresh does not retry the protected request or refresh invalid login", async () => {
  let refreshCount = 0;
  let profileCount = 0;
  const client = loadApiClient(async (url) => {
    if (url.endsWith("/auth/login")) return new Response(null, { status: 401 });
    if (url.endsWith("/auth/refresh")) { refreshCount++; return new Response(null, { status: 401 }); }
    if (url.endsWith("/me")) { profileCount++; return new Response(null, { status: 401 }); }
    throw new Error(`Unexpected request ${url}`);
  }, apiBase);

  await assert.rejects(client.authApi.login({ identifier: "wrong", password: "wrong" }), { status: 401 });
  assert.equal(refreshCount, 0);
  await assert.rejects(client.authApi.getMe(), { status: 401 });
  assert.equal(refreshCount, 1);
  assert.equal(profileCount, 1);
});
