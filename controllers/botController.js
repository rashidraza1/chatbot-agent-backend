const { Bot } = require('../models');
const Joi = require('joi');

const botSchema = Joi.object({
  name: Joi.string().required(),
  avatar_url: Joi.string().allow('', null),
  color_theme: Joi.string().allow('', null),
  welcome_message: Joi.string().allow('', null),
  use_ai: Joi.boolean(),
  faqs: Joi.array().items(
    Joi.object({
      question: Joi.string().required(),
      answer: Joi.string().required()
    })
  ).allow(null)
});

exports.createBot = async (req, res) => {
  try {
    const { error } = botSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const botParams = { ...req.body, user_id: req.user.id };
    const bot = await Bot.create(botParams);

    res.status(201).json(bot);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error creating bot' });
  }
};

exports.getBots = async (req, res) => {
  try {
    const bots = await Bot.findAll({ where: { user_id: req.user.id } });
    res.json(bots);
  } catch (err) {
    res.status(500).json({ message: 'Server Error fetching bots' });
  }
};

exports.getBotById = async (req, res) => {
  try {
    const bot = await Bot.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!bot) return res.status(404).json({ message: 'Bot not found' });
    res.json(bot);
  } catch (err) {
    res.status(500).json({ message: 'Server Error fetching bot' });
  }
};

exports.updateBot = async (req, res) => {
  try {
    const { error } = botSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.details[0].message });

    const bot = await Bot.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!bot) return res.status(404).json({ message: 'Bot not found' });

    await bot.update(req.body);
    res.json(bot);
  } catch (err) {
    res.status(500).json({ message: 'Server Error updating bot' });
  }
};

exports.deleteBot = async (req, res) => {
  try {
    const bot = await Bot.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!bot) return res.status(404).json({ message: 'Bot not found' });

    await bot.destroy();
    res.json({ message: 'Bot deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server Error deleting bot' });
  }
};

// Public endpoint for the widget to fetch bot config
exports.getWidgetBotConfig = async (req, res) => {
  try {
    const bot = await Bot.findByPk(req.params.id, {
      attributes: ['id', 'name', 'avatar_url', 'color_theme', 'welcome_message', 'use_ai', 'faqs']
    });
    if (!bot) return res.status(404).json({ message: 'Bot not found' });
    res.json(bot);
  } catch (err) {
    res.status(500).json({ message: 'Server Error' });
  }
};
