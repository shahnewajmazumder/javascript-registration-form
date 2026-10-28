
const express = require("express");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const PORT = 3000;
const MONGO_URL = "mongodb://127.0.0.1:27017";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function startServer() {
    const client = new MongoClient(MONGO_URL);

    try {
        await client.connect();
        console.log("Connected to MongoDB successfully!");

        const db = client.db("registrationDB");
        const users = db.collection("users");

        await users.createIndex({ email: 1 }, { unique: true });

        app.post("/api/register", async (req, res) => {
            try {
                const { name, email, phone, password } = req.body;

                if (
                    typeof name !== "string" ||
                    typeof email !== "string" ||
                    typeof phone !== "string" ||
                    typeof password !== "string"
                ) {
                    return res.status(400).json({
                        message: "Please fill in all fields."
                    });
                }

                const cleanName = name.trim();
                const cleanEmail = email.trim().toLowerCase();
                const cleanPhone = phone.trim();

                if (cleanName.length < 2 || cleanName.length > 100) {
                    return res.status(400).json({
                        message: "Name must be between 2 and 100 characters."
                    });
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
                    return res.status(400).json({
                        message: "Enter a valid email address."
                    });
                }

                if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
                    return res.status(400).json({
                        message: "Enter a valid 10-digit Indian mobile number."
                    });
                }

                if (password.length < 8 || password.length > 72) {
                    return res.status(400).json({
                        message: "Password must be 8–72 characters long."
                    });
                }

                const existing = await users.findOne({
                    email: cleanEmail
                });

                if (existing) {
                    return res.status(409).json({
                        message: "This email is already registered."
                    });
                }

                const hashedPassword = await bcrypt.hash(password, 12);

                await users.insertOne({
                    name: cleanName,
                    email: cleanEmail,
                    phone: cleanPhone,
                    password: hashedPassword,
                    createdAt: new Date()
                });

                res.status(201).json({
                    message: "Registration successful!"
                });
            } catch (error) {
                if (error.code === 11000) {
                    return res.status(409).json({
                        message: "This email is already registered."
                    });
                }

                console.error(error);
                res.status(500).json({
                    message: "Server error. Please try again."
                });
            }
        });

        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Could not connect to MongoDB:", error.message);
        await client.close().catch(() => { });
        process.exit(1);
    }
}

startServer();
