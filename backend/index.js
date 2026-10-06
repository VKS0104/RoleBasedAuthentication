const dotenv = require("dotenv")

dotenv.config();

let express = require('express')
let app = express()
let mongoose = require('mongoose')
let bcrypt = require('bcryptjs')
let cors = require('cors')
let jwt = require('jsonwebtoken')
let crypto = require('crypto')
let twilio = require("twilio")
const {oAuth2Client} = require("google-auth-library")
let { sendEmail } = require('./config/sendEmail.js')

const { User, Product, PendingSignup } = require('./DataBase/rdbms.js')
let twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

app.use(express.json())

app.use(cors())
mongoose.connect('mongodb://127.0.0.1:27017/rdbms').then(() => {
  console.log('db connected succesfully.....');

})

function normalizePhone(phone) {
  let cleanedPhone = String(phone || "").replace(/\s+/g, "");

  if (/^\d{10}$/.test(cleanedPhone)) {
    return `+91${cleanedPhone}`;
  }

  if (/^\+\d{10,15}$/.test(cleanedPhone)) {
    return cleanedPhone;
  }

  return null;
}

// const googleClient = new OAuth2Client({
//   clientId: process.env.GOOGLE_CLIENT_ID,
//   clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//   redirectUri: process.env.GOOGLE_REDIRECT_URI,
// });
// const googleScopes = ["openid", "email", "profile"];


app.post("/signUp", async (req, res) => {
  try {
    let { name, email, password, phone, role } = req.body;
    let normalizedPhone = normalizePhone(phone);

    if (!name || !email || !password || !phone) {
      return res.status(400).send("Name, email, password, and phone are required");
    }

    if (!normalizedPhone) {
      return res.status(400).send("Phone must be 10 digits or E.164 format like +918617703377");
    }

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_VERIFY_SERVICE_SID) {
      return res.status(500).send("Twilio environment variables are missing");
    }

    let existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).send("User already exists, please login");
    }

    let existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      return res.status(409).send("Phone number already exists, please login");
    }

    let hashedPass = await bcrypt.hash(password, 10);

    await PendingSignup.deleteMany({
      $or: [{ email }, { phone: normalizedPhone }],
    });

    await PendingSignup.create({
      name,
      email,
      phone: normalizedPhone,
      password: hashedPass,
      role: role || "user",
    });

    await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: normalizedPhone,
        channel: "sms",
      });

    return res.status(200).json({
      msg: "Verification code sent",
      email,
      phone: normalizedPhone,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send("Error sending verification code: " + error.message);
  }
});

app.post("/verify-signup-phone", async (req, res) => {
  try {
    let { email, phone, code } = req.body;
    let normalizedPhone = normalizePhone(phone);

    if (!email || !phone || !code) {
      return res.status(400).send("Email, phone, and verification code are required");
    }

    if (!normalizedPhone) {
      return res.status(400).send("Phone must be 10 digits or E.164 format like +918617703377");
    }

    let pendingSignup = await PendingSignup.findOne({ email, phone: normalizedPhone });
    if (!pendingSignup) {
      return res.status(404).send("Signup request expired. Please sign up again");
    }

    let existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).send("User already exists, please login");
    }

    let existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      return res.status(409).send("Phone number already exists, please login");
    }

    let verificationCheck = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: normalizedPhone,
        code,
      });

    if (verificationCheck.status !== "approved") {
      return res.status(400).send("Invalid verification code");
    }

    let UserInfo = new User({
      name: pendingSignup.name,
      email: pendingSignup.email,
      phone: normalizedPhone,
      password: pendingSignup.password,
      role: pendingSignup.role || "user",
      isPhoneVerified: true,
    });

    await UserInfo.save();
    await PendingSignup.deleteOne({ _id: pendingSignup._id });

    return res.status(201).send("Signup complete");
  } catch (error) {
    console.log(error);
    return res.status(500).send("Error verifying phone: " + error.message);
  }
});




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
      const token = jwt.sign(
        {
          userId: findData._id,
          name: findData.name,
          email: findData.email,
          role: findData.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
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
