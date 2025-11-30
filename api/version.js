const fetch = require('node-fetch');
const archiver = require('archiver');

const GITHUB_REPO = 'Endxel-Network/api.endxel.com';
const GITHUB_API_BASE = 'https://api.github.com';
const MODS_PATH = 'mods/version'; // Mods are stored in /mods/version/{version}/

module.exports = async (req, res) => {
    // Get version from query param
    const version = req.query.version || req.query.v;

    if (!version) {
        return res.status(400).json({ error: 'Version parameter is required' });
    }

    // Validate version format (e.g., 1.21.8, 1.20.1)
    if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
        return res.status(400).json({ error: 'Invalid version format' });
    }

    try {
        // Fetch the contents of the version folder from GitHub
        const contentsUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${MODS_PATH}/${version}`;
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Endxel-Mods-API'
        };

        // Add GitHub token if available (for higher rate limits)
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

        // Filter for .jar files only
        const jarFiles = contents.filter(file => 
            file.type === 'file' && file.name.endsWith('.jar')
        );

        if (jarFiles.length === 0) {
            return res.status(404).json({ 
                error: 'No mods found',
                message: `No .jar files found for version ${version}`
            });
        }

        // Set response headers for zip download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="endxel-mods-${version}.zip"`);

        // Create archive
        const archive = archiver('zip', { zlib: { level: 5 } });

        archive.on('error', (err) => {
            console.error('Archive error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to create zip archive' });
            }
        });

        // Pipe archive to response
        archive.pipe(res);

        // Download each jar file and add to archive
        for (const file of jarFiles) {
            const fileResponse = await fetch(file.download_url, { headers });
            
            if (fileResponse.ok) {
                const buffer = await fileResponse.buffer();
                archive.append(buffer, { name: file.name });
            }
        }

        // Finalize the archive
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

