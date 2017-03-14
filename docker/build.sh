#!/bin/sh

rm -rf dist;
cd ..; rm -rf dist node_modules bower_components;
npm install && bower install bower.json && ./node_modules/grunt/bin/grunt default
#rsync -avzP --exclude '.git' --exclude 'node_modules' --exclude 'docker' .. build/
rsync -avzP dist docker/
cd docker && docker build -t rawfie/schema_registry_ui .
