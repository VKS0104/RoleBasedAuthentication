import React, { useState, useEffect} from 'react'
import axios from 'axios';

const AdminDashBoard = () => {

  let [users,setUsers] = useState([]);

  async function getUsers(){
    let token = localStorage.getItem('token')
    let res = await axios.get('http://localhost:3000/users', {
      headers:
      {
        Authorization: token
      }
    })
    console.log(res.data);
    
    setUsers(res.data)
  }
  
  useEffect(() => {
    getUsers()
  }, [])



  async function changeRole(id, role) {

  let token = localStorage.getItem('token')

  let res = await axios.patch(
    `http://localhost:3000/users/${id}/role`,
    {
      role: role
    },
    {
      headers: {
        Authorization: token
      }
    }
  )

  console.log(res.data);
  console.log(Array.isArray(res.data));
  getUsers()
}
  return (
    <div>
      Welcom to Admin DashBoard

      {
        users.map((a)=>{
          return (
            <>
            <div>
              <p>ID: {a._id}</p>
              <p>Name: {a.name}</p>
              <p>Email: {a.email}</p>
              <p>Role: {a.role}</p>

              <select value={a.role} onChange={(e) =>changeRole(a._id, e.target.value)}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
              <hr />
            </div>
            </>
          )
        })
      }

      


    </div>
  )
}

export default AdminDashBoard
