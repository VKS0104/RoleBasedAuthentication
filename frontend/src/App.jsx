import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './Home'
import Login from './Login'
import SignUp from './SignUp'
import Navbar from './Navbar'
import Dash from './Dash'
import AdminDashBoard from './AdminDashBoard'
import ResetPassword from './ResetPassword'
import ForgotPassword from './ForgotPassword'

const App = () => {
  return (
    <div>
      <Navbar/>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/login' element={<Login/>}/>
        <Route path='/signUp' element={<SignUp/>}/>
        <Route path='/dash' element={<Dash/>}/>
        <Route path='/admin' element={<AdminDashBoard/>}></Route>
        <Route path='/forgot-password' element={<ForgotPassword/>}></Route>
        <Route path='/reset-password/:resetToken' element={<ResetPassword/>}></Route>
      </Routes>
    </div>
  )
}

export default App
