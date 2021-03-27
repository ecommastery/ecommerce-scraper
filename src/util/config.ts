import dotenv from 'dotenv';
dotenv.config();

export default {
    droptrends: {
        username: process.env.DR_USERNAME,
        password: process.env.DR_PASSWORD
    },
    firebase: {
        apiKey: process.env.FIREBASE_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    }
}