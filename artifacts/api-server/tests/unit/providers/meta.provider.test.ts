import { afterEach, describe, expect, it } from "vitest";
import {
  MetaProvider,
  FACEBOOK_INSIGHTS_SCOPE,
  INSTAGRAM_INSIGHTS_SCOPE,
} from "../../../src/services/MetaProvider.js";
import { encryptToken } from "../../../src/utils/crypto.js";
import { HttpError } from "../../../src/utils/http.js";
import { installFetchMock } from "../../../src/test/fetchMock.js";

describe("MetaProvider scope helpers", () => {
  const provider = new MetaProvider();

  describe("hasFacebookInsightsScope", () => {
    it("returns true only when read_insights is granted", () => {
      expect(provider.hasFacebookInsightsScope(FACEBOOK_INSIGHTS_SCOPE)).toBe(true);
      expect(
        provider.hasFacebookInsightsScope(`pages_read_engagement,${FACEBOOK_INSIGHTS_SCOPE}`),
      ).toBe(true);
      expect(provider.hasFacebookInsightsScope("pages_read_engagement")).toBe(false);
      expect(provider.hasFacebookInsightsScope(undefined)).toBe(false);
      expect(provider.hasFacebookInsightsScope(null)).toBe(false);
    });
  });

  describe("hasInstagramInsightsScope", () => {
    it("accepts any of the IG insights or basic-display scopes", () => {
      expect(provider.hasInstagramInsightsScope(INSTAGRAM_INSIGHTS_SCOPE)).toBe(true);
      expect(provider.hasInstagramInsightsScope("instagram_manage_insights")).toBe(true);
      expect(provider.hasInstagramInsightsScope("user_profile")).toBe(true);
      expect(provider.hasInstagramInsightsScope("user_media")).toBe(true);
      expect(provider.hasInstagramInsightsScope("openid email")).toBe(false);
      expect(provider.hasInstagramInsightsScope(null)).toBe(false);
    });
  });
});

describe("MetaProvider — typed errors on the authenticated path", () => {
  const provider = new MetaProvider();
  let restore: () => void = () => {};
  afterEach(() => restore());

  it("Facebook normalized metrics surfaces a typed HttpError with status=401 on revoked tokens", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("graph.facebook.com"),
          respond: () => ({
            status: 401,
            body: {
              error: {
                code: 190,
                message: "Error validating access token: Session has expired",
                type: "OAuthException",
              },
            },
          }),
        },
      ],
    });
    restore = installed.restore;

    const token = encryptToken("fb-revoked");
    const err = await provider
      .getFacebookNormalizedMetrics(token, FACEBOOK_INSIGHTS_SCOPE, 28)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(401);
  });

  it("Instagram normalized metrics surfaces a typed HttpError with status=401 on revoked tokens", async () => {
    const installed = installFetchMock({
      routes: [
        {
          match: (url) => url.includes("graph.instagram.com") || url.includes("graph.facebook.com"),
          respond: () => ({
            status: 401,
            body: { error: { code: 190, message: "Token expired" } },
          }),
        },
      ],
    });
    restore = installed.restore;

    const token = encryptToken("ig-revoked");
    const err = await provider
      .getInstagramNormalizedMetrics(token, INSTAGRAM_INSIGHTS_SCOPE, 28)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).status).toBe(401);
  });
});
