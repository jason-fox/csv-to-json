const readXlsxFile = require('read-excel-file/node');
const JSONMeasure = require('../lib/measure');
const config = require('../config');
const debug = require('debug')('server:excel');
const fs = require('fs');
const _ = require('underscore');

const headers = {}; // TO DO - add security headers.
const Measure = new JSONMeasure(headers);
const DEVICE_TRANSPORT = process.env.TRANSPORT || config.transport;
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
                measure[header] = value;
            }
        });
        console.error(measure);
        measures.push(measure);
    });

    return measures;
}

/*
 * Create an array of promises to send data to the context broker
 */
function createContextRequests(records) {
    const promises = [];
    records.forEach((record) => {
        promises.push(
            new Promise((resolve, reject) => {
                const deviceId = record.id;
                const timestamp = delete record.id;

                if (DEVICE_TRANSPORT === 'HTTP') {
                    Measure.sendAsHTTP(deviceId, record).then(
                        (values) => resolve(value),
                        (err) => {
                            debug(err.message);
                            reject(err.message);
                        }
                    );
                } else if (DEVICE_TRANSPORT === 'MQTT') {
                    resolve(Measure.sendAsMQTT(deviceId, record));
                }
            })
        );
    });
    return promises;
}

const upload = (req, res) => {
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
        .then((measures) => {
            return createContextRequests(measures);
        })
        .then((promises) => {
            Promise.all(promises).then(
                (val) => {
                    return res.status(204).send();
                },
                (err) => {
                    return res.status(500).send(err);
                }
            );
        });
};

module.exports = {
    upload
};
