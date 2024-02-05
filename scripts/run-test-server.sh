#!/usr/bin/env bash

date > test_server.log
# poetry -C ./test/ run python ./test/plot_example.py --jsononly &> /dev/null && \
poetry -C ./test/ run python ./test/sequence_server.py --file ionpulse_seq_plot.json &>> test_server.log &
if [ $? -eq 0 ] ; then
	echo "Server PID: $server_pid"
	trap 'if ps -p $! > /dev/null ; then kill $!; fi' 0
fi
vitest

