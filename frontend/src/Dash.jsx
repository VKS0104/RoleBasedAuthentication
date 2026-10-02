import axios from 'axios';
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';

const Dash = () => {

  let [productDetails,setProductDetails] = useState({
    productName:"",
    amount:0,
  })

  let [myOrders,setMyOrders] = useState([])

  let [orderPlaced,setOrderPlaced] = useState(false)
  let navigate = useNavigate()
  async function fun(){
    let token = localStorage.getItem('token');
    console.log(token);

    let res = await axios.get('http://localhost:3000/admin',{
      headers:{
        'Authorization':token,
      }
    })
    console.log(res);

    navigate('/admin')
    
  }



  async function placeOrder(){
    let token = localStorage.getItem('token');
    let res = await axios.post('http://localhost:3000/orders',productDetails,{
      headers:{
        'Authorization':token,
      }
    })

    console.log(res);

    if(res)
    {
      setOrderPlaced(true);
    }

  }

  function Order(e){
    let {name,value} = e.target;
    setProductDetails({
      ...productDetails,
      [name]:value,
    })

    console.log(productDetails);
    
  }

  async function showOrders(){
    let token = localStorage.getItem('token')
    let res = await axios.get('http://localhost:3000/my-orders',{
      headers:{
        "Authorization":token,
      }
    })

    console.log(res.data);
    setMyOrders(res.data)
    
  }
  return (
    <div>
      <button onClick={fun}>get admin info</button>
      <hr />
      <div>
        <div>Order Anything</div>
        <input type="text" placeholder='enter the Product Name' name='productName' value={productDetails.productName} onChange={Order}/>
        <br />
        <br />
        <input type="text" placeholder='enter the Product Amount' name='amount' value={productDetails.amount} onChange={Order}/>
        <br />
        <br />
        <button onClick={placeOrder}>Place Order</button>
        {orderPlaced && <p>Order Placed Successfully</p>}
      </div>
      <hr />

      <button onClick={showOrders}>Show All my Orders</button>
      {
        myOrders && 
        myOrders.map((a,id)=>{
          return (
            <div key={id}>
              <hr />
              <div>Order No. : {id}</div>
              <div>Product Name: {a.productName}</div>
              <div>Amount: {a.amount}</div>
              
            </div>
          )
        })
      }
    </div>
  )
}

export default Dash
