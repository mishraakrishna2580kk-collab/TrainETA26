import os


APP_NAME = "Indian Railway Dynamic ETA API"
APP_VERSION = "0.2.0"

HOST = os.getenv("API_HOST", "127.0.0.1")
PORT = int(os.getenv("API_PORT", "8000"))
