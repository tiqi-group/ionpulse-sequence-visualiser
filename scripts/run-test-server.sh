#!/usr/bin/env bash

date > test_server.log
if [ ! -f ionpulse_seq_plot.json ]; then
	poetry -C ./test/ run python ./test/plot_example.py --jsononly &> test_json_generator.log
	if [ $? -ne 0 ]; then
		cat test_json_generator.log
		exit 1
	fi
fi
if [ -f ionpulse_seq_plot.json ]; then
	poetry -C ./test/ run python ./test/sequence_server.py \
		--plot ./ionpulse_seq_plot.json \
		--file ./ionpulse_seq.json &>> test_server.log &

	sleep 0.5
	if ps -p $! > /dev/null; then
		trap "cat test_server.log; if ps -p $! > /dev/null ; then kill $!; fi" 0
		vitest
	else
		cat test_server.log
		exit 2
	fi

else
	echo "JSON generation failed"
	cat test_json_generator.log
	exit 3
fi

