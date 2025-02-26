#!/usr/bin/env bash

date > test_server.log
if [ ! -f ./test/ionpulse_seq.json ]; then
	poetry -C ./test/ run bash -c 'python $VIRTUAL_ENV/src/ionpulse_sequence_generator/test/ionpulse_seq_gen_test.py' &> test_json_generator.log
	if [ $? -ne 0 ]; then
		cat test_json_generator.log
		exit 1
	fi
fi
if [ -f ./test/ionpulse_seq.json ]; then
	poetry -C ./test/ run python ./sequence_server.py \
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

