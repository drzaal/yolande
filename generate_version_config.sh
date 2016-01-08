#!/bin/bash

####
#Creates the config/version.js file that will be used by buildInfo resource
####


####
# Test git is installed
####
GIT=$(which git)
if [ $? -ne 0 ]; then
  echo "Fatal: 'git' command not found"
  exit 1
fi

set -e

####
# Get git branch
####
BRANCH=`git branch --no-color 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/'`

####
# If $GIT_COMMIT not set (e.g. not running in context of Jenkins build), set it to current Git SHA
####
if [ -z ${GIT_COMMIT} ]; then
  GIT_COMMIT=$(git rev-parse HEAD)
fi

####
# Get time
####
TIME=`date "+%Y%m%d-%H%M"`

VERSION_CONFIG_FILE=config/version.js

cat config/version_template.js | sed -e 's/__branch__/'${BRANCH}'/g' -e 's/__version__/'${GIT_COMMIT}'/g' -e 's/__buildtime__/'${TIME}'/g' > $VERSION_CONFIG_FILE

set +x
echo "Generated $VERSION_CONFIG_FILE:"
cat $VERSION_CONFIG_FILE
