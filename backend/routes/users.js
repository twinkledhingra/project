const express = require('express');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      location,
      bio,
      skills,
      experience,
      portfolio
    } = req.body;

    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone) updateData.phone = phone;
    if (location) updateData.location = location;
    if (bio) updateData.bio = bio;
    if (skills) updateData.skills = skills;
    if (experience) updateData.experience = experience;
    if (portfolio) updateData.portfolio = portfolio;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/avatar
// @desc    Upload user avatar
// @access  Private
router.post('/avatar', auth, upload.single('avatar'), handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: req.file.path },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatar: user.avatar
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/freelancers
// @desc    Get all freelancers
// @access  Public
router.get('/freelancers', async (req, res) => {
  try {
    const { page = 1, limit = 10, skills, location } = req.query;
    const query = { role: 'freelancer', isActive: true };

    if (skills) {
      query.skills = { $in: skills.split(',') };
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    const freelancers = await User.find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ rating: -1, totalProjects: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      freelancers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get freelancers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/freelancers/:id
// @desc    Get freelancer by ID
// @access  Public
router.get('/freelancers/:id', async (req, res) => {
  try {
    const freelancer = await User.findOne({
      _id: req.params.id,
      role: 'freelancer',
      isActive: true
    }).select('-password');

    if (!freelancer) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }

    res.json({
      success: true,
      freelancer
    });
  } catch (error) {
    console.error('Get freelancer error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/users/clients
// @desc    Get all clients
// @access  Private (Freelancers only)
router.get('/clients', auth, authorize('freelancer'), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const clients = await User.find({ role: 'client', isActive: true })
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ role: 'client', isActive: true });

    res.json({
      success: true,
      clients,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
