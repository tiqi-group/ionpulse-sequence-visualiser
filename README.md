# Ionpulse Sequence Visualiser

A real-time visualisation tool for pulse sequences created with the Experiment Library, PyCrystal, and the ionpulse sequence generator.

![example CoolDet](images/visualizer-cooldet.png)

## Hosted deployment (ETH Zürich)

If you have access to a DPHYS ETH Zürich account, a maintained deployment is available at [tiqidocs.phys.ethz.ch/visualiser/main/](https://tiqidocs.phys.ethz.ch/visualiser/main/). Specific versions can be accessed by browsing the subfolders at [tiqidocs.phys.ethz.ch/visualiser/](https://tiqidocs.phys.ethz.ch/visualiser/).

## Getting Started

### Local deployment

**Docker / Podman (recommended)**

The fastest way to build and deploy locally the application is to run podman compose:

```bash
# podman and podman-compose must be installed
podman compose up
```

The visualiser will be available at [http://localhost:8080](http://localhost:8080).

**Manual deployment on an nginx server**

- Download the build artifacts from the latest successfull pipeline.
- Copy the build artifacts to `/var/www/html/library-visualiser`. This will put the files into `/var/www/html/library-visualiser/dist/`
- Add a server block to the `http` section of `/etc/nginx/nginx.conf`:

```nginx
server {
    listen 80;
    root /var/www/html/library-visualiser/dist/;
    index index.html;
    server_name library-visualiser.lab;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- Restart nginx: `systemctl restart nginx`
- Configure your router to forward the hostname to the nginx server. For example, on an EdgeRouter:
  ```
  address=/library-visualiser.lab/<server-ip-address>
  ```
  under `Config Tree: service → dns → forwarding (options)`.

## Configuration

The visualiser uses cookies to store the address and port of your Experiment Library instance. Go to the _Configure_ menu entry, fill in the connection details, and click _Connect_. The form will indicate whether the connection succeeded.

### Connection issues

If the visualiser cannot reach your Experiment Library instance, your browser may be blocking the request due to mixed content (e.g. if the visualiser is served over HTTPS but the library does not use SSL).

- **Chrome**: allow "insecure content" in the site settings permissions — see [Google's guide](https://support.google.com/chrome/answer/114662)
- **Firefox**: disable "mixed content" blocking — see [Mozilla's guide](https://support.mozilla.org/en-US/kb/mixed-content-blocking-firefox)

## Usage

The visualiser connects to the Experiment Library using [socket.io](https://socket.io/docs/v3). When the library updates its `hardware/scope_sequence` attribute, the visualiser is notified via the socket and immediately renders the new sequence.

Trigger an update from your Library using `update_zedboard_sequence` in any of your experiments.

The visualiser reads `Hardware/hardware_description` from your Library to determine which RF and TTL channels are active, and automatically shows or hides them accordingly. You can also manage channel visibility manually via the _Channels_ button.

The _Hardware_ tab shows the full hardware description of your setup.

The visualiser is built on [plotly.js](https://plotly.com/javascript/), so you can zoom in and out of sequences interactively.

## Development

You will need Node.js 22 LTS. We recommend installing Node.js via [nvm](https://github.com/nvm-sh/nvm) or [n](https://github.com/tj/n) for a system wide installation.

```bash
# Clone the repository
git clone <repo-url>
cd <repo>

# Install Node.js 22 LTS (recommended via nvm or n)
# https://github.com/nvm-sh/nvm
# https://github.com/tj/n

# Install dependencies
npm install

# Start the development server (auto-rebuilds on changes)
npm start
```

To test a production build locally:

```bash
npm run build
npm run serve
```

A pre-commit hook using `prettier` is installed automatically. If it rejects a commit, run `npm run prettier` to fix formatting.

### Tests

A basic test suite verifies that the hardware page and the plot page render correctly:

```bash
npm test
```

### Emulating the Experiment Library

A lightweight Flask server is included to emulate the endpoints used by the Experiment Library, useful for local development without a running library instance. See [test/README.md](test/README.md) for details, or [compose.md](compose.md) to run it via Docker Compose.

## License

The `ionpulse-sequence-visualiser` is available under the MIT license. See [LICENSE](LICENSE).
