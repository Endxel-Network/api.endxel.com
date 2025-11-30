module.exports = async (req, res) => {
    res.json({
        name: 'Endxel Mods API',
        version: '1.0.0',
        endpoints: {
            versions: {
                url: '/versions',
                method: 'GET',
                description: 'List all available Minecraft versions'
            },
            download: {
                url: '/version/{version}',
                method: 'GET',
                description: 'Download all mods for a specific Minecraft version as a zip file',
                example: '/version/1.21.8'
            }
        },
        github: 'https://github.com/Endxel-Network/Mods'
    });
};

