// require('dotenv').config({path:'/.env'});
import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

const PORT = process.env.PORT || 8000;

dotenv.config({ 
    path: "./.env" 
});

connectDB()
.then(() => {
    app.on('error', (err) => {
        console.error('Express error:', err);
        throw err;
    });
    
    app.listen(PORT, () => {
        console.log(`Server is running on port: ${PORT}`);
    });
})
.catch((err) => {    
    console.log("mongoDB connection failed: ", err);
});















// ;()()  // effi - efficient way to call a function without a name