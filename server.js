require('dotenv').config();
const PORT = process.env.PORT || 5000;
const connectDB = require('./server/config/database');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const app = express();
const authRoutes = require('./server/routes/authRoutes');

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use(helmet());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to Andika Academy API!');
})

const startServer = async () => {
    try{
        await connectDB();
        app.listen(PORT, () => {console.log(`Server running on port ${PORT}...`)});
    }catch(error){
        console.log(`Failed to start server, ${error.message}`);
        process.exit(1);
    }
};

startServer();