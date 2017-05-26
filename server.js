const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const fs = require('fs');
const app = express();

let cacheResponse = null;
const file = fs.readFileSync('events.html', 'utf-8');

/**
 * Transforms a datestring formatted as `dd mm yyy - hh:mm` to a valid
 * Date Object. This will break if Philvocs suddenly decided to change the
 * date formatting in their tables.
 *
 * @param {string} dateStr The datestring to be transformed.
 * @return {!Date}
*/
function transformDate(dateStr) {
    const date = new Date(dateStr.replace('-', ''));
    date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 100);
    return date;
}

/**
 * Transforms an Event Array into an object for JSON transformation.
 *
 * @param {!Array<string>} event An array representation of a table row
 * @return {!Object<string,?>}
*/
function mapEventArrayToObject(event) {
    return {
        date: transformDate(event[0]),
        coords : {
            lat: parseFloat(event[1]),
            lng: parseFloat(event[2])
        },
        depthKm: parseFloat(event[3]),
        mag: parseFloat(event[4]),
    };
}

/**
 * @param {string} html The html retrieved for scraping.
 * @return {!Array<!Object>}
*/
function parseResponse(html) {
    const rowsParsed = [];
    const $ = cheerio.load(html);
    // The 4th table is where the data is at.
    // Ditch the first row since it contains the Month indicator.
    // This assumes that for every page that contains seismic data, the DOM
    // structure is the same.
    const table = $('.MsoNormalTable').get(3);
    const rows = $(table).children('tr').slice(1);
    const data = {};

    rows.each(function(i, el) {
        const data = [];
        $(el).children('td').each(function(i, td) {
            const clean = $(td).text().trim().replace(/\s/g,' ');
            data.push(clean);
        });

        rowsParsed.push(data);
    })

    data.events = rowsParsed.map(mapEventArrayToObject);

    return data;
}

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
            res.send(parseResponse(data));
        });
    } else {
        res.send(parseResponse(cacheResponse));
    }
});

// Handler for serving events.html.
app.get('/events-cached', (req, res) => {
    res.json(parseResponse(file));
});

app.listen('8081');
console.log('Start. Serving at :8081');
module.exports = app;