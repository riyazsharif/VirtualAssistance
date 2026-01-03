import React, { useContext, useState } from 'react'
import { UserDataContext } from '../context/UserContext'
import axios from 'axios'
import { MdKeyboardBackspace } from "react-icons/md";
import { useNavigate } from 'react-router-dom';

function Customize2() {
    const {userData,backendImage,selectedImage,serverUrl,setUserData}=useContext(UserDataContext)
  const [assistantName, setAssistantName] = useState(userData?.assistantName || "")
  const [loading, setLoading] = useState(false)
  const navigate=useNavigate()
  const handleUpdateAssistant = async () => {
    setLoading(true)
    try {
      let formData = new FormData()
      formData.append("assistantName", assistantName)
      if (backendImage) {
        formData.append("assistantImage", backendImage)
      } else {
        formData.append("imageUrl",selectedImage)
      }
      const result = await axios.post(`${serverUrl}/api/user/update`, formData, { 
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setLoading(false)
      console.log(result.data)
      setUserData(result.data)
      navigate("/")
    } catch (error) {
      setLoading(false)
      console.error("Error updating assistant:", error)
      if (error.response) {
        alert(error.response.data?.message || "Failed to update assistant. Please try again.")
      } else if (error.request) {
        alert("Unable to connect to server. Please check if the server is running.")
      } else {
        alert("An error occurred. Please try again.")
      }
    }
  }
  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-[black] to-[#030353] flex justify-center items-center  flex-col p-[20] relative '>
      <MdKeyboardBackspace  className='absolute top-[30px] left-[30px] text-white cursor-pointer w-[25px] h-[25px]' onClick={()=>navigate("/customize")}/>
          <h1 className='text-white mb-[30px] text-[30px] text-center'>Enter Your <span className='text-blue-200'> Assistant Name</span>
          </h1>
          
        <input
          type="text"
          placeholder="eg. shifra"
              className="w-full max-w-[600px] h-[60px] outline-none border-2 border-white bg-transparent text-white placeholder-gray-300 px-[20px] py-[10px] rounded-full text-[18px]" onChange={(e) => setAssistantName(e.target.value)} value={assistantName} />
      {assistantName && <button className='min-w-[150px]  h-[60px] mt-[30px] bg-white rounded-full text-black font-semibold cursor-pointer text-[19px] rounded-full ' disabled={loading} onClick={() => {
        handleUpdateAssistant()
      }
      } >{ loading?"Finally create Your Assistance":"Loading..."}</button>}
         
    </div>
  )
}

export default Customize2
