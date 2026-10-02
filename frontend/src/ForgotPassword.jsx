import axios from 'axios'
import React, { useState } from 'react'

const ForgotPassword = () => {
  let [email,setEmail] = useState("")

  async function fun(){
    const res = await axios.post('http://localhost:3000/forgot-password',{email})

    console.log(res);
    
  }
  return (
    <div>
      <input
        type="email"
        value={email}
        placeholder='enter your email'
        onChange={(e)=>setEmail(e.target.value)}
      />
      <button onClick={fun}>forgot pass send reset link</button>
    </div>
  )
}

export default ForgotPassword
