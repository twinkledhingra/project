const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  freelancer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'in-progress', 'completed', 'cancelled', 'disputed'],
    default: 'pending'
  },
  price: {
    type: Number,
    required: true
  },
  timeline: {
    type: String,
    required: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  deadline: {
    type: Date,
    required: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  deliverables: [{
    title: String,
    description: String,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending'
    },
    submittedAt: Date,
    approvedAt: Date,
    files: [{
      filename: String,
      originalName: String,
      path: String,
      size: Number
    }]
  }],
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: { type: Date, default: Date.now },
    attachments: [{
      filename: String,
      originalName: String,
      path: String,
      size: Number
    }]
  }],
  reviews: {
    clientReview: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      createdAt: Date
    },
    freelancerReview: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
      createdAt: Date
    }
  },
  payment: {
    status: {
      type: String,
      enum: ['pending', 'partial', 'completed'],
      default: 'pending'
    },
    amount: Number,
    paidAt: Date,
    method: String
  }
}, {
  timestamps: true
});

// Index for better query performance
orderSchema.index({ client: 1, status: 1 });
orderSchema.index({ freelancer: 1, status: 1 });
orderSchema.index({ project: 1 });

module.exports = mongoose.model('Order', orderSchema);
