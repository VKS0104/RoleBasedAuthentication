# Twilio SMS Verification for Signup

This project currently creates a user immediately in `backend/index.js` inside `POST /signUp`. To require a phone number before account creation, change signup into a two-step flow:

1. User enters `name`, `email`, `password`, and `phone` in `frontend/src/SignUp.jsx`.
2. Backend sends an SMS verification code to that phone number.
3. User enters the code.
4. Backend verifies the code.
5. Backend creates the MongoDB user only after the phone code is approved.

Use Twilio Verify for this instead of sending a fixed message like `body: "sms_2fa"`. Your sample code proves Twilio SMS sending works, but verification needs a random code, expiry, retry rules, and checking. Twilio Verify provides those pieces through `verifications.create()` and `verificationChecks.create()`.

Official docs:

- Twilio Verify API: https://www.twilio.com/docs/verify/api
- Twilio Node + Express Verify quickstart: https://www.twilio.com/docs/verify/quickstarts/node-express
- Twilio Programmable Messaging quickstart: https://www.twilio.com/docs/messaging/quickstart

## 1. Install Twilio in the backend

Run this from the backend folder:

```bash
cd backend
npm install twilio
```

This adds the official Twilio Node SDK so your Express server can call Twilio from `backend/index.js`.

## 2. Add environment variables

Add these to `backend/.env`:

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid
```

Also add them to `backend/.env.example` without real values:

```env
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_VERIFY_SERVICE_SID=
```

Where to get them:

- `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN`: Twilio Console.
- `TWILIO_VERIFY_SERVICE_SID`: Twilio Console -> Verify -> Services -> create/select a service.

Do not hard-code `authToken`, phone numbers, or account SID in source code. Keep them in `.env` so they do not get committed.

## 3. Add phone fields to the User schema

In `backend/DataBase/rdbms.js`, update `userSchema`:

```js
let userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  isPhoneVerified: {
    type: Boolean,
    default: false,
  },
  password: String,
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
});
```

Then add a temporary pending-signup schema below `userSchema`:

```js
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
```

Update the models and exports at the bottom:

```js
let User = mongoose.model("user", userSchema)
let Product = mongoose.model("product", productSchema)
let PendingSignup = mongoose.model("pendingSignup", pendingSignupSchema)

module.exports = {
  User, Product, PendingSignup
}
```

Why this works:

- `phone` stores the number used during signup.
- `unique: true` prevents two accounts using the same phone number.
- `isPhoneVerified` lets you know this account passed OTP verification.
- `PendingSignup` stores the signup data only while the user is entering the SMS code.
- `expires: 600` tells MongoDB to remove pending signup records after about 10 minutes.

Important: phone numbers should be sent in E.164 format, for example `+917439893902`.

## 4. Create the Twilio client in `backend/index.js`

Update the database import in `backend/index.js`:

```js
const { User, Product, PendingSignup } = require('./DataBase/rdbms.js')
```

Near your other imports, add:

```js
let twilio = require("twilio");
let twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
```

This is the backend version of your sample:

```js
const client = twilio(accountSid, authToken);
```

The difference is that signup verification should call Twilio Verify instead of directly calling `client.messages.create()`.

## 5. Replace immediate signup with "start verification"

Replace your current `POST /signUp` route with this:

```js
app.post("/signUp", async (req, res) => {
  try {
    let { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).send("Name, email, password, and phone are required");
    }

    let existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).send("User already exists, please login");
    }

    let existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).send("Phone number already exists, please login");
    }

    let hashedPass = await bcrypt.hash(password, 10);

    await PendingSignup.deleteMany({
      $or: [{ email }, { phone }],
    });

    await PendingSignup.create({
      name,
      email,
      phone,
      password: hashedPass,
      role: role || "user",
    });

    await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    return res.status(200).json({
      msg: "Verification code sent",
      email,
      phone,
    });
  } catch (error) {
    return res.status(500).send("Error sending verification code: " + error.message);
  }
});
```

Why this works:

- It checks that phone is present before continuing.
- It blocks duplicate emails and duplicate phone numbers.
- It hashes the password before temporarily storing it.
- It stores the pending signup on the backend instead of sending the password back to React.
- It asks Twilio Verify to send a real OTP to the user's phone.
- It does not save the user yet, so unverified phone numbers cannot create accounts.

## 6. Add a verification route that creates the account

Add this new route under `/signUp` in `backend/index.js`:

```js
app.post("/verify-signup-phone", async (req, res) => {
  try {
    let { email, phone, code } = req.body;

    if (!email || !phone || !code) {
      return res.status(400).send("Email, phone, and verification code are required");
    }

    let pendingSignup = await PendingSignup.findOne({ email, phone });
    if (!pendingSignup) {
      return res.status(404).send("Signup request expired. Please sign up again");
    }

    let existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).send("User already exists, please login");
    }

    let existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(409).send("Phone number already exists, please login");
    }

    let verificationCheck = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (verificationCheck.status !== "approved") {
      return res.status(400).send("Invalid verification code");
    }

    let UserInfo = new User({
      name: pendingSignup.name,
      email: pendingSignup.email,
      phone,
      password: pendingSignup.password,
      role: pendingSignup.role || "user",
      isPhoneVerified: true,
    });

    await UserInfo.save();
    await PendingSignup.deleteOne({ _id: pendingSignup._id });

    return res.status(201).send("Signup complete");
  } catch (error) {
    return res.status(500).send("Error verifying phone: " + error.message);
  }
});
```

Why this works:

- The backend looks up the temporary signup record by `email` and `phone`.
- Twilio checks whether the submitted OTP matches the phone number.
- Only `approved` creates the account.
- The saved password is already hashed from the first signup step.
- `isPhoneVerified: true` records that this user passed SMS verification.
- The pending signup record is deleted after successful account creation.

## 7. Update `frontend/src/SignUp.jsx`

Change the signup state so it includes `phone`, `code`, `step`, and `verificationTarget`.

```jsx
import React from 'react'
import { useState } from 'react';
import axios from 'axios'

