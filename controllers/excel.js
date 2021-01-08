const readXlsxFile = require('read-excel-file/node');
const JSONMeasure = require('../lib/measure');
const config = require('../config');
const debug = require('debug')('server:excel');
const fs = require('fs');
const _ = require('underscore');
const moment = require('moment-timezone');
const Device = require('../lib/Device');

const headers = {}; // TO DO - add security headers.
const Measure = new JSONMeasure(headers);
const replacements = Object.keys(config.replace);

function storeDeviceUnitCode(id, unitCode) {
    const data = {unitCode};
    debug(data);
    try {
        Device.model.findOneAndUpdate(
            { id},
            data,
            { upsert: true },
            function (err, doc) {
                if (err){ debug(err.message);}
            }
        );
    } catch (err){
        debug(err.message);
    }
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
function createEntitiesFromXlsx(rows) {
    const entities = [];

    const transpose = _.zip.apply(_, rows);

    const headerFields = _.map(transpose[0], (header) => {
        const field = header.toLowerCase().replace(/ /g, '_');
        return replacements.includes(field) ? config.replace[field] : field;
    });

    // skip header
    transpose.shift();
    transpose.forEach((row) => {
        const entity = {};

        headerFields.forEach((header, index) => {
            const value = row[index];
            if (!config.ignore.includes(value)) {
                entity[header] = {
                    type: 'Property',
                    value
                };
            }
        });

        entity.type = 'Device';
        entity.id = 'urn:ngsi-ld:Device:' + entity.id.value;

        config.float.forEach((float) => {
            if (entity[float]) {
                entity[float].value = Number.parseFloat(entity[float].value);
            }
        });
        config.integer.forEach((integer) => {
            if (entity[integer]) {
                entity[integer].value = Number.parseFloat(entity[integer].value);
            }
        });
        config.datetime.forEach((datetime) => {
            if (entity[datetime]) {
                try {
                    entity[datetime].value = {
                        '@type': 'DateTime',
                        '@value': moment.tz(entity[datetime].value, 'Etc/UTC').toISOString()
                    };
                } catch (e) {
                    debug(e);
                }
            }
        });
        config.relationship.forEach((relationship) => {
            if (entity[relationship]) {
                entity[relationship] = {
                    type: 'Relationship',
                    object: 'urn:ngsi-ld:DeviceModel:' + String(entity[relationship].value)
                };
            }
        });

        // Code unit is to be stored as metadata
        if (entity.code_unit) {
            storeDeviceUnitCode(entity.id, entity.code_unit.value, (err, doc) => {
                debug('stored device', err);
            });
            delete entity.code_unit;
        }
        entities.push(entity);
    });
    return entities;
}

const upload = async (req, res) => {
    if (req.file === undefined) {
        return res.status(400).send('Please upload an excel file!');
    }

    const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;

    readXlsxFile(path)
        .then((rows) => {
            const entities = createEntitiesFromXlsx(rows);
            removeXlsxFile(path);
            return entities;
        })
        .then(async (entities) => {
            return await Measure.sendAsHTTP(entities);
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
