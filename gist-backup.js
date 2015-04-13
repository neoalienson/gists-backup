#!/usr/bin/env node
var rest = require('restler');
var request = require('request');
var fs = require('fs');
var mkdirp = require('mkdirp');
var prompt = require('synchro-prompt');

var ghUsername = process.argv[2] || prompt('Your GitHub Username? ');
var ghPassword = process.argv[3] || prompt('Your GitHub Password? ');
var savedir = process.argv[4] || prompt('Path to back-up dir (will create if not exists)? ');

mkdirp(savedir);

function getGists(page) {

    'use strict';

    var options = {
        username: ghUsername,
        password: ghPassword,
        headers: {
            'User-Agent': 'Gists backup'
        }
    };

    rest.get('https://api.github.com/gists?per_page=100&page=' + page, options).on('complete', function (data, response) {
        var increment = 1;
        data.forEach(function (gist) {
            var description = (!gist.description) ? 'Untitled' : gist.description
                .trim()
                .replace(/[^a-zA-Z0-9\s]/g, '');

            var dir = savedir + '/' + description;

            try {
                fs.statSync(dir);
                dir = dir + ' duplicate ' + increment++;
                mkdirp(dir, function (error) {
                    if (error) {
                        throw error;
                    } else {
                        console.log('successfully created ' + dir);
                    }

                });
            }
            catch (err) {
                mkdirp(dir, function (error) {
                    if (error) {
                        console.log('Error: ' + error);
                    } else {
                        console.log('successfully created ' + dir);
                    }

                });
            }

            for (var file in gist.files) {
                if (gist.files.hasOwnProperty(file)) {
                    var raw_url = gist.files[file].raw_url;
                    var filename = gist.files[file].filename;
                    request(raw_url).pipe(fs.createWriteStream(dir + '/' + filename, function (error) {
                        if (error) {
                            throw error;
                        } else {
                            console.log('successfully created ' + dir + '/' + filename);
                        }

                    }));
                }
            }
        });
        if (page === 1 && response.headers.link) {
            var links = response.headers.link.split(',');
            for (var link in links) {
                if (links.hasOwnProperty(link)) {
                    link = links[link];
                    if (link.indexOf('rel="next') > -1) {
                        var pages = link.match(/[0-9]+/)[0];
                    }
                }
                for (var p = 2; p < pages; p++) {
                    getGists(p);
                }
            }
        }
    });
}

getGists(1);
