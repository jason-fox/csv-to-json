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
 * Read the CSV data from the temporary file.
 * This returns an in memory representation of the raw CSV file
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

/**
 * Retieve the unitCode from the static data saved in a database.
 */
async function getDeviceUnitCode(id) {
    let data;
    const queryParams = {
        id: 'urn:ngsi-ld:Device:' + id
    };
    const query = Device.model.findOne({});

    try {
        data = await query.lean().exec();
    } catch (err) {
        debug('error: ' + err);
    }
    return data ? data.unitCode : undefined;
}

/*
 *  Strip the id and an key from the header row.
 */
function parseId(input) {
    const regexId = /^[^\s]+/;
    const regexKey = /[\w]+$/;
    const id = regexId.exec(input)[0];
    const key = regexKey.exec(input)[0];

    return { id, key };
}

/*
 * Manipulate the CSV data to create a series of measures
 * The data has been extracted based on the headers and other
 * static data such as the unitCode.
 */
async function createMeasuresFromCsv(rows) {
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

    return await Promise.all(
        headerInfo.map(async (headerInfo) => {
            if (headerInfo) {
                headerInfo.unitCode = await getDeviceUnitCode(headerInfo.id);
            }
            return headerInfo;
        })
    ).then((headerInfo) => {
        rows.shift();
        rows.forEach((row) => {
            const values = _.values(row);
            const measure = {};
            values.forEach((value, index) => {
                if (headerInfo[index] && value.trim() !== 'na') {
                    const id = headerInfo[index].id;
                    const unitCode = headerInfo[index].unitCode;
                    const key = headerInfo[index].key.toLowerCase();

                    measure[id] = measure[id] || { id, unitCode };
                    measure[id][key] = value;
                    measure[id].timestamp = values[timestampCol];
                }
            });
            measures.push(_.values(measure));
        });
        return measures;
    });
}

/*
 * Take the in memory data and format it as NSGI Entities
 *
 */
function createEntitiesFromMeasures(measures) {
    const allEntities = [];
    measures.forEach((measure) => {
        const entitiesAtTimeStamp = [];
        const values = _.values(measure);
        values.forEach((value, index) => {
            const entity = {
                id: 'urn:ngsi-ld:Device:' + value.id,
                type: 'Device',
                value: {
                    property: 'Property',
                    value: value.value
                }
            };

            // Add metadata if present.
            if (value.unitCode) {
                entity.value.unitCode = value.unitCode;
            }
            if (value.timestamp) {
                entity.value.observedAt = value.timestamp;
            }
            if (value.quality) {
                entity.value.quality = {
                    property: 'Property',
                    value: value.quality
                };
            }

            entitiesAtTimeStamp.push(entity);
        });
        allEntities.push(entitiesAtTimeStamp);
    });
    return allEntities;
}

/*
 * Create an array of promises to send data to the context broker.
 * Each insert represents a series of readings at a given timestamp
 */
function createContextRequests(entities) {
    const promises = [];
    entities.forEach((entitiesAtTimeStamp) => {
        promises.push(
            new Promise((resolve, reject) => {
                Measure.sendAsHTTP(entitiesAtTimeStamp).then(
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

/**
 * Actions when uploading a CSV file. The CSV file holds an array of
 * measurements each at a given timestamp.
 */
const upload = (req, res) => {
    if (req.file === undefined) {
        return res.status(400).send('Please upload a CSV file!');
    }

    const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;

    readCsvFile(path)
        .then((rows) => {
            return createMeasuresFromCsv(rows);
        })
        .then((measures) => {
            removeCsvFile(path);
            return measures;
        })
        .then((measures) => {
            return createEntitiesFromMeasures(measures);
        })
        .then((entities) => {
            return createContextRequests(entities);
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
