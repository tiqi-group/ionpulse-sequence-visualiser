# Ionpulse Sequence Visualiser

**Deployed at [tiqidocs.phys.ethz.ch](https://tiqidocs.phys.ethz.ch/visualiser/main/). Enjoy**

This is the sequence visualiser used to have a nice real-time visualisation of your pulse sequences created using the Experiment Library, PyCrystal and the ionpulse sequence generator.
For example, running the CoolDet from the Cryo setup looks like this:

![example CoolDet](images/visualizer-cooldet.png)

## Getting Started

By default, you will be served the build of the latest commit to main.
You can access specific version by navigating to https://tiqidocs.phys.ethz.ch/visualiser/ and selecting the appropriate subfolder.

### Help with connection issues

If the visualiser cannot connect to your ionpulse experiment library instance that might be because your browser is blocking it.
This is caused by tiqidocs providing SSL encryption while the experiment library does not.

On Chrome, you have to allow the webpage to access "insecure content" in the site settings permissions: https://support.google.com/chrome/answer/114662  
On Firefox, you have to disable the protection that blocks "mixed content" : https://support.mozilla.org/en-US/kb/mixed-content-blocking-firefox

## Configuration

The sequence visualiser uses cookies to store the address and port of the experiment library.
Just go to the _Configure_ menu entry and fill in the details of the form and click _Connect_.
The form will indicate whether the visualiser could connect or not.

## Usage

The visualiser connects to the Library using [socket.io](https://socket.io/docs/v3).
The Experiment Library updates its `hardware/scope_sequence` attribute, and the visualiser gets notified about this update using the socket.
As soon as the socket is updated the new sequence is rendered.
Give it a try by using the `update_zedboard_sequence` in any of the experiments of your Library.

The Visualiser is based on [plotly.js](https://plotly.com/javascript/) which gives us a great flexibility in its use.
Try zooming in, and out of your sequence.

The Visualiser will read your the `Hardware/hardware_description` attribute from your Library to know which RF and TTL channes are used, and will automatically enable this channels and hide the rest.
You can however use the "Channels" button to decide which channels to show and hide.

Under the tab "Hardware" you can find the hardware description of your setup.

## Development

- git clone this repo in a suittable location.
- Install Node.js 22 (LTS Jod)
  - I recommend the [Node Version Manager](https://github.com/nvm-sh/nvm)
  - Or [n](https://github.com/tj/n) for a system wide installation
  - Also see https://nodejs.org/en/download

- Setup the environment with `npm install` in the repo

- Use the development server instead of serving the static content by running

```
npm start
```

This will automatically build and update the visualiser.
If you want to test the deployment you can use `npm run build` and `npm run serve` instead of `npm start`.

Once you have installed the visualiser, a pre-commit hook is added that uses `prettier` to check the code formatting before committing.
If you get an error from the pre-commit hook, run `npm run prettier`

There is a rudimentary set of tests that makes sure that the hardware page and the plot page renders. Run `npm test` to fire it up

For convenience, there is a Flask server that emulates the used endpoints of the Experiment Library.
See [test/README.md](test/README.md) for usage.

## Local deployment on an nginx server

**Try to use the globally maintained tiqidocs.phys.ethz.ch/visualiser deployment if you can**

To deploy the library visualiser, you can download the latest build artifacts and serve them through an nginx server.

- Extract the artifacts to `/var/www/html/library-visualiser`. This will put the files into `/var/www/html/library-visualiser/dist/`
- Add an nginx server configuration into the http section of `/etc/nginx/nginx.conf`

```
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

- Restart nginx (`systemctl restart nginx`)
- Configure your router to forward this URL to the nginx server.
  If you're using an edgerouter, add
  ```
  address=/library-visualiser.lab/<server-ip-address>
  ```
  to `Config Tree: service -> dns -> forwarding (options)`
