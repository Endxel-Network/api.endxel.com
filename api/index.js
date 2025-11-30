module.exports = async (req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.send(`Please provide a version

Example: https://api.endxel.com/version/1.21.8`);
};

