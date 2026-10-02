let mongoose = require('mongoose')
let userSchema = new mongoose.Schema({
  name:String,
  email:String,
  password:String,
  role:{
    type:String,
    enum:["user","admin"],
    default:"user",
  },
  resetToken:String,
  resetTokenExpiry:Date,
})

let productSchema = new mongoose.Schema({
  productName:String,
  amount:Number,
  userId:String,
})

let User = mongoose.model("user",userSchema)
let Product = mongoose.model("product",productSchema)
module.exports = {
  User,Product
}