const SignUp = () => {
  let [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  })

  let [code, setCode] = useState("");
  let [step, setStep] = useState("signup");
  let [verificationTarget, setVerificationTarget] = useState(null);

  function fun1(e) {
    let { name, value } = e.target;

    setData({
      ...data,
      [name]: value,
    })
  }

  async function sendVerification() {
    let apiRes = await axios.post('http://localhost:3000/signUp', data);
    setVerificationTarget({
      email: apiRes.data.email,
      phone: apiRes.data.phone,
    });
    setStep("verify");
  }

  async function verifyAndCreateAccount() {
    let apiRes = await axios.post('http://localhost:3000/verify-signup-phone', {
      ...verificationTarget,
      code,
    });

    console.log(apiRes.data);
    setData({
      name: "",
      email: "",
      password: "",
      phone: "",
    });
    setCode("");
    setVerificationTarget(null);
    setStep("signup");
  }

  return (
    <div>
      {step === "signup" && (
        <>
          <input type="text" name='name' value={data.name} placeholder='enter your name' onChange={fun1} />
          <br />
          <br />
          <input type="text" name='email' value={data.email} placeholder='enter your email' onChange={fun1} />
          <br />
          <br />
          <input type="password" name='password' value={data.password} placeholder='enter your password' onChange={fun1} />
          <br />
          <br />
          <input type="text" name='phone' value={data.phone} placeholder='enter phone like +917439893902' onChange={fun1} />
          <br />
          <br />
          <button onClick={sendVerification}>Send verification code</button>
        </>
      )}

      {step === "verify" && (
        <>
          <input type="text" value={code} placeholder='enter sms code' onChange={(e) => setCode(e.target.value)} />
          <br />
          <br />
          <button onClick={verifyAndCreateAccount}>Verify and create account</button>
        </>
      )}
    </div>
  )
}

export default SignUp
```

Why this works:

- First button calls `/signUp`, which only sends the SMS code.
- The UI then switches to code entry.
- Second button calls `/verify-signup-phone`, which verifies the OTP and creates the user.

## 8. Return phone from `/me` and user lists if needed

In `GET /me`, you currently return:

```js
res.json({
  name: user.name,
  email: user.email,
  role: user.role
});
```

Change it to:

```js
res.json({
  name: user.name,
  email: user.email,
  phone: user.phone,
  isPhoneVerified: user.isPhoneVerified,
  role: user.role
});
```

Why this works:

- Your dashboard can show which phone number belongs to the logged-in user.
- You can later block sensitive actions if `isPhoneVerified` is false.

## 9. Test the flow

Start MongoDB if it is not running, then run the backend and frontend:

```bash
cd backend
node index.js
```

```bash
cd frontend
npm run dev
```

Then test:

1. Open `http://localhost:5173/signUp`.
2. Enter name, email, password, and phone number in E.164 format.
3. Click `Send verification code`.
4. Check the SMS on your phone.
5. Enter the code.
6. Click `Verify and create account`.
7. Check MongoDB. The new user should have `phone` and `isPhoneVerified: true`.

## 10. If you want to use your exact `messages.create()` style

Your code:

```js
const message = await client.messages.create({
  body: "sms_2fa",
  from: "+17372508034",
  to: "+917439893902",
});
```

This sends an SMS, but it does not verify anything by itself. To make it a real verification system, you would need to:

1. Generate a random OTP.
2. Hash and store the OTP temporarily in MongoDB.
3. Store an expiry time.
4. Send the OTP in `body`.
5. Add a route that checks the submitted OTP.
6. Delete or invalidate the OTP after success.
7. Add resend limits and attempt limits.

That is why Twilio Verify is better for signup verification: it handles the OTP lifecycle and your app only has to ask Twilio to send the code and then ask Twilio whether the submitted code is approved.

## Final backend flow

After implementation, account creation becomes:

```text
React SignUp form
  -> POST /signUp
  -> Twilio sends SMS OTP
  -> user enters OTP
  -> POST /verify-signup-phone
  -> Twilio approves code
  -> backend hashes password
  -> backend saves User with phone + isPhoneVerified
```

This works because the database save is moved behind the successful OTP check. A phone number becomes required because both the frontend form and backend validation require `phone`, and MongoDB stores it on the user document.
