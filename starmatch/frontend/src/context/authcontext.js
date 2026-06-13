import React,{createContext, useEffect, useState, useContext} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

//Context Banao
const AuthContext = createContext(null);

//Provider Component-App.js mein saari app ko wrap karega
export const AuthProvider= ({children})=>{
    const [user, setUser]= useState(null);
    const [token, setToken]=useState(null);
    const [isLoading, setIsLoading]= useState(true);
    const [isRegistering, setIsRegistering] = useState(false);

    //isLoading true jab app pehli baar hulti hai or 
    //check karti hai ki user loggedin hai ya nahi

    //App Khulte Waqt
    //Kya Phone mai pehle se token saved hai?
    //Agar hai to user dubara login nahi karega
    useEffect(()=>{
        checkStoredLogin();
    }, []);
const checkStoredLogin= async()=>{
  try{
    //Async Storage se Token or User dono padho
    const savedToken= await AsyncStorage.getItem('token');
    const savedUser= await AsyncStorage.getItem('user');
    const savedIsRegistering = await AsyncStorage.getItem('is_registering');
     if(savedToken && savedUser){
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        setIsRegistering(savedIsRegistering === 'true');
     }
  }  catch(err){
    console.log('Stored Login error:',err);
  }finally{
    setIsLoading(false);//Loading Khatam
  }
};

//LOGIN FUNCTION
//Successful Login ke baad call karo
//Token or User Data Pass karo
const login= async(newToken, userData, isFromRegister = false)=>{
    try{
       //Phone ki storage mai save karo
       //App band karne ke baad bi rahe
       await AsyncStorage.setItem('token',newToken);
       await AsyncStorage.setItem('user',JSON.stringify(userData));

       if (isFromRegister) {
           await AsyncStorage.setItem('is_registering', 'true');
           setIsRegistering(true);
       } else {
           await AsyncStorage.removeItem('is_registering');
           setIsRegistering(false);
       }

       //State Update karo
       setToken(newToken);
       setUser(userData);
    }catch(err){
        console.log('Login Save Error:',err);
    }
};

//Logout Function
const logout= async()=>{
    try{
        //Storage Saaf Karo
        await AsyncStorage.multiRemove(['token','user','is_registering']);

        //State Reset Karo
        setToken(null);
        setUser(null);
        setIsRegistering(false);
    }catch(err){
        console.log('Logout Error:',err);
    }
};

//Update User
//Profile update hone ke baad local state bi update karo
const updateUser= async(updatedData)=>{
    const newUser= {...user,...updatedData};
    await AsyncStorage.setItem('user',JSON.stringify(newUser));
    setUser(newUser);
};

 return(
    <AuthContext.Provider value={{
        user,
        token,
        isLoading,
        login,
        logout,
        updateUser,
        isLoggedIn: !!token,
        isRegistering,
    }}>{children}</AuthContext.Provider>
 );
};


//Custom Hook-Screens main easily use karne ke liye
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth ko AuthProvider ke andar use karo!');
  }
  return context;
};