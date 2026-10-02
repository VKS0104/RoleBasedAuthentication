import React from 'react'
import { useState, useEffect } from 'react';
import axios from 'axios'

const SignUp = () => {

  let [data, setData] = useState({
    name: "",
    email: "",
    password: ""
  })

  function fun1(e) {
    console.log(e.target);
    let { name, value } = e.target;

    setData({
      ...data,
      [name]: value,
    })

    console.log(data);


  }
  async function done() {
    let apiRes = await axios.post('http://localhost:3000/signUp', data);

    console.log(apiRes, "datataaaa...");


  }

  
  return (
    <div>
      <input type="text" name='name' value={data.name} placeholder='enter your name' onChange={fun1} />
      <br />
      <br />
      <input type="text" name='email' value={data.email} placeholder='enter your email' onChange={fun1} />
      <br />
      <br />
      <input type="password" name='password' value={data.password} placeholder='enter your password' onChange={fun1} />
      <br />
      <br />
      <button onClick={done}>button</button>
    </div>
  )
}

export default SignUp
