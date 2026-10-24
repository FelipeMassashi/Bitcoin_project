import { describe, expect, it } from "vitest";
import { signedQuery } from "./sign";

describe("signedQuery", () => {
  it("assina como no exemplo oficial da Binance (HMAC-SHA256)", () => {
    // https://developers.binance.com/docs/binance-spot-api-docs/rest-api/endpoint-security-type
    const secret = "NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j";
    const query = signedQuery(
      { symbol: "LTCBTC", side: "BUY", type: "LIMIT", timeInForce: "GTC", quantity: 1, price: 0.1, recvWindow: 5000, timestamp: 1499827319559 },
      secret,
    );
    expect(query).toBe(
      "symbol=LTCBTC&side=BUY&type=LIMIT&timeInForce=GTC&quantity=1&price=0.1&recvWindow=5000&timestamp=1499827319559" +
        "&signature=c8db56825ae71d6d79447849e617115f4a920fa2acdcab2b053c4b2838bd6b71",
    );
  });
});
