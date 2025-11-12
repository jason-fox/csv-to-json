const Measure = require('../lib/measure');
const moment = require('moment-timezone');
const debug = require('debug')('server:api');

async function fetchData(endpoint, requestToken) {
    try {
        const response = await fetch(endpoint, {
            headers: {
                Authorization: `${requestToken}`
            }
        });
        return await response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}
function formatResponseRecord(entityType, idPrefix, record) {
    const entity = {
        type: entityType
    };
    for (const [k, v] of Object.entries(record)) {
        if (v === null || v === undefined || v === '') {
            continue;
        }
        if (k === 'id' || k === 'updated_at' || k === 'created_at') {
            switch (k) {
                case 'id':
                    entity[k] = `${idPrefix}:${v}`;
                    break;
                default:
                    entity[k] = v;
            }
            continue;
        }
        entity[k] = {
            type: 'Property',
            value: v
        };
    }
    //entity["createdAt"] = new Date().toISOString()
    return entity;
}
function formatResponseData(contributor, model, externalUrl, data) {
    try {
        switch (contributor) {
            case 'ayogreen':
                if (model === 'parcel') {
                    return data.map((dd) => {
                        const entity = formatResponseRecord('AgriParcel', 'urn:ngsi-ld:AgriParcel', dd);
                        return {
                            ...entity,
                            seeAlso: {
                                type: 'Property',
                                value: [externalUrl]
                            }
                        };
                    });
                }
                if (model === 'weather') {
                    return data.map((dd) => {
                        const entity = formatResponseRecord('WeatherObserved', 'urn:ngsi-ld:WeatherObserved', dd);
                        return {
                            ...entity,
                            seeAlso: {
                                type: 'Property',
                                value: [externalUrl]
                            }
                        };
                    });
                }
                if (model === 'crop') {
                    return data.map((dd) => {
                        const entity = formatResponseRecord('AgriCrop', 'urn:ngsi-ld:AgriCrop', dd);
                        return {
                            ...entity,
                            seeAlso: {
                                type: 'Property',
                                value: [externalUrl]
                            }
                        };
                    });
                }

                debug(`unknown model ${model}`);
                return null;
            default:
                debug(`unknown contributor ${contributor}`);
                return null;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
}

/**
 * Actions when uploading a API. The API holds an array of
 * measurements each at a given timestamp.
 */
async function upload(req, res) {
    // get token from authorization header
    const requestToken = req.headers.authorization;

    //make request to api end point
    const { externalUrl, contributor, model } = req.body;

    const result = await fetchData(externalUrl, requestToken);
    let data = [];
    if (result?.data) {
        data = result.data;
    } else {
        data = result;
    }

    if (!data) {
        return res.status(400).send({ message: 'data could not be fetched from api', data });
    }

    const formattedData = formatResponseData(contributor, model, externalUrl, data);
    if (!formattedData) {
        return res.status(400).send({ message: 'response could not be formatted', data });
    }
    // return res.status(200).send({ message: 'data fetched from api', formattedData });
    //Send data to context broker
    const cbResponse = await Measure.sendAsHTTP(formattedData);
    if (cbResponse && (cbResponse.statusCode === 200 || cbResponse.statusCode === 201)) {
        return res.status(cbResponse.statusCode).send({ message: 'data sent to context broker', formattedData });
    }
    return res
        .status(cbResponse ? cbResponse.statusCode : 204)
        .send({ message: 'error sending data to context broker', formattedData });
}

module.exports = {
    upload
};
