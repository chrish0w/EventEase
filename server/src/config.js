const DEFAULT_JWT_SECRET = 'eventease-local-dev-secret';
const DEFAULT_MONGO_URI = 'mongodb://127.0.0.1:27017/eventease';
const DEFAULT_PORT = 5000;

module.exports = {
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  mongoUri: process.env.MONGO_URI || DEFAULT_MONGO_URI,
  port: Number(process.env.PORT) || DEFAULT_PORT,
};
