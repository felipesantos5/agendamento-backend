import mongoose from 'mongoose';

const LeadSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true 
  },
  phone: { 
    type: String, 
    trim: true 
  },
  // --- Business Qualification Data ---
  barberCount: {
    type: String, 
    trim: true
  },
  schedulingMethod: {
    type: String, // e.g. "Paper", "WhatsApp"
    trim: true
  },
  financialControlMethod: {
    type: String, // e.g. "Sheets", "Notebook", "None"
    trim: true
  },
  // -----------------------------------
  message: { 
    type: String, 
    required: true 
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'archived'],
    default: 'new'
  }
}, { 
  timestamps: true 
});

export default mongoose.model('Lead', LeadSchema);