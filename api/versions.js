const fetch = require('node-fetch');

const GITHUB_REPO = 'Endxel-Network/api.endxel.com';
const GITHUB_API_BASE = 'https://api.github.com';
const MODS_PATH = 'mods/version';

module.exports = async (req, res) => {
    try {
        const contentsUrl = `${GITHUB_API_BASE}/repos/${GITHUB_REPO}/contents/${MODS_PATH}`;
        const headers = {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Endxel-Mods-API'
        };

        if (process.env.GITHUB_TOKEN) {
            headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
        }

        const response = await fetch(contentsUrl, { headers });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const contents = await response.json();

        const versions = contents
            .filter(item => item.type === 'dir' && /^\d+\.\d+(\.\d+)?$/.test(item.name))
            .map(item => item.name)
            .sort((a, b) => {
                const partsA = a.split('.').map(Number);
                const partsB = b.split('.').map(Number);
                for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                    const diff = (partsB[i] || 0) - (partsA[i] || 0);
                    if (diff !== 0) return diff;
                }
                return 0;
            });

        res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
        res.json({
            success: true,
            versions,
            count: versions.length
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: 'Failed to fetch versions',
            message: error.message
        });
    }
};
