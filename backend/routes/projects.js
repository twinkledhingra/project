const express = require('express');
const Project = require('../models/Project');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// @route   GET /api/projects
// @desc    Get all projects (for freelancers to browse)
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      skills, 
      budgetMin, 
      budgetMax,
      timeline,
      status = 'open'
    } = req.query;

    const query = { status };
    
    if (category) {
      query.category = category;
    }
    
    if (skills) {
      query.skills = { $in: skills.split(',') };
    }
    
    if (budgetMin || budgetMax) {
      query['budget.min'] = {};
      if (budgetMin) query['budget.min'].$gte = parseInt(budgetMin);
      if (budgetMax) query['budget.max'].$lte = parseInt(budgetMax);
    }
    
    if (timeline) {
      query.timeline = timeline;
    }

    const projects = await Project.find(query)
      .populate('client', 'firstName lastName avatar rating')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      projects,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/projects/my-projects
// @desc    Get user's projects (client or freelancer)
// @access  Private
router.get('/my-projects', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const query = {};

    if (req.user.role === 'client') {
      query.client = req.user.id;
    } else {
      query.freelancer = req.user.id;
    }

    if (status) {
      query.status = status;
    }

    const projects = await Project.find(query)
      .populate('client', 'firstName lastName avatar')
      .populate('freelancer', 'firstName lastName avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      projects,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get my projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/projects/:id
// @desc    Get project by ID
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'firstName lastName avatar rating totalProjects')
      .populate('freelancer', 'firstName lastName avatar rating totalProjects')
      .populate('proposals.freelancer', 'firstName lastName avatar rating');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private (Clients only)
router.post('/', auth, authorize('client'), async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      skills,
      budget,
      timeline,
      priority = 'normal'
    } = req.body;

    // Validation
    if (!title || !description || !category || !budget || !timeline) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const project = new Project({
      title,
      description,
      client: req.user.id,
      category,
      skills: skills || [],
      budget,
      timeline,
      priority
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('client', 'firstName lastName avatar');

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/projects/:id/upload
// @desc    Upload project attachments
// @access  Private (Clients only)
router.post('/:id/upload', auth, authorize('client'), upload.array('attachments', 5), handleUploadError, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to upload files for this project' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const attachments = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size
    }));

    project.attachments.push(...attachments);
    await project.save();

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      attachments
    });
  } catch (error) {
    console.error('Upload attachments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/projects/:id/propose
// @desc    Submit a proposal for a project
// @access  Private (Freelancers only)
router.post('/:id/propose', auth, authorize('freelancer'), async (req, res) => {
  try {
    const { message, proposedBudget, proposedTimeline } = req.body;

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.status !== 'open') {
      return res.status(400).json({ message: 'Project is not open for proposals' });
    }

    // Check if freelancer already proposed
    const existingProposal = project.proposals.find(
      p => p.freelancer.toString() === req.user.id
    );

    if (existingProposal) {
      return res.status(400).json({ message: 'You have already submitted a proposal for this project' });
    }

    const proposal = {
      freelancer: req.user.id,
      message,
      proposedBudget,
      proposedTimeline,
      status: 'pending'
    };

    project.proposals.push(proposal);
    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('proposals.freelancer', 'firstName lastName avatar rating');

    res.json({
      success: true,
      message: 'Proposal submitted successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Submit proposal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id/proposals/:proposalId
// @desc    Accept or reject a proposal
// @access  Private (Clients only)
router.put('/:id/proposals/:proposalId', auth, authorize('client'), async (req, res) => {
  try {
    const { status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be accepted or rejected' });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    if (project.client.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this project' });
    }

    const proposal = project.proposals.id(req.params.proposalId);
    
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    proposal.status = status;

    if (status === 'accepted') {
      project.freelancer = proposal.freelancer;
      project.status = 'in-progress';
      project.finalPrice = proposal.proposedBudget;
    }

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('client', 'firstName lastName avatar')
      .populate('freelancer', 'firstName lastName avatar')
      .populate('proposals.freelancer', 'firstName lastName avatar rating');

    res.json({
      success: true,
      message: `Proposal ${status} successfully`,
      project: populatedProject
    });
  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/projects/:id/status
// @desc    Update project status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, progress } = req.body;

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check authorization
    const isClient = project.client.toString() === req.user.id;
    const isFreelancer = project.freelancer && project.freelancer.toString() === req.user.id;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ message: 'Not authorized to modify this project' });
    }

    if (status) {
      project.status = status;
      
      if (status === 'completed') {
        project.completedAt = new Date();
        project.progress = 100;
      }
    }

    if (progress !== undefined && isFreelancer) {
      project.progress = Math.max(0, Math.min(100, progress));
    }

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('client', 'firstName lastName avatar')
      .populate('freelancer', 'firstName lastName avatar');

    res.json({
      success: true,
      message: 'Project status updated successfully',
      project: populatedProject
    });
  } catch (error) {
    console.error('Update project status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
