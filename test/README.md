# Test sequences for the library visualiser

This folder contains a mock server that provides the required endpoints of the experiment library, `/Hardware/description` and `/Hardware/sequence`.
Additionally, there's a script to create a test sequence

## Usage

- `poetry install` to set up the virtual environment.
- `poetry run python ionpulse_seq_gen_test.py` to generate the `ionpulse_seq.json` file for the sequence server.
  Alternatively, you can symlink any other JSON file into the same folder, which will be served to the Sequence Visualizer.
- `poetry run python sequence_server.py` fires up a minimal flask server that the Sequence Visualizer can connect to
