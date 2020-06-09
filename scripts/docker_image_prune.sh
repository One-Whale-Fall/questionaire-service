#!/bin/bash

# Prune dangling images
docker image prune -f
# docker rmi $(docker images -f dangling=true -q) 2>/dev/null || /bin/true
echo "Pruned dangling docker images"