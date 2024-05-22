#!/usr/bin/env bash
base_dir="$(dirname "$0")/.."

[[ ! -f "$base_dir/.git/hooks/pre-commit" ]] && \
[[ -d "$base_dir/.git/hooks" ]] && \
cp "$base_dir/scripts/pre-commit" "$base_dir/.git/hooks/" && \
	chmod u+x "$base_dir/.git/hooks/pre-commit" && \
	echo "hook copied"

[[ ! -f "$base_dir/settings.json" ]] && \
	cp "$base_dir/settings-example.json" "$base_dir/settings.json" && \
	echo "settings copied"

exit 0
