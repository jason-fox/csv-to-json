const Measure = require('../lib/measure');

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
function formatResponseData(contributor, model, externalUrl, data) {
    try {
        switch (contributor) {
            case 'ayogreen':
                if (model === 'parcel') {
                  return data.map((d) => {
                        const dd = d;
                        for (const [key, value] of Object.entries(dd)) {
                            if (value === null || value === undefined || value === '') {
                                delete dd[key]
                                continue;
                            }
                        }
                        return {
                            ...dd,
                            id: `urn:ngsi-ld:AgriParcel:${dd.id}`,
                            dateCreated: dd.created_at,
                            dateModified: dd.updated_at,
                            type: 'AgriParcel',
                            seeAlso: [externalUrl]
                        };
                    });
                }
                return null;
            default:
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
const upload = async (req, res) => {
    // get token from authorization header
    const requestToken = req.headers.authorization;

    //make request to api end point
    const { externalUrl, contributor, model } = req.body;

    const { data } = await fetchData(externalUrl, requestToken);
    if (!data || !Array.isArray(data) || data.length === 0) {
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
};

module.exports = {
    upload
};