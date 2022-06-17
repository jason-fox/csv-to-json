const debug = require('debug')('server:json');
const Status = require('http-status-codes');
const moment = require('moment-timezone');

/**
 * Actions when uploading a CSV file. The CSV file holds an array of
 * measurements each at a given timestamp.
 */

function property(obj, attr, value, observedAt){
	obj[attr] = {
		type : 'Property',
		value,
		observedAt
	};
}

function relationship(obj, attr, object, observedAt){
	obj[attr] = {
		type : 'Relationship',
		object,
		observedAt
	};
}

function languageProperty(obj, attr, observedAt, ar, fr){
	obj[attr] = {
		type : 'Property',
		observedAt,
		languageMap: {
			ar, fr
		} 
	};
}

const upload = (req, res) => {
    

    const id="12345678"; 

   /// 
   // Get French

   const rawFrench = {
  "CIN": "12345678",
  "codeR": "1",
  "prenom": "Amami",
  "nom": "AMRI",
  "sexe": "2",
  "chainePere": "SAMI AMRI",
  "chaineMere": "HASNA BENI",
  "dateNaiss": "02/03/1992"
}



   // Get Arabic
   const rawArabic = {
  "CIN": "12345678",
  "codeR": "1",
  "prenom": "تحبني",
  "nom": "العامري",
  "sexe": "2",
  "chainePere": "سامي أمري",
  "chaineMere": "حسنى بني",
  "dateNaiss": "12/03/1983"
}




const entity = {
    id: 'urn:ngsi-ld:Person:' + rawArabic.CIN ,
    type: 'Person',
};

const observedAt = "2022-03-14T12:51:02.000Z";

property(entity, 'sex', rawArabic.sexe === "1" ? "male" : "female");
languageProperty(entity, 'firstName', observedAt, rawArabic.prenom, rawFrench.prenom);
languageProperty(entity, 'lastName', observedAt, rawArabic.nom, rawFrench.nom);

property(entity, 'dateOfBirth', moment.tz(moment(rawArabic.dateNaiss).format("DD MM YYYY"), 'Etc/UTC').toISOString());


relationship(entity, 'spouse', observedAt, '876543')




/*
entity.sex = {
	type : 'Property',
	value : rawArabic.sexe === "1" ? "male" : "female"
};
*/


 
debug(JSON.stringify(entity));






    return res.status(Status.NO_CONTENT).send('done');
};

module.exports = {
    upload
};
