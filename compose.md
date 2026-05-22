# Docker Compose guide

## Quick start

Copy `.env.example` to `.env` and fill in your file paths:

```
cp .env.example .env
```

Then start the app:

```
docker compose up --build
```

The frontend is available at http://localhost:8080.

## Services

| Service | Port | Description |
|---|---|---|
| `visualizer` | 8080 | React app served by Nginx |
| `sequence_server` | 8003 | Mock server (optional, see below) |

## Mock server

`sequence_server` is gated behind the `sequence_server` profile. It serves a local JSON sequence file over HTTP/WebSocket so the frontend can be used without a real backend.

**Enable it** by setting `COMPOSE_PROFILES=sequence_server` in your `.env`:

```
COMPOSE_PROFILES=sequence_server
SEQUENCE_FILE=/path/to/your/sequence.json
HARDWARE_FILE=/path/to/your/hardware_description.json
```

**Disable it** by leaving `COMPOSE_PROFILES` empty or removing it — only the frontend will start.

You can also activate the sequence_server profile from the CLI without editing `.env`:

```
docker compose --profile sequence_server up --build
```

## `.env` reference

| Variable | Default | Description |
|---|---|---|
| `COMPOSE_PROFILES` | _(empty)_ | Set to `sequence_server` to enable the sequence_server service |
| `VISUALIZER_PORT` | `8080` | Host port mapped to the frontend |
| `SEQUENCE_SERVER_PORT` | `8003` | Host port mapped to the sequence server |
| `SEQUENCE_FILE` | — | Host path to the sequence JSON file (required with `sequence_server` profile) |
| `HARDWARE_FILE` | — | Host path to the hardware description JSON file (required with `sequence_server` profile) |
