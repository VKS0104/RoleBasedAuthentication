let mongoose = require('mongoose')
let userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  resetToken: String,
  resetTokenExpiry: Date,
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  authProvider: {
    type: String,
    enum: ["local", "google", "local+google"],
    default: "local",
  },
})

let pendingSignupSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  password: String,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

let productSchema = new mongoose.Schema({
  productName: String,
  amount: Number,
  userId: String,
})

let User = mongoose.model("user", userSchema)
let Product = mongoose.model("product", productSchema)
let PendingSignup = mongoose.model("pendingSignup", pendingSignupSchema)

module.exports = {
  User, Product, PendingSignup
}