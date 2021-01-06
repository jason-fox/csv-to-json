const readXlsxFile = require('read-excel-file/node');
const JSONMeasure = require('../lib/measure');
const config = require('../config');
const debug = require('debug')('server:excel');
const fs = require('fs');

const headers = {}; // TO DO - add security headers.
const Measure = new JSONMeasure(headers);
const DEVICE_TRANSPORT = process.env.TRANSPORT || config.transport;

function removeXlsxFile(path){
    fs.unlink(path, (err) => {
        if (err) {
            throw err;
        }
    });
}

function readXlsxRecords(rows) {
    const records = [];
    // skip header
    rows.shift();
    rows.forEach((row) => {
        const record = {
            id: row[0],
            title: row[1],
            description: row[2],
            published: row[3]
        };
        records.push(record);
    });

    return records;
}

function createContextRequests(records){
    const promises = [];
    records.forEach((record) => {
        promises.push(
            new Promise((resolve, reject) => {
                const deviceId = 1234;

                console.error(record);

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
            records = readXlsxRecords(rows);
            removeXlsxFile(path);
            return records;
        })
        .then((records) => {
            return createContextRequests(records);
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
