const fs = require('fs');
const csv = require('fast-csv');
const Measure = require('../../lib/measure');
const debug = require('debug')('server:ayogreen');
const _ = require('underscore');
const Status = require('http-status-codes');

/*
 * Nettoyage du fichier temporaire
 */
function removeCsvFile(path) {
    fs.unlink(path, (err) => {
        if (err) {
            throw err;
        }
    });
}

/*
 * Lecture du fichier CSV
 */
function readCsvFile(path) {
    return new Promise((resolve, reject) => {
        const rows = [];
        fs.createReadStream(path)
            .pipe(csv.parse({ headers: true, delimiter: ',' }))
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
 * TRANSFORMATION CSV -> NGSI-LD (Spécial Fermiers)
 */
function createEntitiesFromRows(rows) {
    const allEntities = [];

    rows.forEach((row) => {
        // On s'assure de ne traiter que les Personnes
        if (row.type !== 'Person') return;

        const entity = {
            id: row.id, // ex: urn:ngsi-ld:Person:person140
            type: 'Person',
            
            // Propriétés de base
            name: { 
                type: 'Property', 
                value: row.name 
            },
            jobTitle: { 
                type: 'Property', 
                value: row.jobTitle_name // Correspond à ton CSV
            },
            gender: { 
                type: 'Property', 
                value: row.gender 
            },
            
            // Adresse construite à partir de la ville
            address: {
                type: 'Property',
                value: {
                    addressLocality: row.locationCity,
                    addressCountry: "Côte d'Ivoire"
                }
            },

            // Contexte spécifique pour le modèle Personne
            "@context": [
                "https://raw.githubusercontent.com/smart-data-models/dataModel.User/master/context.jsonld",
                "https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld"
            ]
        };

        // Ajout du téléphone si la colonne n'est pas vide
        if (row.telephone) {
            entity.telephone = { type: 'Property', value: row.telephone };
        }

        // GESTION DES PARCELLES POSSÉDÉES (Colonne 'owns')
        // Format attendu dans le CSV : "urn:...:001; \nurn:...:002"
        if (row.owns) {
            // Nettoyage des sauts de ligne et découpage par point-virgule
            const parcels = row.owns
                .replace(/(\r\n|\n|\r)/gm, "") 
                .split(';')
                .map(p => p.trim())
                .filter(p => p.length > 0);

            if (parcels.length > 0) {
                entity.owns = {
                    type: 'Relationship',
                    object: parcels // Envoie la liste des IDs des parcelles
                };
            }
        }

        allEntities.push(entity);
    });

    return allEntities;
}

/*
 * Envoi des données par paquets (Batching)
 */
function createContextRequests(entities) {
    const promises = [];
    if (entities.length > 0) {
        // La librairie Measure gère l'envoi vers Orion
        promises.push(Measure.sendAsHTTP(entities));
    }
    return promises;
}

/**
 * Point d'entrée principal (appelé par la route)
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
            // Batching par paquets de 100
            const batchEntities = [];
            const chunkSize = 100;

            for (let i = 0; i < entities.length; i += chunkSize) {
                batchEntities.push(entities.slice(i, i + chunkSize));
            }

            const promises = batchEntities.map(chunk => createContextRequests(chunk));
            return _.flatten(promises);
        })
        .then(async (promises) => {
            return Promise.allSettled(promises);
        })
        .then((results) => {
            const errors = _.where(results, { status: 'rejected' });
            if (errors.length) {
                return res.status(Status.BAD_REQUEST).json(errors);
            }
            return res.status(Status.NO_CONTENT).send();
        })
        .catch((err) => {
            debug(err.message);
            return res.status(Status.INTERNAL_SERVER_ERROR).send(err.message);
        });
};

module.exports = {
    upload
};