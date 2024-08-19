import express from "express";
import dotenv from "dotenv";
import {genSaltSync, hashSync} from "bcrypt"
import { StreamChat } from "stream-chat" 

dotenv.config();

const { PORT, STREAM_API_KEY, STREAM_API_SECRET } = process.env;
const client =StreamChat.getInstance(STREAM_API_KEY!, STREAM_API_SECRET);

const app = express();
const salt = genSaltSync(10);

app.use(express.json());

interface User {
    id: string;
    email: string;
    hashed_password: string;
}

const USERS: User[] = [];

app.post("/signup", async(req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "email and password are required",
        });
    }
    if (password.length < 6) {
        return res.status(400).json({
            message: 'Password must be at least 6 characters.',
        });
    }
    const existingUser = USERS.find((user) => user.email);
    if (existingUser) {
        return res.status(400).json({
        message: 'User already exists.',
    });
    }
    try {
        const hashed_password= hashSync(password, salt);
        const id = Math.random().toString(36).slice(2);
        const newUser={
            id,
            email,
            hashed_password
        }
        USERS.push(newUser);
        await client.upsertUser({
            id,
            email,
            name: email
        });

        const token = client.createToken(id);

        return res.status(200).json({
            token,
            user:{
                id,
                email,
            },
        })
        
    } catch (error) {
        res.status(500).json({error:"user already exists"});
    }

});

app.post("/login", async(req, res) => {

    const {email, password}= req.body;
    const user =USERS.find((user)=> user.email === email);
    const hashed_password =hashSync(password, salt);

    if(!user || user.hashed_password !== hashed_password){
        return res.status(400).json({
            message:"invalid credentials",
        })
    }
    const token = client.createToken(user.id);

    return res.status(200).json({
        token,
        user:{
            id:user.id,
            email: user.email,
        },
    })
})

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
})