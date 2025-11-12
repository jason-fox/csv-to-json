const readXlsxFile = require('read-excel-file/node');
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
function createEntitiesFromXlsx(rows, sheet) {
    const entities = [];
    const header = rows[0];
    for (var i = 1; i < rows.length; i++) {
        const data = rows[i];
        if (!!data[0]) {
            const city = data[0];
            const lat = data[1];
            const lng = data[2];
            const year = data[3];
            const timestamp = moment.tz(`${data[3]}-01-01`, 'Etc/UTC').toISOString();
            const id = `urn:ngsi-ld:City:${city.toLowerCase()}`;
            const obj = {
                id,
                type: 'City',
                name: {
                    type: 'Property',
                    value: toTitleCase(city)
                },
                location: {
                    type: 'GeoProperty',
                    value: {
                        type: 'Point',
                        coordinates: [Number(lng), Number(lat)]
                    }
                }
            };

            for (var j = 4; j < data.length; j++) {
                if (!!data[j]) {
                    obj[header[j].toLowerCase()] = {
                        type: 'Property',
                        value: Number(data[j]),
                        observedAt: timestamp
                    };
                }
            }
            entities.push(obj);
        } else {
            break;
        }
    }
    return entities;
}

const upload = (req, res) => {
    if (req.file === undefined) {
        return res.status(Status.UNSUPPORTED_MEDIA_TYPE).send('Please upload an excel file!');
    }

    const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;
    const sheet = req.params.sheet ? Number(req.params.sheet) : 1;
    return readXlsxFile(path, { sheet: sheet })
        .then((rows) => {
            const entities = createEntitiesFromXlsx(rows, sheet);
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
