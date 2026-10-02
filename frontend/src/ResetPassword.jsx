import axios from 'axios';
import React, { useState } from 'react'
import { useParams } from 'react-router-dom';

const ResetPassword = () => {
  let [data,setData] = useState({
    newPassword:"",
  });

  let {resetToken} = useParams()

  function change(e){
    setData({
      ...data,
      [e.target.name]:e.target.value,
    })
  }

  async function resetPass()
  {

    let res = await axios.post(`http://localhost:3000/api/reset-password/${resetToken}`,data);
    console.log(res);
    

  }

  return (
    <div>
      <input type="text" name='newPassword' value={data.newPassword} placeholder='naya password type karein' onChange={change}/>
      <button onClick={resetPass} >Reset Password</button>
    </div>
  )
}

export default ResetPassword
