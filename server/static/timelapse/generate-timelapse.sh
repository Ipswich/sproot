#!/bin/bash

ffmpeg -y -loglevel warning \
-r:v 24 -f concat -safe 0 \
  -i <(find . -maxdepth 1 -name '*.jpg' \
  -exec sh -c 'for f; do printf "file %q\n" "$PWD/$f"; done' _ {} + \
  | sort -V \
  | sed 's/$/\nduration 1.0/' \
  | tee list.txt) \
  -vf fps=30 -codec:v libx265 -tag:v hvc1 timelapse.mp4