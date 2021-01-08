const multer = require('multer');

const csvFilter = (req, file, callback) => {
    if (file.mimetype.includes('csv') || file.mimetype.includes('excel') || file.mimetype.includes('spreadsheetml')) {
        callback(null, true);
    } else {
        callback('Please upload only csv and excel file.', false);
    }
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, __basedir + '/resources/static/assets/uploads/');
    },
    filename: (req, file, callback) => {
        callback(null, `${Date.now()}-${file.originalname}`);
    }
});

const uploadFile = multer({ storage, fileFilter: csvFilter });
module.exports = uploadFile;
