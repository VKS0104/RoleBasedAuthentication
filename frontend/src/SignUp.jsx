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
  let [message, setMessage] = useState("");

  function fun1(e) {
    let { name, value } = e.target;

    setData({
      ...data,
      [name]: value,
    })
  }

  async function sendVerification() {
    try {
      setMessage("");
      let apiRes = await axios.post('http://localhost:3000/signUp', data);
      setVerificationTarget({
        email: apiRes.data.email,
        phone: apiRes.data.phone,
      });
      setMessage(apiRes.data.msg);
      setStep("verify");
    } catch (error) {
      setMessage(error.response?.data || "Something went wrong while sending verification code");
    }
  }

  async function verifyAndCreateAccount() {
    try {
      setMessage("");
      let apiRes = await axios.post('http://localhost:3000/verify-signup-phone', {
        ...verificationTarget,
        code,
      });

      setMessage(apiRes.data);
      setData({
        name: "",
        email: "",
        password: "",
        phone: "",
      });
      setCode("");
      setVerificationTarget(null);
      setStep("signup");
    } catch (error) {
      setMessage(error.response?.data || "Something went wrong while verifying code");
    }
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
          <input type="text" name='phone' value={data.phone} placeholder='enter phone like 8617703377 or +918617703377' onChange={fun1} />
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

      {message && <p>{message}</p>}
    </div>
  )
}

export default SignUp
