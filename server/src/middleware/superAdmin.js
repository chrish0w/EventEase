const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    if (req.user.role !== 'super_admin') return res.status(403).json({ message: 'Super Admin only' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};
