import React from 'react'
import { assets } from '../../assets/assets'
import "./Sidebar.css"
import { NavLink } from 'react-router-dom'

const Sidebar = () => {
  console.log("📦 Sidebar rendered");

  return (
    <div className="sidebar">
      <div className="sidebar-options">
        <NavLink to="/dashboard" className='sidebar-option'>
          <img src={assets.layout_icon} alt='' />
          <p>Dashboard</p>
        </NavLink>
        <NavLink to="/add" className="sidebar-option">
          <img src={assets.add_icon} alt=''></img>
          <p>Add Receipts</p>
        </NavLink>
        <NavLink to="/list" className='sidebar-option'>
          <img src={assets.lists_icon} alt='' />
          <p>List of Receipts</p>
        </NavLink>
        <NavLink to="/edit" className='sidebar-option'>
          <img src={assets.edit_icon} alt='' />
          <p>Edit</p>
        </NavLink>
        <NavLink to="/messages" className='sidebar-option'>
          <img src={assets.messages_icon} alt='' />
          <p>Messages</p>
        </NavLink>
        
      </div>

    </div>
  )
}

export default Sidebar
