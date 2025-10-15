const express = require('express');
const Order = require('../models/Order');
const Project = require('../models/Project');
const { auth } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get user's orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};

    // Find orders where user is either client or freelancer
    query.$or = [
      { client: req.user.id },
      { freelancer: req.user.id }
    ];

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('project', 'title description category')
      .populate('client', 'firstName lastName avatar')
      .populate('freelancer', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('project', 'title description category')
      .populate('client', 'firstName lastName avatar email')
      .populate('freelancer', 'firstName lastName avatar email')
      .populate('messages.sender', 'firstName lastName avatar');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is authorized to view this order
    const isClient = order.client._id.toString() === req.user.id;
    const isFreelancer = order.freelancer._id.toString() === req.user.id;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders
// @desc    Create a new order (when client accepts a proposal)
// @access  Private (Clients only)
router.post('/', auth, async (req, res) => {
  try {
    const { projectId, freelancerId, price, timeline, deadline } = req.body;

    // Validation
    if (!projectId || !freelancerId || !price || !timeline || !deadline) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Check if project exists and user is the client
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to create order for this project' });
    }

    // Check if order already exists
    const existingOrder = await Order.findOne({ project: projectId });
    if (existingOrder) {
      return res.status(400).json({ message: 'Order already exists for this project' });
    }

    const order = new Order({
      project: projectId,
      client: req.user.id,
      freelancer: freelancerId,
      price,
      timeline,
      deadline: new Date(deadline),
      status: 'pending'
    });

    await order.save();

    // Update project status
    project.status = 'in-progress';
    project.freelancer = freelancerId;
    await project.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('project', 'title description category')
      .populate('client', 'firstName lastName avatar')
      .populate('freelancer', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: populatedOrder
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, progress } = req.body;

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const isClient = order.client.toString() === req.user.id;
    const isFreelancer = order.freelancer.toString() === req.user.id;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ message: 'Not authorized to modify this order' });
    }

    if (status) {
      order.status = status;
      
      if (status === 'completed') {
        order.completedAt = new Date();
        order.progress = 100;
      }
    }

    if (progress !== undefined && isFreelancer) {
      order.progress = Math.max(0, Math.min(100, progress));
    }

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('project', 'title description category')
      .populate('client', 'firstName lastName avatar')
      .populate('freelancer', 'firstName lastName avatar');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: populatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders/:id/deliverables
// @desc    Add deliverables to order
// @access  Private (Freelancers only)
router.post('/:id/deliverables', auth, async (req, res) => {
  try {
    const { title, description } = req.body;

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to add deliverables to this order' });
    }

    const deliverable = {
      title,
      description,
      status: 'pending'
    };

    order.deliverables.push(deliverable);
    await order.save();

    res.json({
      success: true,
      message: 'Deliverable added successfully',
      order
    });
  } catch (error) {
    console.error('Add deliverable error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders/:id/deliverables/:deliverableId/submit
// @desc    Submit deliverable files
// @access  Private (Freelancers only)
router.post('/:id/deliverables/:deliverableId/submit', auth, upload.array('files', 10), handleUploadError, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to submit deliverables for this order' });
    }

    const deliverable = order.deliverables.id(req.params.deliverableId);
    
    if (!deliverable) {
      return res.status(404).json({ message: 'Deliverable not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size
    }));

    deliverable.files = files;
    deliverable.status = 'completed';
    deliverable.submittedAt = new Date();

    await order.save();

    res.json({
      success: true,
      message: 'Deliverable submitted successfully',
      order
    });
  } catch (error) {
    console.error('Submit deliverable error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders/:id/messages
// @desc    Add message to order
// @access  Private
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { message } = req.body;

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const isClient = order.client.toString() === req.user.id;
    const isFreelancer = order.freelancer.toString() === req.user.id;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ message: 'Not authorized to add messages to this order' });
    }

    const newMessage = {
      sender: req.user.id,
      message,
      timestamp: new Date()
    };

    order.messages.push(newMessage);
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('messages.sender', 'firstName lastName avatar');

    res.json({
      success: true,
      message: 'Message added successfully',
      order: populatedOrder
    });
  } catch (error) {
    console.error('Add message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders/:id/reviews
// @desc    Add review to order
// @access  Private
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed orders' });
    }

    // Check authorization and determine review type
    const isClient = order.client.toString() === req.user.id;
    const isFreelancer = order.freelancer.toString() === req.user.id;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ message: 'Not authorized to review this order' });
    }

    const review = {
      rating,
      comment,
      createdAt: new Date()
    };

    if (isClient) {
      if (order.reviews.clientReview) {
        return res.status(400).json({ message: 'Client review already exists' });
      }
      order.reviews.clientReview = review;
    } else {
      if (order.reviews.freelancerReview) {
        return res.status(400).json({ message: 'Freelancer review already exists' });
      }
      order.reviews.freelancerReview = review;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Review added successfully',
      order
    });
  } catch (error) {
    console.error('Add review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
