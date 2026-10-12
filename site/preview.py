"""Loopback-only local preview; does not start or alter game services."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
print('Local preview: http://127.0.0.1:8096',flush=True)
ThreadingHTTPServer(('127.0.0.1',8096),partial(SimpleHTTPRequestHandler,directory=str(Path(__file__).parent/'dist'))).serve_forever()
