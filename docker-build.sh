#!/bin/bash

docker image rm tokyomap.resource:dev

docker build --build-arg PORT="8081" -t tokyomap.resource:dev .
