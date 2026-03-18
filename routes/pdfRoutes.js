const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middleware/authMiddleware'); // Re-use existing auth

// Multer config for PDF uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only standard PDF files are allowed!'), false);
        }
    }
});

router.post('/upload', authMiddleware.protect, upload.single('pdf'), pdfController.uploadPdf);
router.get('/bot/:botId', authMiddleware.protect, pdfController.getPdfsByBot);
router.delete('/:id', authMiddleware.protect, pdfController.deletePdf);

module.exports = router;
