import { describe, expect, it } from "vitest";
import {
  HealthCheckResponse,
  ConnectYoutubeBody,
  ConnectInstagramBody,
  ConnectFacebookBody,
  DisconnectPlatformParams,
  FetchMetadataFromUrlBody,
  ListFetchHistoryQueryParams,
  ListRecentMetadataQueryParams,
} from "@workspace/api-zod";

describe("@workspace/api-zod schemas", () => {
  it("HealthCheckResponse accepts the canonical ok shape", () => {
    expect(HealthCheckResponse.safeParse({ status: "ok" }).success).toBe(true);
  });

  it("ConnectYoutubeBody requires accessToken and accountName", () => {
    expect(
      ConnectYoutubeBody.safeParse({ accessToken: "a", accountName: "b" }).success,
    ).toBe(true);
    expect(ConnectYoutubeBody.safeParse({ accessToken: "a" }).success).toBe(false);
    expect(ConnectYoutubeBody.safeParse({}).success).toBe(false);
  });

  it("ConnectInstagramBody and ConnectFacebookBody have the same shape", () => {
    const ok = { accessToken: "t", accountName: "a" };
    expect(ConnectInstagramBody.safeParse(ok).success).toBe(true);
    expect(ConnectFacebookBody.safeParse(ok).success).toBe(true);
  });

  it("DisconnectPlatformParams enforces the supported platform enum", () => {
    expect(DisconnectPlatformParams.safeParse({ platform: "youtube" }).success).toBe(true);
    expect(DisconnectPlatformParams.safeParse({ platform: "instagram" }).success).toBe(true);
    expect(DisconnectPlatformParams.safeParse({ platform: "facebook" }).success).toBe(true);
    expect(DisconnectPlatformParams.safeParse({ platform: "myspace" }).success).toBe(false);
    expect(DisconnectPlatformParams.safeParse({}).success).toBe(false);
  });

  it("FetchMetadataFromUrlBody requires a url", () => {
    expect(
      FetchMetadataFromUrlBody.safeParse({ url: "https://youtube.com/watch?v=x" }).success,
    ).toBe(true);
    expect(FetchMetadataFromUrlBody.safeParse({}).success).toBe(false);
  });

  it("ListFetchHistoryQueryParams coerces and defaults numeric values", () => {
    const ok = ListFetchHistoryQueryParams.parse({});
    expect(ok.limit).toBe(20);
    expect(ok.offset).toBe(0);
    const coerced = ListFetchHistoryQueryParams.parse({ limit: "5", offset: "10" });
    expect(coerced.limit).toBe(5);
    expect(coerced.offset).toBe(10);
  });

  it("ListRecentMetadataQueryParams accepts limit overrides", () => {
    const parsed = ListRecentMetadataQueryParams.safeParse({ limit: "15" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.limit).toBe(15);
  });
});
