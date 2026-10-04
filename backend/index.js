const dotenv = require("dotenv")

dotenv.config();

let express = require('express')
let app = express()
let mongoose = require('mongoose')
let bcrypt = require('bcryptjs')
let cors = require('cors')
let jwt = require('jsonwebtoken')
let crypto = require('crypto')
let { sendEmail } = require('./config/sendEmail.js')

const { User, Product } = require('./DataBase/rdbms.js')

app.use(express.json())

app.use(cors())
mongoose.connect('mongodb://127.0.0.1:27017/rdbms').then(() => {
  console.log('db connected succesfully.....');

})

app.post('/signUp', async (req, res) => {
  let { name, email, password, role } = req.body;

  let findData = await User.findOne({ email })
  if (findData) {
    return res.send("User Already Exist, Please Login")
  }
  else {
    let hashedPass = await bcrypt.hash(password, 10);
    let UserInfo = new User({
      name,
      email,
      password: hashedPass,
      role: role || 'user',
    })

    await UserInfo.save();
    res.send("dooooneeee.....")
  }
})


app.post('/login', async (req, res) => {
  let { email, password } = req.body;
  let findData = await User.findOne({ email })

  if (!findData) {
    return res.send("Kripa SignUp Kare")
  }
  else {
    let isUser = await bcrypt.compare(password, findData.password);
    if (!isUser) {
      return res.send("galat hai galat hai pass galat hai")
    }
    else {
      let token = jwt.sign({ userId: findData._id, name: findData.name, email: findData.email, role: findData.role }, process.env.JWT_SECRET);
      return res.json({
        msg: "hi",
        token: token,
      })
    }
  }
})

let auth = (req, res, next) => {
  let token = req.headers.authorization;

  if (!token) {
    return res.send("aapke paass token nahi hai")
  }
  else {
    try {
      const decode = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decode;
      next();
    } catch (error) {
      return res.status(401).send("Invalid or expired token");
    }
  }
}

let roleCheck = (role) => {

  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.send("who are you")
    }
    else {
      return next();
    }
  }

}

app.get('/admin', auth, roleCheck('admin'), (req, res) => {

  res.send("Only admin can access it")
})

app.get('/me', auth, async (req, res) => {
  let user = await User.findById(req.user.userId);

  if (!user) {
    return res.status(404).send("User not found");
  }

  res.json({
    name: user.name,
    email: user.email,
    role: user.role
  });

})

app.put('/me', auth, async (req, res) => {

  let { name } = req.body

  let user = await User.findByIdAndUpdate(
    req.user.userId,
    { name: name },
    { new: true }
  )
  if (!user) {
    return res.status(404).send("User not found");
  }

  res.json({
    name: user.name,
    email: user.email,
    role: user.role
  });

})

app.get('/users', auth, roleCheck('admin'), async (req, res) => {
  let users = await User.find().select('-password')
  res.json(users);
})


app.patch('/users/:id/role', auth, roleCheck("admin"), async (req, res) => {
  let { role } = req.body;
  if (role !== "user" && role !== "admin") {
    return res.status(400).send("Invalid role");
  }

  let user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true }
  );

  if (!user) {
    return res.status(404).send("User not found");
  }

  res.json({
    name: user.name,
    email: user.email,
    role: user.role
  });
})

app.post('/orders', auth, async (req, res) => {
  let userId = req.user.userId;

  let { productName, amount } = req.body;
  let Prod_Details = new Product({
    userId,
    productName,
    amount,
  })

  console.log(Prod_Details);

  await Prod_Details.save();
  res.send("done dana dan done")


})

app.get('/my-orders', auth, async (req, res) => {
  let userId = req.user.userId;
  let findOrder = await Product.find({ userId })

  if (findOrder) {
    res.json(findOrder)
  }
  else {
    res.send("aapne koi order nahi kiya hai")
  }
})

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found');
    }


    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExpiry = Date.now() + 3600000;
    await user.save();


    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    // `${req.protocol}://${req.get('host')}/api/reset-password/${resetToken}`
    await sendEmail(
      user.email,
      'Password Reset Request',
      `Click the link below to reset your password:\n\n${resetUrl}`
    );

    res.status(200).send('Password reset email sent');
  } catch (error) {
    res.status(500).send('Error sending password reset email: ' + error.message);
  }
});


app.post('/api/reset-password/:resetToken', async (req, res) => {
  let { resetToken } = req.params;
  let { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).send("New password is required");
  }

  let findUser = await User.findOne({ resetToken })

  if (!findUser) {
    return res.status(404).send("Invalid ResetTOken")
  }

  if (findUser.resetTokenExpiry < Date.now()) {
    return res.status(400).send("Reset token has expired");
  }

  let hashedPass = await bcrypt.hash(newPassword, 10);

  findUser.password = hashedPass;
  findUser.resetToken = undefined;
  findUser.resetTokenExpiry = undefined;

  await findUser.save();

  res.send("Password reset successfully");
})


//try catch

app.get('/error', (req, res) => {

  try {
    let user = null;
    console.log(user.name);
    console.log("chala kya?");
    res.send("Hello")


  }
  catch (err) {
    console.log(err);
    res.send("error aayagay hai", err)

  }
})

// Google signUp part



app.listen(3000, () => {
  console.log("server runninggggg......");
})
