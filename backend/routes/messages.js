const express = require('express');
const Message = require('../models/Message');
const { auth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// @route   GET /api/messages
// @desc    Get user's messages
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20, projectId, orderId } = req.query;
    const query = {
      $or: [
        { sender: req.user.id },
        { receiver: req.user.id }
      ]
    };

    if (projectId) {
      query.project = projectId;
    }

    if (orderId) {
      query.order = orderId;
    }

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName avatar')
      .populate('receiver', 'firstName lastName avatar')
      .populate('project', 'title')
      .populate('order', 'project')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/conversations
// @desc    Get user's conversations
// @access  Private
router.get('/conversations', auth, async (req, res) => {
  try {
    // Get unique conversations
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { receiver: req.user._id }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', req.user._id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          user: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            avatar: 1,
            role: 1
          },
          lastMessage: {
            message: 1,
            createdAt: 1,
            messageType: 1
          },
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/messages/:userId
// @desc    Get messages between current user and another user
// @access  Private
router.get('/:userId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const otherUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user.id }
      ]
    })
      .populate('sender', 'firstName lastName avatar')
      .populate('receiver', 'firstName lastName avatar')
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Mark messages as read
    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    const total = await Message.countDocuments({
      $or: [
        { sender: req.user.id, receiver: otherUserId },
        { sender: otherUserId, receiver: req.user.id }
      ]
    });

    res.json({
      success: true,
      messages,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get user messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, upload.array('attachments', 5), handleUploadError, async (req, res) => {
  try {
    const { receiver, message, projectId, orderId, messageType = 'text' } = req.body;

    if (!receiver || !message) {
      return res.status(400).json({ message: 'Receiver and message are required' });
    }

    const attachments = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          type: file.mimetype
        });
      });
    }

    const newMessage = new Message({
      sender: req.user.id,
      receiver,
      message,
      project: projectId || null,
      order: orderId || null,
      attachments,
      messageType
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'firstName lastName avatar')
      .populate('receiver', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.receiver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to mark this message as read' });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/messages/read-all/:userId
// @desc    Mark all messages from a user as read
// @access  Private
router.put('/read-all/:userId', auth, async (req, res) => {
  try {
    const otherUserId = req.params.userId;

    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: 'All messages marked as read'
    });
  } catch (error) {
    console.error('Mark all messages as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
