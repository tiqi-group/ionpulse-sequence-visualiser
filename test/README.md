# Test sequences for the library visualiser

This folder contains Python scripts that generate JSON strings for the Library Visualiser.

## Usage

- `poetry install` to set up the virtual environment.
- `poetry run python plot_example.py` to generate the `ionpulse_seq_plot.json` file for the sequence server
- `poetry run python sequence_server.py` fires up a minimal flask server that the Library Visualiser can connect to
