#!/bin/bash
docker container run -d \
  --env-file $(pwd)/dev.env \
  --env-file $(pwd)/.credentials.dev.env \
  -p 8081:8081 \
  --rm \
  --name resource \
  --net network_dev \
  tokyomap.resource:dev 
