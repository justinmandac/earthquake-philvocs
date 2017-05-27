/**
 * @fileoverview Module for parsing Philvoc's earthquake bulletin
 * pages. In the current structure, the data is contained in the 3rd
 * table.MsoNormalTable.
*/
const cheerio = require('cheerio');

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
    // From StackOverFlow @see https://stackoverflow.com/a/25062621
    // by user @rinjan
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
    const data = {};

    // Scrape data from each row.
    $(table).children('tr').slice(1).each((i, el) => {
        const data = [];
        $(el).children('td').each((i, td) => {
            const clean = $(td).text().trim()
                .replace(/\s/g,' '); // Remove whitespace characters
            data.push(clean);
        });

        rowsParsed.push(data);
    })

    data.events = rowsParsed.map(mapEventArrayToObject);

    return data;
}

module.exports = {
    transformDate,
    mapEventArrayToObject,
    parseResponse
};