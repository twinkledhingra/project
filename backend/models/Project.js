const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Project description is required']
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  category: {
    type: String,
    required: [true, 'Project category is required'],
    enum: ['web-development', 'mobile-development', 'ui-ux-design', 'graphic-design', 'content-writing', 'marketing', 'other']
  },
  skills: [{
    type: String
  }],
  budget: {
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    }
  },
  timeline: {
    type: String,
    required: true,
    enum: ['1-week', '2-weeks', '1-month', '2-months', '3-months', '6-months', 'flexible']
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'completed', 'cancelled'],
    default: 'open'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
  }],
  proposals: [{
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    proposedBudget: Number,
    proposedTimeline: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending'
    },
    submittedAt: { type: Date, default: Date.now }
  }],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  milestones: [{
    title: String,
    description: String,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date
  }],
  finalPrice: {
    type: Number,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
projectSchema.index({ client: 1, status: 1 });
projectSchema.index({ freelancer: 1, status: 1 });
projectSchema.index({ category: 1, status: 1 });

module.exports = mongoose.model('Project', projectSchema);
