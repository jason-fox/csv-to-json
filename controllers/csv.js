const fs = require('fs');
const csv = require('fast-csv');
const JSONMeasure = require('../lib/measure');
const debug = require('debug')('server:csv');
const _ = require('underscore');
const Device = require('../lib/Device');

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

async function getDeviceUnitCode(id) {
    let data;
    const queryParams = {
        id : 'urn:ngsi-ld:Device:' + id
    };
    const query = Device.model.findOne({});

    try {
        data = await query.lean().exec();
    } catch (err) {
        debug('error: ' + err);
    }
    return data ? data.unitCode : undefined;
}

function parseId(input) {
    const regexId = /^[^\s]+/;
    const regexKey = /[\w]+$/;
    const id = regexId.exec(input)[0];
    const key = regexKey.exec(input)[0];
    const unitCode = getDeviceUnitCode(id);

    return { id, key, unitCode };
}

/*
 * Manipulate the CSV data to create a series of measures
 */
function createMeasuresFromCsv(rows) {
    let timestampCol = 0;
    const headerInfo = [];
    const measures = [];
    const headerRow = rows[0];
    Object.keys(headerRow).forEach((header, index) => {
        if (header === 'timestamp') {
            timestampCol = index;
            headerInfo.push(null);
        } else {
            const parsed = parseId(header);
            if (parsed.id) {
                headerInfo.push(parsed);
            }
        }
    });
    rows.shift();

    rows.forEach((row) => {
        const values = _.values(row);
        const measure = {};
        values.forEach((value, index) => {
            if (headerInfo[index] && value.trim() !== 'na') {
                const id = headerInfo[index].id;
                
                const key = headerInfo[index].key.toLowerCase();

                measure[id] = measure[id] || { id };
                measure[id][key] = value;
                measure[id].timestamp = values[timestampCol];
            }
        });
        measures.push(_.values(measure));
    });

    console.error(measures)
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
                Measure.sendAsHTTP(records).then(
                    () => resolve(),
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
