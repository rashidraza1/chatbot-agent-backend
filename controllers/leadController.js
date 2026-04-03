const { Visitor, Conversation } = require('../models');

exports.getLeads = async (req, res) => {
  try {
    const leads = await Visitor.findAll({
      where: {
        is_lead: true
      },
      include: [
        {
          model: Conversation,
          attributes: ['id', 'title', 'createdAt']
        }
      ],
      order: [['last_seen', 'DESC']]
    });

    res.json(leads);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json({ message: 'Server error fetching leads' });
  }
};
