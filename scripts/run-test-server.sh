#!/usr/bin/env bash

json_file="./ionpulse_seq.json"
if [ -n "$1" ]; then
	json_file="$1"
fi

date > test_server.log
if [ ! -f $json_file ]; then
	echo "Generating sequence JSON"
	poetry -C ./test/ run bash -c 'python $VIRTUAL_ENV/src/ionpulse_sequence_generator/test/ionpulse_seq_gen_test.py' &> test_json_generator.log
	if [ $? -ne 0 ]; then
		cat test_json_generator.log
		exit 1
	fi
	json_file="./ionpulse_seq.json"
	mv ./test/ionpulse_seq.json ./
fi
if [ -f $json_file ]; then
	echo "Serving file $json_file"
	poetry -C ./test/ run python ./sequence_server.py \
		--file ../$json_file &>> test_server.log &

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

