import React from 'react'
import { Link } from 'react-router-dom'

const Navbar = () =>
  {
  return (
    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'12px', backgroundColor:'lightblue', padding:'12px', borderRadius:'12px'}}>
      <Link to="/">Home</Link>
      <Link to="/login">Login</Link>
      <Link to="/signUp">SignUp</Link>
    </div>
  )
  }

export default Navbar
