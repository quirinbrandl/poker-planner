"""Serve the throwaway cash-game Play review; no dependencies or caching."""

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class ReviewHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=4188)
    args = parser.parse_args()
    handler = partial(ReviewHandler, directory=str(Path(__file__).resolve().parent))
    print(f"Cash-game Play · Review v3: http://127.0.0.1:{args.port}/?review=v3&variant=A&rebuy=popup", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), handler).serve_forever()
