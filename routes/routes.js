const express = require('express');
const router = express.Router();
const csvController = require('../controllers/csv');
const excelController = require('../controllers/excel');
const upload = require('../middlewares/upload');

/* eslint-disable consistent-return */
router.post('/csv', upload.single('file'), csvController.upload);
router.post('/excel', upload.single('file'), excelController.upload);

module.exports = router;
