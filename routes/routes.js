const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csv');
const excelController = require('../controllers/excel');
const jsonController = require('../controllers/json');
const upload = require('../lib/upload');

// Error Handling Helper Function
function asyncHelper(fn) {
    return function (req, res, next) {
        fn(req, res, next).catch(next);
    };
}

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
    '/json',
    asyncHelper(async (req, res) => {
        await jsonController.upload(req, res);
    })
);

module.exports = router;
