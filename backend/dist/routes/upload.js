"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../middleware/upload");
const auth_1 = require("../middleware/auth");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = (0, express_1.Router)();
/**
 * POST /api/upload/image
 * Upload an image file (requires authentication)
 */
router.post('/image', auth_1.authenticate, upload_1.upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided',
                errors: { image: 'Image file is required' }
            });
        }
        // Generate the URL for the uploaded image
        // Hardcoded HTTPS URL for production deployment
        const baseUrl = 'https://linkedclone.onrender.com';
        const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;
        res.status(201).json({
            success: true,
            message: 'Image uploaded successfully',
            data: {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                url: imageUrl
            }
        });
    }
    catch (error) {
        console.error('Error uploading image:', error);
        // Clean up uploaded file if there was an error
        if (req.file) {
            try {
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (unlinkError) {
                console.error('Error cleaning up uploaded file:', unlinkError);
            }
        }
        res.status(500).json({
            success: false,
            message: 'Failed to upload image'
        });
    }
});
/**
 * DELETE /api/upload/image/:filename
 * Delete an uploaded image (requires authentication)
 */
router.delete('/image/:filename', auth_1.authenticate, async (req, res) => {
    try {
        const { filename } = req.params;
        // Validate filename to prevent directory traversal
        if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({
                success: false,
                message: 'Invalid filename'
            });
        }
        const filePath = path_1.default.join(process.cwd(), 'uploads', filename);
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }
        // Delete the file
        fs_1.default.unlinkSync(filePath);
        res.json({
            success: true,
            message: 'Image deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete image'
        });
    }
});
exports.default = router;
