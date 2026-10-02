import axios from 'axios';
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  let [data,setData] = useState({
    email:"",
    password:"",
  })

const navigate = useNavigate()

  function fun(e)
  {
    let {name,value} = e.target;
    setData({
      ...data,
      [name]:value,
    })

    console.log(data);
    
  }

  async function done(){

    let apiRes = await axios.post('http://localhost:3000/login',data);
    console.log(apiRes);

    let token = apiRes.data.token;
    // console.log(token);

    
    localStorage.setItem('token',token)

    if(token)
    {
      navigate('/dash')
    }


    setTimeout(()=>{

      localStorage.removeItem('token');
      alert("60 sec done your are logged out")

    },6000)



    

    setData({
    email: "",
    password: ""
  })

  }
  return (
    <div>
      <input type="text" name="email" value={data.email} placeholder='enter your email' onChange={fun}/>
      <br />
      <br />
      <input type="text" name="password" value={data.password} placeholder='enter you password' onChange={fun}/>

      <br />
      <br />
      <button onClick={done}>Login</button>
      <br />
      <Link to="/forgot-password">Forgot password</Link>
    </div>
  )
}

export default Login
