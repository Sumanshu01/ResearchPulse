export const validateRegister = (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || username.trim().length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters long' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  next();
};

export const validateSavePaper = (req, res, next) => {
  const { paperId, collectionName } = req.body;

  if (!paperId) {
    return res.status(400).json({ message: 'Paper ID is required' });
  }

  if (collectionName && collectionName.trim().length === 0) {
    return res.status(400).json({ message: 'Collection name cannot be empty' });
  }

  next();
};
