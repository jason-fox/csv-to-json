const fs = require('fs');
const csv = require('fast-csv');

const upload = (req, res) => {
    try {
        if (req.file === undefined) {
            return res.status(400).send('Please upload a CSV file!');
        }

        const records = [];

        const path = __basedir + "/resources/static/assets/uploads/" + req.file.filename;

        fs.createReadStream(path)
            .pipe(csv.parse({ headers: true }))
            .on('error', (error) => {
                throw error.message;
            })
            .on('data', (row) => {
                records.push(row);
            })
            .on('end', () => {
                console.error(records);
            });
        return res.status(204).send();

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
