const readXlsxFile = require('read-excel-file/node');
const JSONMeasure = require('../lib/measure');
const config = require('../config');
const debug = require('debug')('server:excel');
const fs = require('fs');
const _ = require('underscore');
const moment = require('moment-timezone');

const headers = {}; // TO DO - add security headers.
const Measure = new JSONMeasure(headers);
const replacements = Object.keys(config.replace);

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
 * Manipulate the CSV data to create a series of measures
 */
function createMeasuresFromXlsx(rows) {
    const measures = [];

    const transpose = _.zip.apply(_, rows);

    const headerFields = _.map(transpose[0], (header) => {
        const field = header.toLowerCase().replace(/ /g, '_');
        return replacements.includes(field) ? config.replace[field] : field;
    });

    // skip header
    transpose.shift();
    transpose.forEach((row) => {
        let measure = {};

        headerFields.forEach((header, index) => {
            const value = row[index];
            if (!config.ignore.includes(value)) {
                measure[header] = {
                    type:'Property',
                    value
                }
            }
        });

        measure.type = 'Device';
        measure.id = 'urn:ngsi-ld:Device:' + measure.id.value;

        config.float.forEach((float) => {
            if(measure[float]){
                measure[float].value = Number.parseFloat(measure[float].value);
            }
        });
        config.integer.forEach((integer) => {
            if(measure[integer]){
                 measure[integer].value = Number.parseFloat(measure[integer].value);
            }
        });
       config.datetime.forEach((datetime) => {
            if(measure[datetime]){
                try {
                    measure[datetime].value = {
                    '@type': 'DateTime',
                    '@value': moment.tz(measure[datetime].value, 'Etc/UTC').toISOString()
                    };
                } catch (e) {
                    debug(e)
                }
            }
        });
        config.relationship.forEach((relationship) => {
            if(measure[relationship]){
                measure[relationship] = {
                    type: 'Relationship',
                    object: 'urn:ngsi-ld:DeviceModel:' + String(measure[relationship].value)
                }
            }
        });
        measures.push(measure);
    });
    return measures;
}


const upload = async (req, res) => {
    if (req.file === undefined) {
        return res.status(400).send('Please upload an excel file!');
    }

    const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;

    readXlsxFile(path)
        .then((rows) => {
            const measures = createMeasuresFromXlsx(rows);
            removeXlsxFile(path);
            return measures;
        })
        .then(async (measures) => {
            return await Measure.sendAsHTTP(measures)
        })
        .then((response) => {
           return res.status(response.statusCode).json(response.body);
        })
        .catch((err) => {
            return res.status(500).send(err);
        });
};

module.exports = {
    upload
};
