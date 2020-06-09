#!/bin/bash

# Rewrite the docker config.json file to include the `experimental=enabled` flag. 
# This allows us to use `docker manifest inspect` to look into the docker registry 
# and check to make sure we are not overwriting a previously released tag.

node -e "$(cat <<-EOF
    const dockerConfig = require('fs').readFileSync('/root/.docker/config.json');
    const configObj = JSON.parse(dockerConfig.toString());
    configObj.experimental = 'enabled';
    require('fs').writeFileSync('/root/.docker/config.json', JSON.stringify(configObj, null, 2));
    console.log('Docker experimental mode enabled. (Allows docker manifest inspect to work.)');
EOF
)"
