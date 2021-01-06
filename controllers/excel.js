const readXlsxFile = require('read-excel-file/node');

const upload =  (req, res) => {
    try {
        if (req.file === undefined) {
            return res.status(400).send('Please upload an excel file!');
        }

         const path =
            __basedir + "/resources/static/assets/uploads/" + req.file.filename;


        const records = [];
        readXlsxFile(path).then((rows) => {
            // skip header
            rows.shift();


            rows.forEach((row) => {
                const record = {
                    id: row[0],
                    title: row[1],
                    description: row[2],
                    published: row[3]
                };

                records.push(record);
            });

            console.error(records);
            
        });
        return records;
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
