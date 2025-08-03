const express = require('express');
const router = express.Router();
const palmController = require('../controllers/palm');
const csvController = require('../controllers/csv');
const excelController = require('../controllers/excel');
const apiController = require('../controllers/api');
const upload = require('../lib/upload');

// Error Handling Helper Function
function asyncHelper(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(next);
    };
}

router.post(
    '/palm',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await palmController.upload(req, res);
    })
);
router.post(
    '/csv',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await csvController.upload(req, res);
    })
);
router.post(
    '/excel',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await excelController.upload(req, res);
    })
);
router.post(
    '/uploader',
    asyncHelper(async (req, res) => {
        await apiController.upload(req, res);
    })
);

module.exports = router;
