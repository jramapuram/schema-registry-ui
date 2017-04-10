#!/bin/sh

rm -rf dist;
cd ..; rm -rf dist node_modules bower_components;
npm install && bower install bower.json && ./node_modules/grunt/bin/grunt default
rsync -avzP dist docker/
cd docker && docker build -t rawfie/schema_registry_ui .
