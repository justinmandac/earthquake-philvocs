const express = require('express');
const request = require('request');
const fs = require('fs');
const app = express();
const parser = require('./parser');

let cacheResponse = null;
const file = fs.readFileSync('events.html', 'utf-8');

app.get('/events', (req, res) => {
    const url = 'http://www.phivolcs.dost.gov.ph/html/update_SOEPD/EQLatest.html';
    console.log('GET from ', url);

    if (cacheResponse === null) {
        console.log('Sending request...');
        request(url, (err, response, data) => {
            if (err) {
                console.log('ERR! ', err);
                res.send(err);
                return;
            }

            fs.writeFile('events.html', data);

            cacheResponse = data;
            res.send(parser.parseResponse(data));
        });
    } else {
        res.send(parser.parseResponse(cacheResponse));
    }
});

// Handler for serving events.html.
app.get('/events-cached', (req, res) => {
    res.json(parser.parseResponse(file));
});

app.listen('8081');
console.log('Start. Serving at :8081');
module.exports = app;