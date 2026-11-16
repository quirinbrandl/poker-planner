"""Serve the throwaway cash-game result/correction review; no dependencies."""

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
    parser.add_argument("--port", type=int, default=4189)
    args = parser.parse_args()
    handler = partial(ReviewHandler, directory=str(Path(__file__).resolve().parent))
    print(f"Result entry · Review v2: http://127.0.0.1:{args.port}/?variant=B&walk=count", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), handler).serve_forever()
