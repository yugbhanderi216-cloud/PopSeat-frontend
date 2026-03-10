import './App.css'
import {Routes,Route} from 'react-router-dom'
import Login from './pages/authentication/Login'
import Register from './pages/authentication/Register'
import CafeList from './pages/Cafe/CafeList'
import ForgotPassword from './pages/authentication/ForgotPassword'

// import Otp from './pages/authentication/otp'
function App() {
  return (
    <>
    <div>
      <Routes>
        <Route path="/" element={<Login />}/>
        <Route path="/Register" element={<Register />}/>
        <Route path="Cafe" element={<CafeList />}/>
        <Route path="/ForgotPassword" element={<ForgotPassword/>}/>
      </Routes>
      
    </div>
    </>
  )
}

export default App