const NodeCache = require('node-cache');

// Cache GitHub API responses for 10 minutes
const cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

module.exports = cache;
