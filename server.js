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

/**
 * @param {string} link The link to load data from.
 * TODO: Promise-fy request and fs.writeFile
 * TODO: Move link -> filename transformation to its own function.
*/
function importLink(link) {
    const split = link.split('/');
    const fullFileName = split[split.length - 1].split('.');
    const fileName = fullFileName[0].split('_');
    const yearCheck = new RegExp(/\d/);

    fullFileName[1] = 'json'; // change the extension to .json.

    if (!yearCheck.test(fileName[0])) {
        fullFileName[0] = fileName.reverse().join('_');
    }

    request(link, (err, response, data) => {
        if (err) {
            console.log('ERR! ', err);
            res.send(err);
            return;
        }
        const jsonFileName = fullFileName.join('.');
        const parsed = parser.parseMsoTable(data);

        if (parsed.events.length !== 0) {
            const fileData = JSON.stringify(parsed);

            fs.writeFile(`./json/${jsonFileName}`, fileData, (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log(`${jsonFileName} imported successfully.`);
            });
        }
    });
}

app.get('/import', (req, res) => {
    if (!file) {
        res.send({ err: true});
        return;
    }
    const { current, legacy } = parser.scrapeLinks(file);
    console.log('Import started!');
    current.forEach(l => importLink(l));

    res.send({err: null, data: 'import started'});
});

app.get('/links', (req, res) => {
    if (!file) {
        res.send({ err: true});
        return;
    }
    const links = parser.scrapeLinks(file);
    // NOTE collapsed reports' links contain the substring Jan-Dec

    res.send({err : null, data: links});
});

app.listen('8081');
console.log('Start. Serving at :8081');
module.exports = app;