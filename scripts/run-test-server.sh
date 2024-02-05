#!/usr/bin/env bash

date > test_server.log
if [ ! -f ionpulse_seq_plot.json ]; then
	poetry -C ./test/ run python ./test/plot_example.py --jsononly &> /dev/null
fi
if [ -f ionpulse_seq_plot.json ]; then
	poetry -C ./test/ run python ./test/sequence_server.py --file ionpulse_seq_plot.json &>> test_server.log &
fi
trap "if ps -p $! > /dev/null ; then kill $!; fi" 0
vitest

