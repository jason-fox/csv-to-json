const fs = require('fs');
const csv = require('fast-csv');
const JSONMeasure = require('../lib/measure');
const config = require('../config');

const headers = {}; // TO DO - add security headers.
const Measure = new JSONMeasure(headers);
const DEVICE_TRANSPORT = process.env.TRANSPORT || config.transport;

const upload = (req, res) => {
    try {
        if (req.file === undefined) {
            return res.status(400).send('Please upload a CSV file!');
        }

        const records = [];

        const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;

        fs.createReadStream(path)
            .pipe(csv.parse({ headers: true }))
            .on('error', (error) => {
                throw error.message;
            })
            .on('data', (row) => {
                records.push(row);
            })
            .on('end', () => {
                records.forEach((record) => {
                    console.error(record);
                    const deviceId = 1234;

                    if (DEVICE_TRANSPORT === 'HTTP') {
                        Measure.sendAsHTTP(deviceId, record);
                    } else if (DEVICE_TRANSPORT === 'MQTT') {
                        Measure.sendAsMQTT(deviceId, record);
                    }
                });
            });
        return res.status(204).send();
    } catch (error) {
        console.log(error);
        return res.status(500).send({
            message: 'Could not upload the file: ' + req.file.originalname
        });
    }
};

module.exports = {
    upload
};
