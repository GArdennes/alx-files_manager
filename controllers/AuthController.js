const { redisClient } = require('../utils/redisClient');
const { dbClient } = require('../utils/dbClient');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

exports.getConnect = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).send('Unauthorized');
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [email, password] = decoded.split(':');
    const user = await dbClient.db.collection('users').findOne({
        email,
        password: crypto.createHash('sha1').update(password).digest('hex'),
    });

    if (!user) {
        return res.status(401).send('Unauthorized');
    }

    const token = uuidv4();
    const key = `auth_${token}`;
    await redisClient.set(key, user._id.toString(), 'EX', 60 * 60 * 24);
    res.status(200).json({ token });
};

exports.getDisconnect = async (req, res) => {
    const token = req.headers['x-token'];
    if (!token) {
        return res.status(401).send('Unauthorized');
    }

    const deleted = await redisClient.del(`auth_${token}`);
    if (deleted === 0) {
        return res.status(401).send('Unauthorized');
    }

    res.sendStatus(204);
};

