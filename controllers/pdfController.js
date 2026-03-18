const { PdfDocument, PdfChunk } = require('../models');
const { processPdf } = require('../services/pdfService');
const fs = require('fs');
const path = require('path');

// Configure upload directory
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

exports.uploadPdf = async (req, res) => {
  try {
    const { botId } = req.body;
    if (!botId) return res.status(400).json({ error: 'botId is required' });
    if (!req.file) return res.status(400).json({ error: 'PDF file is required' });

    // Ensure only the bot owner can upload (Basic check, assume user is authenticated and ID matches bot)
    // You would typically verify req.user.id matches the bot.user_id here.

    const newPdf = await PdfDocument.create({
      bot_id: botId,
      file_name: req.file.originalname,
      file_path: req.file.path,
      status: 'pending' // Initialize as pending
    });

    // Start processing asynchronously (in background)
    processPdf(newPdf).catch(console.error);

    res.status(201).json({ 
        message: 'PDF uploaded and processing started', 
        pdf: newPdf 
    });

  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getPdfsByBot = async (req, res) => {
  try {
    const { botId } = req.params;
    const pdfs = await PdfDocument.findAll({
      where: { bot_id: botId },
      order: [['createdAt', 'DESC']]
    });
    res.json(pdfs);
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deletePdf = async (req, res) => {
  try {
    const { id } = req.params;
    const pdf = await PdfDocument.findByPk(id);

    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Delete chunks first (Due to onDelete: CASCADE this might be redundant but safe)
    await PdfChunk.destroy({ where: { pdf_id: id } });

    // Remove physical file
    if (fs.existsSync(pdf.file_path)) {
       fs.unlinkSync(pdf.file_path);
    }

    // Delete db record
    await pdf.destroy();

    res.json({ message: 'PDF and associated data deleted successfully' });
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
