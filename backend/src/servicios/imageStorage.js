/**
 * Helpers para almacenamiento local de imágenes.
 * @module servicios/imageStorage
 */

const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg']);

const normalizePath = (value) => value.replace(/\\/g, '/');

const buildImageFolder = ({ projectId, taskId, subtaskId }) => {
    if (subtaskId) {
        return `projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}/images`;
    }
    return `projects/${projectId}/tasks/${taskId}/images`;
};

const buildFileName = (originalName) => {
    const ext = path.extname(originalName || '').toLowerCase();
    const safeExt = ext || '.png';
    return `${crypto.randomUUID()}${safeExt}`;
};

const ensureDir = async (absolutePath) => {
    await fs.mkdir(absolutePath, { recursive: true });
};

const buildPublicUrl = (req, relativePath) => {
    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/img/${normalizePath(relativePath)}`;
};

const isMimeAllowed = (mimeType) => ALLOWED_MIME.has(mimeType);

module.exports = {
    buildImageFolder,
    buildFileName,
    ensureDir,
    buildPublicUrl,
    isMimeAllowed,
    normalizePath,
};
