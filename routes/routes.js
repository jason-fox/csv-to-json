const express = require('express');
const router = express.Router();
const palmController = require('../controllers/palm');
const csvController = require('../controllers/csv');
const excelController = require('../controllers/excel');
const apiController = require('../controllers/api');

/// Stock Market Ivory Coasr
const citiesController = require('../controllers/csv/cities');
const stockPriceController = require('../controllers/csv/stockprice');
const productsController = require('../controllers/csv/products');

const wikiController = require('../controllers/csv/cities-wiki');


const debutController = require('../controllers/excel/start-end');


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


router.post(
    '/csv/cities',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await citiesController.upload(req, res);
    })
);

router.post(
    '/csv/wiki',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await wikiController.upload(req, res);
    })
);

router.post(
    '/csv/products',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await productsController.upload(req, res);
    })
);

router.post(
    '/csv/stockprice',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await stockPriceController.upload(req, res);
    })
);

router.post(
    '/excel/start-end/:sheet',
    upload.single('file'),
    asyncHelper(async (req, res) => {
        await debutController.upload(req, res);
    })
);


module.exports = router;
