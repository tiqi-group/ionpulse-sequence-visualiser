# Library Visualiser

This is the sequence visualiser used to have a nice real-time visualisation of your pulse sequences created using the Experiment Library, PyCrystal and the ionpulse sequence generator.
For example, running the CoolDet from the Cryo setup looks like this:

![example CoolDet](images/visualizer-cooldet.png)

## Getting Started

- git clone this repo in a suittable location.
- Install Node.js 20 (LTS Iron)

  - I recommend the [Node Version Manager](https://github.com/nvm-sh/nvm)
  - Or [n](https://github.com/tj/n) for a system wide installation
  - Also see https://nodejs.org/en/download

- Setup the environment with `npm install` in the repo
- `npm build` to build the static content
- `npm run serve` to start a webserver that exposes the library visualiser.
  By default, you can access it via

```
http://localhost:3000
```

## Configuration

The library visualiser uses cookies to store the address and port of the experiment library.
Just go to the _Configure_ menu entry and fill in the details of the form and click _Connect_.
The form will indicate whether the visualiser could connect or not.

## Usage

The visualiser connects to the Library using [socket.io](https://socket.io/docs/v3).
The Experiment Library updates its `hardware/scope_sequence` attribute, and the visualiser gets notified about this update using the socket.
As soon as the socket is updated the new sequence is rendered.
Give it a try by using the `update_zedboard_sequence` in any of the experiments of your Library.

The Visualiser is based on [plotly.js](https://plotly.com/javascript/) which gives us a great flexibility in its use.
Try zooming in, and out of your sequence.

The Visualiser will read your the `Hardware/hardware_desciption` attribute from your Library to know which RF and TTL channes are used, and will automatically enable this channels and hide the rest.
You can however use the "Channels" button to decide which channels to show and hide.

Under the tab "Hardware" you can find the hardware description of your setup.

## Development

Use the development server instead of serving the static content by running

```
npm start
```

This will automatically build and update the visualiser. `npm build` and `npm run serve` are no necessary in that case.

Once you have installed the visualiser, a pre-commit hook is added that uses `prettier` to check the code formatting before committing.
If you get an error from the pre-commit hook, run `npm run prettier`

There is a rudimentary set of tests that makes sure that the hardware page and the plot page renders. Run `npm test` to fire it up

For convenience, there is a Flask server that emulates the used endpoints of the Experiment Library.
See [test/README.md](test/README.md) for usage.
