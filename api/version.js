const fetch = require('node-fetch');
const archiver = require('archiver');

const GITHUB_REPO = 'Endxel-Network/api.endxel.com';
const GITHUB_API_BASE = 'https://api.github.com';
const MODS_PATH = 'mods/version';

module.exports = async (req, res) => {
    const version = req.query.version || req.query.v;

    if (!version) {
        return res.status(400).json({
            error: 'Please provide a version',
            example: 'https://api.endxel.com/version/1.21.8'
        });
    }

    if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
        return res.status(400).json({
            error: 'Invalid version format',
            example: 'https://api.endxel.com/version/1.21.8'
        });
    }

    try {
        const contentsUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${MODS_PATH}/${version}`;
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Endxel-Mods-API'
        };

        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const contentsResponse = await fetch(contentsUrl, { headers });

        if (contentsResponse.status === 404) {
            return res.status(404).json({
                error: `Version ${version} not found`,
                message: `No mods available for Minecraft ${version}`
            });
        }

        if (!contentsResponse.ok) {
            throw new Error(`GitHub API error: ${contentsResponse.status}`);
        }

        const contents = await contentsResponse.json();

        const jarFiles = contents.filter(file =>
            file.type === 'file' && file.name.endsWith('.jar')
        );

        if (jarFiles.length === 0) {
            return res.status(404).json({
                error: 'No mods found',
                message: `No .jar files found for version ${version}`
            });
        }

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="endxel-mods-${version}.zip"`);

        const archive = archiver('zip', { zlib: { level: 5 } });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to create zip archive' });
            }
        });

        archive.pipe(res);

        for (const file of jarFiles) {
            const fileResponse = await fetch(file.download_url, { headers });

            if (fileResponse.ok) {
                const buffer = await fileResponse.buffer();
                archive.append(buffer, { name: file.name });
            }
        }

        await archive.finalize();

    } catch (error) {
        console.error('Error:', error);
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
};
