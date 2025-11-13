const readXlsxFile = require('read-excel-file/node');
const readSheetNames = require('read-excel-file/node').readSheetNames;
const Measure = require('../../lib/measure');
const config = require('../../config');
const debug = require('debug')('server:excel');
const fs = require('fs');
const _ = require('underscore');
const moment = require('moment-timezone');
const Device = require('../../lib/Device');
const replacements = Object.keys(config.replace);
const Status = require('http-status-codes');

function toTitleCase(str) {
    return str.replace(/\w\S*/g, (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase());
}

function clean(str) {
    str = str.trim();
    return str
        .replace(/\s+/g, '-')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/*
 * Delete the temporary file
 */
function removeXlsxFile(path) {
    fs.unlink(path, (err) => {
        if (err) {
            throw err;
        }
    });
}

/*
 * Manipulate the Excel data to create a series of entities
 */
function createEntitiesFromXlsx(rows, city) {
    const entities = [];

    const id = `urn:ngsi-ld:City:${city.toLowerCase()}`;

    const obj = {
        id,
        type: 'City',
        name: {
            type: 'Property',
            value: toTitleCase(city)
        }
    };

    for (var i = 6; i < 11; i++) {
        const data = rows[i];
        const header = data[0];
        data.shift();
        const monthly = [];

        data.slice(0, 11).forEach((value)=>{
            monthly.push( +(value).toFixed(1));
        });

        obj[clean(header)] = {
            type: 'ListProperty',
            valueList: monthly
        };
        obj[`average-${clean(header)}`] = {
            type: 'Property',
            value:  +((data[12]).toFixed(1))  //data[12]
        };
    }

    for (var i = 14; i < 15; i++) {
        const data = rows[i];
        const header = data[0];
        data.shift();
        const monthly = [];

        data.slice(0, 11).forEach((value)=>{
            monthly.push( +(value).toFixed(1));
        });

        obj[clean(header)] = {
            type: 'ListProperty',
            valueList: monthly
        };
    }
    return [obj];
}

const upload = (req, res) => {
    if (req.file === undefined) {
        return res.status(Status.UNSUPPORTED_MEDIA_TYPE).send('Please upload an excel file!');
    }

    const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;
    const sheet = req.params.sheet ? Number(req.params.sheet) : 1;
    let cities;

    return readSheetNames(path)
        .then((sheetNames) => {
            console.log(sheetNames);
            cities = sheetNames;
            return readXlsxFile(path, { sheet: sheet });
        })
        .then((rows) => {
            const entities = createEntitiesFromXlsx(rows, cities[sheet - 1]);
            removeXlsxFile(path);
            return entities;
        })
        .then(async (entities) => {
            const cbResponse = await Measure.sendAsHTTP(entities);
            return res.status(cbResponse ? cbResponse.statusCode : 204).send();
        })
        .catch((err) => {
            debug(err);
            return res.status(Status.INTERNAL_SERVER_ERROR).send(err);
        });
};

module.exports = {
    upload
};
