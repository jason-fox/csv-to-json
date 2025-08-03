const fs = require('fs');
const csv = require('fast-csv');
const Measure = require('../lib/measure');
const debug = require('debug')('server:csv');
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

function createEntitiesFromRows(rows) {
    const allEntities = [];

    rows.forEach((row, index) => {
        const timestamp = moment.tz(row.annee, 'Etc/UTC').toISOString() 
        const entity = {

             id: 'urn:ngsi-ld:AgriParcel:' + row.ID.toLowerCase(),
             type: 'AgriParcel',

            region:  {
                type: 'Property',
                value: row.REGION
            },
            area_code: {
                type: 'VocabProperty',
                vocab: row.CODIFICATION
            },
            position: {
                type: 'Property',
                value: row.LOCALISATION
            },
        


            // slope:  {
            //     type: 'Property',
            //     value: Number.parseFloat(row.pente),
            //     unitCode: 'DD'
            // },
            // soil_acidity:  {
            //     type: 'Property',
            //     value: Number.parseFloat(row.ph_sol),
            //     unitCode: 'Q30'
            // },
            // rainfall:  {
            //     type: 'Property',
            //     value: Number.parseFloat(row.pluie),
            //     unitCode: 'MMT'
            // },
            // temperature:  {
            //     type: 'Property',
            //     value: Number.parseFloat(row.temperature),
            //     unitCode: 'CEL'
            // },
            // age:  {
            //     type: 'Property',
            //     value: Number.parseFloat(row.age_arbre),
            //     unitCode: 'ANN'
            // },
            //  fertilisation:  {
            //     type: 'Property',
            //     value: 0.1 * Number.parseFloat(row.fertilisation),
            //     unitCode: 'GM'
            // },
            // treatments:  {
            //     type: 'Property',
            //     value: Number.parseFloat(row.traitement_pesticide),
            //     unitCode: 'H09'
            // },

            // pest_presence:  {
            //     type: 'Property',
            //     value: (Number.parseInt(row.presence_ravageur) === 1)
            // },
            // access_to_training:  {
            //     type: 'Property',
            //     value: (Number.parseInt(row.acces_formation) === 1)
            // },
            //  size:  {
            //     type: 'Property',
            //     value: Number.parseInt(row.taille) 
            // },
            //  handWorked:  {
            //     type: 'Property',
            //     value: (Number.parseInt(row.main_oeuvre) === 1)
            // },
            //   yield:  {
            //     type: 'Property',
            //     value: 0.1 * Number.parseInt(row.rendement_kg_ha),
            //     unitCode: 'GM'
            // },
            // age_of_farmer:  {
            //     type: 'Property',
            //     value: Number.parseInt(row.age_producteur),
            //     unitCode: 'ANN'
            // },
            // experience_of_farmer:  {
            //     type: 'Property',
            //     value: Number.parseInt(row.experience_producteur),
            //     unitCode: 'ANN'
            // },
            // handlingCount:  {
            //     type: 'Property',
            //     value: Number.parseInt(row.taille_menage)
            // },
            // childrenCount: {
            //   type: 'Property',
            //     value: Number.parseInt(row.nb_enfants_plus_12)
            // },
            // levelOfEducation: {
            //     type: 'VocabProperty',
            //     vocab: row.niveau_education
            // },
            // sex: {
            //     type: 'VocabProperty',
            //     vocab: row.sexe
            // },







        };

        Object.keys(entity).forEach((key, index) => {
        if (key === 'id') {
        } else if (key === 'type') {
        } else {
            entity[key].observedAt = timestamp;
        }
    });


        allEntities.push(entity);
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
            //console.log(rows[0])
            return createEntitiesFromRows(rows);
        })
        .then((entities) => {
            console.log(JSON.stringify(entities[0], null, 2))

            batchEntities = []
            const chunkSize = 10;
            for (let i = 0; i < entities.length; i += chunkSize) {
                const chunk = entities.slice(i, i + chunkSize);
                batchEntities.push(chunk)
            }
            // for (let i = 0; i < entities.length; i += chunkSize) {
            //     const chunk = entities.slice(i, i + chunkSize);
            //     batchEntities.push(chunk)
            // }

            return createContextRequests(batchEntities);
        })
        .then(async (promises) => {
            return await Promise.allSettled(promises);
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
