"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Health check route
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API routes are working',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
