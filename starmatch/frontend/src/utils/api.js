import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Server in repository uses PORT defined in server/.env (5000)
// On Android emulators, use 10.0.2.2 to reach host machine.


// If you run on a physical device, replace with your machine IP, e.g.:
// const BASE_URL = 'http://192.168.1.42:3001'
const BASE_URL='https://gallant-vibrancy-production-7eef.up.railway.app'
//AXIOS INSTANCE BANAO
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // 10 seconds mai response nahi aaya to error
});

//Request Interceptor
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (err) {
            console.log('Token Read Error:', err);
        }
        return config;
    },
    (error) => Promise.reject(error)
);

//Response Interceptor
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            //Token Expire Hogaya
            await AsyncStorage.multiRemove(['token', 'user', 'is_registering']);
        }
        return Promise.reject(error);
    }
);
export default api;