#!/bin/bash
docker image rm tokyomap.resource:dev
docker build -t tokyomap.resource:dev .
