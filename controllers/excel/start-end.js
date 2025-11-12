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
  return str.replace(
    /\w\S*/g,
    text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}

function clean(str){
    str = str.trim()
    return str.replace(/\s+/g, '-').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
function createEntitiesFromXlsx(rows , sheet) {

	const entities = [];

	const stations = rows[0];
	const lats = rows[1]; 
	const lngs = rows[2]; 

	stations.shift();
	lats.shift();
	lngs.shift();

	for (var i = 4; i < rows.length; i++) {
 		const data = rows[i];
 		if (!!data[0]){
 			const timestamp = moment.tz(`${data[0]}-01-01`, 'Etc/UTC').toISOString();
 			data.shift();


 			data.forEach((reading, index)=>{
 				if (!!reading){
 					const city = clean(stations[index]);
 					const lat = lats[index];
 					const lng = lngs[index];
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

 					if (sheet === 1){
 						obj.startDate = {
 							type: 'Property',
 							value: reading,
 							observedAt: timestamp
 						};

 					}
 					if (sheet === 2){
 						obj.endDate = {
 							type: 'Property',
 							value: reading,
 							observedAt: timestamp
 						};

 					}

 					entities.push(obj);

 					
 				}
 			});

 		
 		} else {
 			break;
 		}	

	}
    //console.log(entities);
    return entities;
}

const upload = (req, res) => {
    if (req.file === undefined) {
        return res.status(Status.UNSUPPORTED_MEDIA_TYPE).send('Please upload an excel file!');
    }

    const path = __basedir + '/resources/static/assets/uploads/' + req.file.filename;
    const sheet =  req.params.sheet ? Number(req.params.sheet) : 1;
    return readXlsxFile(path, { sheet: sheet})
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
        	debug(err)
            return res.status(Status.INTERNAL_SERVER_ERROR).send(err);
        });
};

module.exports = {
    upload
};
