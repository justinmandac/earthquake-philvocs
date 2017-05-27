const express = require('express');
const request = require('request');
const cheerio  = require('cheerio');
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
            res.send(parser.parseMsoTable(data));
        });
    } else {
        res.send(parser.parseMsoTable(cacheResponse));
    }
});

// Handler for serving events.html.
app.get('/events-cached', (req, res) => {
    res.json(parser.parseMsoTable(file));
});

app.get('/import', (req, res) => {
    if (!file) {
        res.send({ err: true});
        return;
    }

    const $ = cheerio.load(file);
    const links = [];
    // Get the links to monthly reports.
    // Some of the links, however, lead to collapsed reports. As of writing,
    // these reports are of the years 2011- 2014 and cannot be parsed by
    // parser.parseMsoTable.
    $('a').filter((i, el) => {
        return $(el).attr("href").includes("EQLatest-Monthly");
    }).each((i, el) => {
        links.push($(el).attr("href"));
    });
    // NOTE collapsed reports' links contain the substring Jan-Dec

    res.send({err : null, data: links});
});

app.listen('8081');
console.log('Start. Serving at :8081');
module.exports = app;