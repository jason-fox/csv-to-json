const fs = require('fs');
const csv = require('fast-csv');
const Measure = require('../../lib/measure');
const debug = require('debug')('server:cities');
const _ = require('underscore');
const Status = require('http-status-codes');
const moment = require('moment-timezone');


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

function toTitleCase(str) {
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

function clean(str){
    str = str.trim()
    return toBracket(str.replace(/\s+/g, '-').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        )
}


function toBracket(str) {
    
    const match = str.match(/\(/);
    if(match)
    {
        return str.substring(0, match.index-1).trim();
    }
    return str;
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



function createEntitiesFromRows(rows) {
    const allEntities = [];
    const hasStocks = {};

    rows.forEach((row) => {

        const id= clean(row.VILLE)
        const timestamp = moment.tz(row.ANNEE, 'Etc/UTC').toISOString();
        const entity = {

             id: `urn:ngsi-ld:City:${id}`,
             type: 'City',
             name: {type: 'Property', value: toTitleCase(row.VILLE)},
             location: { type: 'GeoProperty', value: {
                type: 'Point',
                coordinates: [Number(row.LNG), Number(row.LAT) ]
             }},
             region: row.REGION,
             population: {
                value: Number(row.POP), observedAt: timestamp
             }
        };
        allEntities.push(entity);
    });

    console.log(allEntities)
    return allEntities;
}

/*
 * Create an array of promises to send data to the context broker.
 * Each insert represents a series of readings at a given timestamp
 */
function createContextRequests(entities) {
    const promises = [];
    entities.forEach((entitiesAtTimeStamp) => {
        promises.push(Measure.sendAsHTTP(entitiesAtTimeStamp));
    });
    return promises;
}

/**
 * Actions when uploading a CSV file. The CSV file holds an array of
 * measurements each at a given timestamp.
 */
const upload = (req, res) => {
    if (req.file === undefined) {
        return res.status(Status.UNSUPPORTED_MEDIA_TYPE).send('Please upload a CSV file!');
    }

    const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;

    return readCsvFile(path)
        .then((rows) => {
            removeCsvFile(path);
            return createEntitiesFromRows(rows);
        })
        .then((entities) => {
            
            batchEntities = []
            const chunkSize = 100;
           
            for (let i = 0; i < entities.length; i += chunkSize) {
                 const chunk = entities.slice(i, i + chunkSize);
                 batchEntities.push(chunk)
            }

            return createContextRequests(batchEntities);
        })
        .then(async (promises) => {
            
            const results = [];
            for (let promiseFn of promises) {
                const result = await promiseFn;
                results.push(result)
            }

            /*for (const promise of promises) {
              const result = await promise;
              results.push(result)
            }*/
            return results;
        })
        .then((results) => {
            const errors = _.where(results, { status: 'rejected' });
            return errors.length ? res.status(Status.BAD_REQUEST).json(errors) : res.status(Status.NO_CONTENT).send();
        })
        .catch((err) => {
            debug(err.message);
            return res.status(Status.INTERNAL_SERVER_ERROR).send(err.message);
        });
};

module.exports = {
    upload
};
