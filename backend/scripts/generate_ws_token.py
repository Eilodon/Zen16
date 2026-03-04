#!/usr/bin/env python3
"""Generate HS256 JWT for Zen16 WebSocket auth."""

import argparse
import base64
import hashlib
import hmac
import json
import time


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _encode_json(payload: dict) -> str:
    return _b64url_encode(
        json.dumps(payload, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate JWT for /live websocket auth")
    parser.add_argument("--secret", required=True, help="WS_JWT_SECRET value")
    parser.add_argument("--aud", default="zen16-live", help="Token audience")
    parser.add_argument("--sub", default="local-dev", help="Token subject")
    parser.add_argument("--ttl", type=int, default=3600, help="Token TTL in seconds")
    args = parser.parse_args()

    now = int(time.time())

    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": args.sub,
        "aud": args.aud,
        "iat": now,
        "nbf": now,
        "exp": now + max(1, args.ttl),
    }

    header_b64 = _encode_json(header)
    payload_b64 = _encode_json(payload)
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    signature = hmac.new(
        args.secret.encode("utf-8"),
        signing_input,
        hashlib.sha256,
    ).digest()

    token = f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"
    print(token)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
