const fs = require('fs');
const csv = require('fast-csv');
const JSONMeasure = require('../lib/measure');
const config = require('../config');
const debug = require('debug')('server:csv');
const _ = require('underscore');

const headers = {}; // TO DO - add security headers.
const Measure = new JSONMeasure(headers);

/*
 * Delete the temporary file
 */
function removeCsvFile(path) {
    fs.unlink(path, (err) => {
        if (err) {
            throw err;
        }
    });
}

/*
 * Read the CSV data from the temporary file
 */
function readCsvFile(path) {
    return new Promise((resolve, reject) => {
        const rows = [];

        fs.createReadStream(path)
            .pipe(csv.parse({ headers: true }))
            .on('error', (error) => {
                reject(error.message);
            })
            .on('data', (row) => {
                rows.push(row);
            })
            .on('end', () => {
                resolve(rows);
            });
    });
}

/*
 * Manipulate the CSV data to create a series of measures
 */
function createMeasuresFromCsv(rows) {
    return new Promise((resolve, reject) => {
        const measures = rows;
        resolve(measures);
    });
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

                Measure.sendAsHTTP(deviceId, record).then(
                        (values) => resolve(value),
                        (err) => {
                            debug(err.message);
                            reject(err.message);
                        }
                    );
            })
        );
    });
    return promises;
}

const upload = (req, res) => {
    if (req.file === undefined) {
        return res.status(400).send('Please upload a CSV file!');
    }

    const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;

    readCsvFile(path)
        .then((rows) => {
            const measures = createMeasuresFromCsv(rows);
            removeCsvFile(path);
            return measures;
        })
        .then((measures) => {
            return createContextRequests(measures);
        })
        .then(async (promises) => {
            return await Promise.allSettled(promises);
        })
        .then((results) => {
            const errors = _.where(results, { status: 'rejected' });
            return errors.length ? res.status(500).json(errors) : res.status(204).send();
        })
        .catch((err) => {
            return res.status(500).send(err);
        });
};

module.exports = {
    upload
};
