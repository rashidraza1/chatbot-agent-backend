const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { User, Visitor } = require('../models');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  full_name: Joi.string().required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

exports.register = async (req, res) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, password, full_name } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password_hash, full_name });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const { error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, type: 'user' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.guestLogin = async (req, res) => {
  try {
    const visitor = await Visitor.create({
      name: `Guest_${Math.floor(1000 + Math.random() * 9000)}`,
      last_page_url: req.headers.referer || null
    });

    const token = jwt.sign(
      { id: visitor.id, type: 'guest' }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ token, visitor: { id: visitor.id, name: visitor.name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating guest' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.captureLead = async (req, res) => {
  try {
    // Debug logging
    console.log('Capture Lead Request - userType:', req.userType);
    console.log('Capture Lead Request - user ID:', req.user?.id);

    const user = req.user;
    if (!user || req.userType !== 'guest') {
      return res.status(403).json({ 
        message: 'Not authorized as a guest',
        debug: { userType: req.userType, hasUser: !!user } 
      });
    }

    const { name, email, mobile_number } = req.body;
    
    if (!name || (!email && !mobile_number)) {
      return res.status(400).json({ message: 'Name and at least email or mobile are required.' });
    }

    const visitor = await Visitor.findByPk(user.id);
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor record not found' });
    }

    // Update visitor with lead information
    await visitor.update({
      name,
      email: email || null,
      mobile: mobile_number || null,
      is_lead: true
    });

    res.json({ message: 'Lead captured successfully', visitor: { id: visitor.id, name: visitor.name, is_lead: true } });
  } catch (err) {
    console.error('Error capturing lead:', err);
    res.status(500).json({ message: 'Server error capturing lead' });
  }
};
